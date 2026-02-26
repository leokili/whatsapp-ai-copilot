"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageCircle, Bot, User, Loader2, RefreshCw } from "lucide-react";

interface LogEntry {
    id: string;
    content: string;
    from: string;
    to: string;
    isAiReply: boolean;
    timestamp: string;
}

export default function LogsPage() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadLogs = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/logs");
            if (res.ok) {
                const data = await res.json();
                setLogs(data);
            }
        } catch (err) {
            console.error("Error cargando registros", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadLogs();
    }, [loadLogs]);

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-50 p-6 font-sans">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <MessageCircle className="text-emerald-500" />
                            Registros de Conversaciones
                        </h1>
                        <p className="text-zinc-400 mt-2">
                            Historial de mensajes recibidos y respuestas enviadas por la IA
                        </p>
                    </div>
                    <button
                        onClick={loadLogs}
                        disabled={isLoading}
                        className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-xl text-sm transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                        Actualizar
                    </button>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                    {isLoading ? (
                        <div className="p-12 text-center text-zinc-500">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
                            Cargando registros...
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="p-12 text-center text-zinc-500">
                            <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p className="text-lg font-medium">Sin registros aún</p>
                            <p className="text-sm mt-1">
                                Los mensajes aparecerán aquí cuando la IA comience a responder.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-zinc-800">
                            {logs.map((log) => (
                                <div
                                    key={log.id}
                                    className="p-4 hover:bg-zinc-800/30 transition-colors"
                                >
                                    <div className="flex items-start gap-3">
                                        <div
                                            className={`p-2 rounded-full shrink-0 ${log.isAiReply
                                                    ? "bg-emerald-500/10 text-emerald-500"
                                                    : "bg-blue-500/10 text-blue-500"
                                                }`}
                                        >
                                            {log.isAiReply ? (
                                                <Bot className="w-4 h-4" />
                                            ) : (
                                                <User className="w-4 h-4" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
                                                <span className="font-medium">
                                                    {log.isAiReply ? "Copiloto IA" : log.from}
                                                </span>
                                                <span>→</span>
                                                <span>{log.to}</span>
                                                <span className="ml-auto">
                                                    {new Date(log.timestamp).toLocaleString("es-AR")}
                                                </span>
                                            </div>
                                            <p className="text-sm text-zinc-300 whitespace-pre-wrap break-words">
                                                {log.content}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
