import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { loadWeb } from "@/services/knowledge";

const prisma = new PrismaClient();

// Agregar una fuente de conocimiento (URL o texto directo)
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { title, type, url, content } = body;

        let extractedContent = content || "";

        // Si es una URL, extraer el texto de la web
        if (type === "url" && url) {
            const docs = await loadWeb(url);
            extractedContent = docs.map((d) => d.pageContent).join("\n\n");
        }

        const entry = await prisma.knowledgeBase.create({
            data: {
                title: title || url || "Sin título",
                type: type || "text",
                content: extractedContent,
            },
        });

        return NextResponse.json({ success: true, entry });
    } catch (error) {
        console.error("Error al guardar conocimiento:", error);
        return NextResponse.json(
            { error: "Error al procesar la fuente de conocimiento" },
            { status: 500 }
        );
    }
}

// Listar todas las fuentes de conocimiento
export async function GET() {
    try {
        const entries = await prisma.knowledgeBase.findMany({
            orderBy: { createdAt: "desc" },
        });
        return NextResponse.json(entries);
    } catch (error) {
        return NextResponse.json(
            { error: "Error al obtener la base de conocimientos" },
            { status: 500 }
        );
    }
}

// Eliminar una fuente de conocimiento
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "ID requerido" }, { status: 400 });
        }

        await prisma.knowledgeBase.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json(
            { error: "Error al eliminar" },
            { status: 500 }
        );
    }
}
