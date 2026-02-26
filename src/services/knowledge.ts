import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document } from "@langchain/core/documents";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Divide los documentos en fragmentos manejables
const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
});

/**
 * Lee un archivo PDF local y extrae su texto fragmentado.
 */
export async function loadPDF(filePath: string): Promise<Document[]> {
    try {
        const loader = new PDFLoader(filePath);
        const docs = await loader.load();
        const splitDocs = await textSplitter.splitDocuments(docs);
        return splitDocs;
    } catch (error) {
        console.error("Error al cargar PDF:", error);
        throw new Error("No se pudo cargar el PDF.");
    }
}

/**
 * Lee una página web y extrae su texto usando Cheerio.
 */
export async function loadWeb(url: string): Promise<Document[]> {
    try {
        const loader = new CheerioWebBaseLoader(url);
        const docs = await loader.load();
        const splitDocs = await textSplitter.splitDocuments(docs);
        return splitDocs;
    } catch (error) {
        console.error("Error al leer la URL:", error);
        throw new Error("No se pudo extraer el texto de la página web.");
    }
}

/**
 * Función simulada para "buscar" en la base de conocimientos almacenada en Prisma.
 * (En una versión de producción avanzada, esto usaría una base de datos vectorial como LanceDB o Pinecone).
 */
export async function retrieveKnowledgeContext(query: string): Promise<string> {
    const records = await prisma.knowledgeBase.findMany({
        take: 5, // Límite simple
        orderBy: { createdAt: 'desc' }
    });

    // Aquí implementamos una búsqueda ingenua (naive) por palabras clave si no hay base vectorial
    const keywords = query.toLowerCase().split(' ').filter(word => word.length > 3);

    let matchedContext = "";

    for (const record of records) {
        let isRelevant = false;
        const contentLower = record.content.toLowerCase();

        // Verifica si alguna palabra clave está en el contenido
        for (const keyword of keywords) {
            if (contentLower.includes(keyword)) {
                isRelevant = true;
                break;
            }
        }

        if (isRelevant || keywords.length === 0) {
            // Agrega un fragmento del texto si coincide parcial o totalmente
            matchedContext += `\n[Fuente: ${record.title}]:\n${record.content.substring(0, 500)}...\n`;
        }
    }

    return matchedContext;
}
