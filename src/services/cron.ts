import cron from "node-cron";
import { PrismaClient } from "@prisma/client";
import { Client, MessageMedia } from "whatsapp-web.js";

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

                    // Si no trae el dominio específico de WA y no es un ID de grupo estándar largo (números-números)
                    if (!finalTargetId.includes("@c.us") && !finalTargetId.includes("@g.us")) {
                        // Limpiamos espacios u otros caracteres no numéricos por si el usuario puso +52 1 555-555
                        const cleanNumber = finalTargetId.replace(/\D/g, '');
                        if (cleanNumber.length > 0) {
                            finalTargetId = `${cleanNumber}@c.us`;
                        }
                    }

                    if (task.mediaPath) {
                        try {
                            const media = MessageMedia.fromFilePath(task.mediaPath);
                            await whatsappClient.sendMessage(finalTargetId, media, {
                                caption: task.message || undefined,
                                sendMediaAsSticker: task.isSticker
                            });
                        } catch (mediaError) {
                            console.error(`❌ Error cargando archivo adjunto para ${task.targetId}`, mediaError);
                            // Fallback: enviar solo texto si el archivo falla
                            if (task.message) {
                                await whatsappClient.sendMessage(finalTargetId, task.message);
                            }
                        }
                    } else {
                        await whatsappClient.sendMessage(finalTargetId, task.message);
                    }

                    // Marcar como completado
                    await prisma.scheduledTask.update({
                        where: { id: task.id },
                        data: { isSent: true }
                    });

                    console.log(`✅ Mensaje programado enviado a ${task.targetId}`);
                } catch (err) {
                    console.error(`❌ Error enviando mensaje programado a ${task.targetId}`, err);
                }
            }
        } catch (e) {
            console.error("Error en la verificación del cron", e);
        }
    });

    console.log("⏰ Tareas programadas inicializadas.");
}
