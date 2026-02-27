import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
    try {
        const logs = await prisma.systemLog.findMany({
            orderBy: { timestamp: 'desc' },
            take: 100 // Limitar a los últimos 100 errores para no saturar
        });

        return NextResponse.json(logs);
    } catch (error) {
        console.error("Error fetching system logs:", error);
        return NextResponse.json({ error: "Failed to fetch system logs" }, { status: 500 });
    }
}

export async function DELETE() {
    try {
        await prisma.systemLog.deleteMany({});
        return NextResponse.json({ success: true, message: "Todos los registros de sistema han sido eliminados" });
    } catch (error) {
        console.error("Error deleting system logs:", error);
        return NextResponse.json({ error: "Failed to delete system logs" }, { status: 500 });
    }
}
