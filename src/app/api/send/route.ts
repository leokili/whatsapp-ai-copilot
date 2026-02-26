import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Como no podemos importar `whatsappClient` directamente aquí sin causar bucles o múltiples instancias en Next.js App Router,
// guardaremos la intención de envío en Prisma y dejaremos que un mini-cron o el servicio principal la envíe inmediatamente.
// O bien, la forma más limpia en esta arquitectura Next+Express es hacer un POST a un endpoint en el `server.ts` (Express)
// pero para mantenerlo simple usando solo App Router, insertaremos en MessageLog y el cliente de WA luego lo recogerá.

// Una mejor solución rápida: Usar la misma tabla de ScheduledTask pero con executeAt = NOW.
// El cronjob ya existente (que corre cada minuto) lo enviará casi de inmediato.
// Si quisiéramos envío instantáneo, deberíamos exponer un endpoint en Express (server.ts) 
// y llamarlo desde aquí, pero ScheduledTask es la ruta más segura sin refactorizar la conexión de `whatsapp-web.js`.

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { targetId, message } = body;

        if (!targetId || !message) {
            return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
        }

        // Programar para "ahora" (el cron lo recogerá en el próximo minuto)
        // Alternativa: Si necesitamos inmediatez, esta ruta podría invocar HTTP a localhost:3000/internal/send (creada en server.ts)
        const task = await prisma.scheduledTask.create({
            data: {
                targetId,
                message,
                executeAt: new Date(), // Ahora
            },
        });

        // Buscar o crear el contacto/grupo y enlazar correctamente
        const isGroup = targetId.includes("@g.us");

        // Registrar el mensaje saliente manual en el historial para que lo vea en la UI al instante
        await prisma.messageLog.create({
            data: {
                content: message,
                from: "Me",
                to: targetId,
                isAiReply: false,
                ...(isGroup ? { groupId: targetId } : { contactId: targetId })
            }
        });

        return NextResponse.json({ success: true, task });
    } catch (error) {
        console.error("Error en /api/send:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
