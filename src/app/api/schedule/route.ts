import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

import { promises as fs } from "fs";
import path from "path";

export async function POST(request: Request) {
    try {
        const formData = await request.formData();

        const targetId = formData.get("targetId") as string;
        const message = formData.get("message") as string;
        const date = formData.get("date") as string;
        const time = formData.get("time") as string;
        const isSticker = formData.get("isSticker") === "true";
        const file = formData.get("file") as File | null;

        if (!targetId || (!message && !file) || !date || !time) {
            return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
        }

        const executeAt = new Date(`${date}T${time}`);

        let mediaPath = null;
        let mediaName = null;
        let mediaType = null;

        if (file) {
            // Guardar el archivo localmente
            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);

            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);

            // Si el archivo viene del grabador web y su nombre es "blob" o no tiene extensión, forzar .webm
            let ext = path.extname(file.name);
            if (!ext && file.type.includes("audio")) ext = ".webm";

            const fileName = `${uniqueSuffix}${ext}`;
            const uploadDir = path.join(process.cwd(), "uploads");

            // Asegurar que exista la carpeta
            await fs.mkdir(uploadDir, { recursive: true });

            const filePath = path.join(uploadDir, fileName);
            await fs.writeFile(filePath, buffer);

            mediaPath = filePath;
            mediaName = file.name;
            mediaType = file.type;
        }

        const task = await prisma.scheduledTask.create({
            data: {
                targetId,
                message: message || "", // Si manda solo imagen, el mensaje puede ser vacío
                executeAt,
                mediaPath,
                mediaName,
                mediaType,
                isSticker,
            },
        });

        return NextResponse.json({ success: true, task });
    } catch (error) {
        console.error("Scheduler Error:", error);
        return NextResponse.json({ error: "Error al programar el mensaje" }, { status: 500 });
    }
}

export async function GET() {
    try {
        const tasks = await prisma.scheduledTask.findMany({
            orderBy: { executeAt: "desc" }, // Mostramos mas recientes primero, incluyendo los ya enviados
        });

        return NextResponse.json(tasks);
    } catch (error) {
        return NextResponse.json({ error: "Error al obtener tareas programadas" }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: "ID no proporcionado" }, { status: 400 });
        }

        await prisma.scheduledTask.delete({
            where: { id: id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Scheduler Delete Error:", error);
        return NextResponse.json({ error: "Error al eliminar la tarea" }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const formData = await request.formData();

        const id = formData.get("id") as string;
        if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

        const targetId = formData.get("targetId") as string;
        const message = formData.get("message") as string;
        const date = formData.get("date") as string;
        const time = formData.get("time") as string;
        const isSticker = formData.get("isSticker") === "true";
        // To simplify, edit doesn't change file by default unless passed

        const executeAt = new Date(`${date}T${time}`);

        const task = await prisma.scheduledTask.update({
            where: { id },
            data: {
                targetId,
                message: message || "",
                executeAt,
                isSticker,
            },
        });

        return NextResponse.json({ success: true, task });
    } catch (error) {
        console.error("Scheduler Edit Error:", error);
        return NextResponse.json({ error: "Error al editar la tarea" }, { status: 500 });
    }
}
