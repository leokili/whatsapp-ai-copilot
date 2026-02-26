import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { loadPDF } from "@/services/knowledge";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const prisma = new PrismaClient();

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No se proporcionó archivo" }, { status: 400 });
        }

        // Guardar el archivo temporalmente
        const uploadsDir = path.join(process.cwd(), "uploads");
        await mkdir(uploadsDir, { recursive: true });

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const filePath = path.join(uploadsDir, file.name);
        await writeFile(filePath, buffer);

        // Procesar el PDF
        const docs = await loadPDF(filePath);
        const fullText = docs.map((d) => d.pageContent).join("\n\n");

        // Guardar en la base de datos
        const entry = await prisma.knowledgeBase.create({
            data: {
                title: file.name,
                type: "pdf",
                content: fullText,
            },
        });

        return NextResponse.json({ success: true, entry });
    } catch (error) {
        console.error("Error al subir PDF:", error);
        return NextResponse.json(
            { error: "Error al procesar el archivo PDF" },
            { status: 500 }
        );
    }
}
