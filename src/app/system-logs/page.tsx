"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Trash2, ShieldAlert, Activity, Server, Clock } from "lucide-react";

interface SystemLog {
    id: string;
    level: string;
    module: string;
    message: string;
    details?: string | null;
    timestamp: string;
}

export default function SystemLogsPage() {
    const [logs, setLogs] = useState<SystemLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/system-logs");
            if (res.ok) {
                const data = await res.json();
                setLogs(data);
            }
        } catch (error) {
            console.error("Error fetching system logs", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const clearLogs = async () => {
        if (!confirm("¿Estás seguro de que quieres eliminar TODOS los registros de errores del sistema? Esta acción no se puede deshacer.")) return;

        try {
            const res = await fetch("/api/system-logs", { method: "DELETE" });
            if (res.ok) {
                setLogs([]);
            } else {
                alert("Error al intentar limpiar los registros.");
            }
        } catch (error) {
            alert("Error de conexión al limpiar registros.");
        }
    };

    const getLevelConfig = (level: string) => {
        switch (level) {
            case 'error': return { color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: ShieldAlert };
            case 'warn': return { color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: AlertTriangle };
            case 'info': return { color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: Activity };
            default: return { color: 'text-zinc-500', bg: 'bg-zinc-500/10', border: 'border-zinc-500/20', icon: Server };
        }
    };

    return (
        <div className="p-8 max-w-6xl mx-auto h-screen flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Server className="w-8 h-8 text-emerald-500" />
                        Errores del Sistema
                    </h1>
                    <p className="text-zinc-400 mt-2">
                        Supervisa fallos internos, errores de conexión de WhatsApp y problemas de ejecución de Tareas Programadas.
                    </p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={fetchLogs}
                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-colors font-medium text-sm flex items-center gap-2"
                    >
                        Actualizar
                    </button>
                    {logs.length > 0 && (
                        <button
                            onClick={clearLogs}
                            className="px-4 py-2 border border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all font-medium flex items-center gap-2 text-sm"
                        >
                            <Trash2 className="w-4 h-4" />
                            Limpiar Historial
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col">
                {isLoading ? (
                    <div className="p-8 text-center text-zinc-500">Cargando registros...</div>
                ) : logs.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-zinc-500">
                        <ShieldAlert className="w-16 h-16 mb-4 text-emerald-500/50" />
                        <h3 className="text-xl font-medium text-zinc-300">¡Todo en orden!</h3>
                        <p className="mt-2 text-sm max-w-md text-center">No hay errores recientes en el sistema. El Copiloto de Inteligencia Artificial y la conexión a WhatsApp están funcionando correctamente.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-zinc-950/50 text-sm text-zinc-500 font-medium">
                                    <th className="p-4 border-b border-zinc-800 w-32">Nivel</th>
                                    <th className="p-4 border-b border-zinc-800 w-40">Módulo</th>
                                    <th className="p-4 border-b border-zinc-800">Mensaje</th>
                                    <th className="p-4 border-b border-zinc-800 w-48 whitespace-nowrap">Fecha / Hora</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log) => {
                                    const { color, bg, border, icon: Icon } = getLevelConfig(log.level);
                                    return (
                                        <tr key={log.id} className="hover:bg-zinc-800/50 transition-colors group">
                                            <td className="p-4 border-b border-zinc-800/50">
                                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${bg} ${border} ${color} rounded-lg text-xs font-semibold uppercase tracking-wider`}>
                                                    <Icon className="w-3.5 h-3.5" />
                                                    {log.level}
                                                </div>
                                            </td>
                                            <td className="p-4 border-b border-zinc-800/50">
                                                <span className="text-sm font-mono text-zinc-400 bg-zinc-950 px-2 py-1 rounded">
                                                    {log.module}
                                                </span>
                                            </td>
                                            <td className="p-4 border-b border-zinc-800/50">
                                                <div className="text-sm font-medium text-zinc-200">{log.message}</div>
                                                {log.details && (
                                                    <pre className="mt-2 p-3 bg-zinc-950 rounded-lg text-xs text-zinc-500 font-mono overflow-hidden break-all whitespace-pre-wrap max-h-32 overflow-y-auto">
                                                        {log.details}
                                                    </pre>
                                                )}
                                            </td>
                                            <td className="p-4 border-b border-zinc-800/50 text-xs text-zinc-500">
                                                <div className="flex items-center gap-1.5">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' })}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
