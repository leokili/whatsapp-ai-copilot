import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
    try {
        const config = await prisma.config.findUnique({
            where: { id: "global" },
        });

        // Si no existe, creamos la conf por defecto
        if (!config) {
            const newConfig = await prisma.config.create({
                data: { id: "global", globalAiEnabled: true, geminiApiKey: "" },
            });
            return NextResponse.json(newConfig);
        }

        return NextResponse.json(config);
    } catch (error) {
        return NextResponse.json({ error: "Error al leer la configuración" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { globalAiEnabled, geminiApiKey } = body;

        const config = await prisma.config.upsert({
            where: { id: "global" },
            update: {
                globalAiEnabled: globalAiEnabled,
                geminiApiKey: geminiApiKey,
            },
            create: {
                id: "global",
                globalAiEnabled: globalAiEnabled !== undefined ? globalAiEnabled : true,
                geminiApiKey: geminiApiKey || "",
            },
        });

        return NextResponse.json(config);
    } catch (error) {
        console.error("Config save error:", error);
        return NextResponse.json({ error: "Error al guardar la configuración" }, { status: 500 });
    }
}
