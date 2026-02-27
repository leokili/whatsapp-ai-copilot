import { Client, LocalAuth, MessageMedia, MessageSendOptions } from 'whatsapp-web.js';
import { Server as SocketIOServer } from 'socket.io';
import { generateAIResponse } from './ai';
import { retrieveKnowledgeContext } from './knowledge';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
export let client: Client | null = null; // Exportamos la instancia

export function setupWhatsAppClient(io: SocketIOServer) {
    // --- CONFIGURACIÓN OPTIMIZADA PARA LOCALHOST (Windows) ---
    // Ya no usamos flags restrictivos de cloud (--single-process, --no-zygote, --max-old-space-size=128).
    // En localhost tenemos toda la RAM y CPU disponible.

    client = new Client({
        authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
        authTimeoutMs: 0, // Sin timeout de autenticación
        qrMaxRetries: 100, // Más reintentos para evitar crashes en dev local
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--disable-gpu',
                '--disable-extensions',
            ],
        }
    });

    client.on('qr', (qr) => {
        console.log('🤖 Escanea el código QR para conectar WhatsApp.');
        io.emit('qr', qr);
    });

    client.on('ready', () => {
        console.log('✅ Cliente de WhatsApp está listo!');
        io.emit('ready', { ready: true });
    });

    client.on('authenticated', () => {
        console.log('🔒 Cliente de WhatsApp autenticado correctamnete.');
        io.emit('authenticated', true);
    });

    // Escuchar el evento de desconexión

    client.on('disconnected', async (reason) => {
        console.log('❌ Cliente de WhatsApp se ha desvinculado o desconectado:', reason);
        io.emit('disconnected', reason);

        try {
            await client.destroy();
            console.log('Cliente destruido exitosamente. Limpiando sesión...');

            const authPath = path.join(process.cwd(), '.wwebjs_auth');
            if (fs.existsSync(authPath)) {
                fs.rmSync(authPath, { recursive: true, force: true });
                console.log('Carpeta de sesión eliminada. Reiniciando cliente en 5 segundos...');
            }

            // Notificamos al frontend que debe prepararse para un nuevo QR
            io.emit('qr', null);

            // Dejamos que PM2 o nodemon (o en este caso el propio usuario vía script de auto-reinicio interno) se encargue,
            // pero para este proyecto lo más sano es forzar salida si la estructura no tiene un auto-recolector.
            // Para evitar salir del proceso de Next, vamos a lanzar un error que atrape el server.ts (Idealmente
            // se recomendaría re-llamar a setupWhatsAppClient, pero eso duplica listeners si no se maneja bien).
            setTimeout(() => {
                console.log("Reiniciando el proceso de Node para inicializar WhatsApp limpio...");
                process.exit(1);
            }, 5000);

        } catch (err: any) {
            console.error('Error al limpiar sesión tras desconexión:', err);
            await prisma.systemLog.create({
                data: {
                    level: "error",
                    module: "whatsapp",
                    message: "Error al limpiar sesión tras desconexión",
                    details: err?.message || String(err)
                }
            });
        }
    });

    client.on('message', async (message) => {
        // Solo responder si el mensaje NO viene de nosotros mismos 
        // y si es un chat válido
        if (message.fromMe || message.isStatus) return;

        try {
            const contact = await message.getContact();
            const chat = await message.getChat();

            console.log(`Mensaje recibido de ${contact.name || contact.pushname}: ${message.body}`);

            // Revisar configuración global de IA
            const config = await prisma.config.findUnique({ where: { id: "global" } });
            if (!config?.globalAiEnabled) {
                return; // La IA está apagada globalmente
            }

            // Lógica de filtrado por contacto/grupo
            if (chat.isGroup) {
                // Buscar grupo en BD
                const groupRecord = await prisma.group.findUnique({ where: { chatId: chat.id._serialized } });
                // Si no está habilitado, ignorar
                if (!groupRecord?.aiEnabled) return;
            } else {
                // Es un contacto directo
                const contactRecord = await prisma.contact.findUnique({ where: { phone: contact.id.user } });
                // Si el contacto está explícitamente apagado (y el registro existe), ignorar
                // Por defecto podríamos querer que responda a todos, pero ajustado en la UI
                if (contactRecord !== null && !contactRecord.aiEnabled) return;
            }

            // Obtener contexto de la Base de Conocimientos
            const context = await retrieveKnowledgeContext(message.body);

            // Llamar a Gemini (IA)
            const aiReply = await generateAIResponse(
                message.body,
                contact.name || contact.pushname || "Usuario",
                [], // Aquí podríamos cargar historial previo de este contacto
                context
            );

            // Responder en el chat de WhatsApp
            await chat.sendMessage(aiReply);

            // Cuidado: Aquí podrías registrar el log si quisieras

        } catch (e: any) {
            console.error("Error al procesar mensaje de WhatsApp o IA:", e);
            await prisma.systemLog.create({
                data: {
                    level: "error",
                    module: "whatsapp_ai",
                    message: "Error procesando chat de entrada o conectando con Gemini AI",
                    details: e?.message || String(e)
                }
            });
        }
    });

    return client;
}

// Enviar mensaje (texto o multimedia)
export const sendWhatsAppMessage = async (to: string, content: string | MessageMedia, options?: MessageSendOptions) => {
    if (!client) throw new Error('El cliente de WhatsApp no está inicializado');

    try {
        let finalTo = to;

        // WA Web JS a menudo falla enviando directamente a IDs @lid
        if (to && typeof to === 'string' && to.includes('@lid')) {
            try {
                const contact = await client.getContactById(to);

                // Intentar extraer el número del objeto contact
                const realNumber = contact?.number || contact?.id?.user;

                if (realNumber) {
                    finalTo = `${realNumber}@c.us`;
                    console.log(`[WhatsApp] ID @lid traducido a número real: ${finalTo}`);
                } else {
                    console.log(`[WhatsApp] No se encontró número @c.us para el @lid ${to}. Enviando a ${to}`);
                }
            } catch (e) {
                console.warn(`[WhatsApp] Catch: No se pudo resolver el @lid ${to}. Procediendo con original.`);
            }
        }

        // Ya sea c.us o lid, comprobemos si está registrado en WA y obtener ID final canonizado
        // getNumberId solo funciona con números limpios (sin @c.us), pero por las dudas
        if (finalTo && typeof finalTo === 'string' && finalTo.includes('@c.us')) {
            const cleanNum = finalTo.replace('@c.us', '');
            const numberId = await client.getNumberId(cleanNum);
            if (numberId) {
                finalTo = numberId._serialized;
            }
        }

        const message = await client.sendMessage(finalTo, content, options);
        return message;
    } catch (error: any) {
        console.error(`Error enviando mensaje a ${to}:`, error);
        await prisma.systemLog.create({
            data: {
                level: "error",
                module: "whatsapp_sender",
                message: `Error enviando mensaje a ${to}`,
                details: error?.message || String(error)
            }
        });
        throw error;
    }
};
