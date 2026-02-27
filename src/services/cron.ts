import cron from "node-cron";
import { PrismaClient } from "@prisma/client";
import { Client, MessageMedia } from "whatsapp-web.js";
import { sendWhatsAppMessage } from "./whatsappClient";

const prisma = new PrismaClient();

export function startCronJobs(whatsappClient: Client) {
    // Ejecuta cada minuto para revisar si hay mensajes programados pendientes
    cron.schedule("* * * * *", async () => {
        try {
            const now = new Date();

            // Buscar tareas pendientes cuya fecha de ejecución ya pasó o es ahora
            const pendingTasks = await prisma.scheduledTask.findMany({
                where: {
                    isSent: false,
                    executeAt: {
                        lte: now
                    }
                }
            });

            if (pendingTasks.length > 0) {
                console.log(`⏱️ Procesando ${pendingTasks.length} mensaje(s) programado(s)...`);
            }

            for (const task of pendingTasks) {
                try {
                    let finalTargetId = task.targetId;

                    // Si no trae el dominio específico de WA (@c.us, @g.us, @lid)
                    if (!finalTargetId.includes("@c.us") && !finalTargetId.includes("@g.us") && !finalTargetId.includes("@lid")) {
                        // Limpiamos espacios u otros caracteres no numéricos por si el usuario puso +52 1 555-555
                        const cleanNumber = finalTargetId.replace(/\D/g, '');
                        if (cleanNumber.length > 0) {
                            finalTargetId = `${cleanNumber}@c.us`;
                        }
                    }

                    if (task.mediaPath) {
                        try {
                            const media = MessageMedia.fromFilePath(task.mediaPath);
                            const isAudio = task.mediaType?.includes('audio') || task.mediaPath?.endsWith('.webm') || task.mediaPath?.endsWith('.ogg');

                            // WA Web JS crashea con 'sendAudioAsVoice: true' si el mimetype del archivo local
                            // se detectó erróneamente como 'video/webm' (lo cual hace Node.js 'mime' module por defecto).
                            // Sobrescribimos a 'audio/mp4' para que WhatsApp lo procese limpiamente como PTT.
                            if (isAudio && media.mimetype.includes('video')) {
                                media.mimetype = 'audio/mp4';
                            }

                            await sendWhatsAppMessage(finalTargetId, media, {
                                caption: isAudio ? undefined : (task.message || undefined),
                                sendMediaAsSticker: task.isSticker || false,
                                sendAudioAsVoice: isAudio
                            });
                        } catch (mediaError: any) {
                            console.error(`❌ Error cargando archivo adjunto para ${task.targetId}`, mediaError);

                            await prisma.systemLog.create({
                                data: {
                                    level: "warn",
                                    module: "cron",
                                    message: `Error enviando adjunto a ${task.targetId}`,
                                    details: mediaError?.message || String(mediaError)
                                }
                            });

                            // Fallback: enviar solo texto si el archivo falla
                            if (task.message) {
                                await sendWhatsAppMessage(finalTargetId, task.message);
                            }
                        }
                    } else {
                        await sendWhatsAppMessage(finalTargetId, task.message);
                    }

                    // Marcar como completado
                    await prisma.scheduledTask.update({
                        where: { id: task.id },
                        data: { isSent: true }
                    });

                    console.log(`✅ Mensaje programado enviado a ${task.targetId}`);
                } catch (err: any) {
                    console.error(`❌ Error enviando mensaje programado a ${task.targetId}`, err);
                    await prisma.systemLog.create({
                        data: {
                            level: "error",
                            module: "cron",
                            message: `Error enviando mensaje a ${task.targetId}`,
                            details: err?.message || String(err)
                        }
                    });
                }
            }
        } catch (e: any) {
            console.error("Error en la verificación del cron", e);
            await prisma.systemLog.create({
                data: {
                    level: "error",
                    module: "cron",
                    message: "Fallo general en la tarea de verificación",
                    details: e?.message || String(e)
                }
            });
        }
    });

    console.log("⏰ Tareas programadas inicializadas.");
}
