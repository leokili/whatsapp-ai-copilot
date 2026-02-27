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

import { promises as fs } from "fs";
import path from "path";

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const targetId = formData.get("targetId") as string;
        const message = formData.get("message") as string;
        const isSticker = formData.get("isSticker") === "true";
        const file = formData.get("file") as File | null;

        if (!targetId || (!message && !file)) {
            return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
        }

        let mediaPath = null;
        let mediaName = null;
        let mediaType = null;

        if (file) {
            // Guardar el archivo localmente
            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);

            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            // Si el archivo viene del grabador web y su nombre es "blob" sin extensión, forzar .webm
            let ext = path.extname(file.name);
            if (!ext && file.type.includes("audio")) ext = ".webm";

            const fileName = `${uniqueSuffix}${ext}`;
            const uploadDir = path.join(process.cwd(), "uploads");

            await fs.mkdir(uploadDir, { recursive: true });

            const filePath = path.join(uploadDir, fileName);
            await fs.writeFile(filePath, buffer);

            mediaPath = filePath;
            mediaName = file.name;
            mediaType = file.type;
        }

        // Programar para "ahora" (el cron lo recogerá en el próximo minuto)
        const task = await prisma.scheduledTask.create({
            data: {
                targetId,
                message: message || "",
                executeAt: new Date(), // Ahora
                mediaPath,
                mediaName,
                mediaType,
                isSticker
            },
        });

        const isGroup = targetId.includes("@g.us");

        // Registrar el mensaje saliente manual en el historial para que lo vea en la UI al instante
        await prisma.messageLog.create({
            data: {
                content: message || "[Media attachment]",
                from: "Me",
                to: targetId,
                isAiReply: false
            }
        });

        return NextResponse.json({ success: true, task });
    } catch (error) {
        console.error("Error en /api/send:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
