import { Client, LocalAuth } from 'whatsapp-web.js';
import { Server as SocketIOServer } from 'socket.io';
import { generateAIResponse } from './ai';
import { retrieveKnowledgeContext } from './knowledge';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

export function setupWhatsAppClient(io: SocketIOServer) {
    const client = new Client({
        authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
        puppeteer: {
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu'
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

        } catch (err) {
            console.error('Error al limpiar sesión tras desconexión:', err);
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

            // Registrar mensaje y respuesta en BD
            // await prisma.messageLog.create({ ... })

        } catch (e) {
            console.error("Error al procesar mensaje de WhatsApp:", e);
        }
    });

    return client;
}
