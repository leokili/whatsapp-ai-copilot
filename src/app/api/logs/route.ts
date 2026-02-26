import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
    try {
        const logs = await prisma.messageLog.findMany({
            orderBy: { timestamp: "desc" },
            take: 100,
        });
        return NextResponse.json(logs);
    } catch (error) {
        return NextResponse.json(
            { error: "Error al obtener los registros" },
            { status: 500 }
        );
    }
}
