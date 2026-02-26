import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Esta función se encarga de llamar a Gemini para procesar el mensaje
export async function generateAIResponse(
    incomingMessage: string,
    contactName: string,
    history: string[] = [],
    knowledgeContext: string = ""
): Promise<string> {
    try {
        // 1. Obtener la clave API desde la configuración global en la BD
        const config = await prisma.config.findUnique({ where: { id: "global" } });

        if (!config || !config.geminiApiKey) {
            return "🤖 [Aviso del sistema]: La Inteligencia Artificial no tiene configurada la clave API de Gemini. Por favor, configúrala en el panel web.";
        }

        // 2. Inicializar el modelo con la clave
        const model = new ChatGoogleGenerativeAI({
            model: "gemini-1.5-flash",
            apiKey: config.geminiApiKey,
            maxOutputTokens: 1024,
            temperature: 0.7,
        });

        // 3. Crear el prompt (instrucciones)
        const prompt = PromptTemplate.fromTemplate(`
You are an intelligent WhatsApp assistant acting on behalf of the user.
Your responses should be natural, helpful, and polite. 
Communicate in Spanish.

You are talking to: {contactName}

Relevant Knowledge Base Information:
{knowledgeContext}

Recent Conversation History:
{history}

Incoming Message from {contactName}: {incomingMessage}

Please write a suitable response based on the Knowledge Base and context. If you don't know the answer, be polite and try to help.
Response:`);

        // 4. Crear la cadena de ejecución
        const chain = prompt.pipe(model).pipe(new StringOutputParser());

        // 5. Generar respuesta
        const response = await chain.invoke({
            incomingMessage,
            contactName,
            knowledgeContext: knowledgeContext || "No hay información adicional proporcionada.",
            history: history.length > 0 ? history.join("\n") : "Sin historial previo.",
        });

        return response;
    } catch (error: any) {
        console.error("❌ Fallo Crítico en Gemini AI:");
        console.error(error?.response?.data || error);
        return "🤖 [Error del sistema]: Hubo un problema al contactar a la Inteligencia Artificial. Por favor intenta más tarde.";
    }
}
