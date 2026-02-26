"use client";

import { useState, useEffect, useRef } from "react";
import { CalendarClock, Send, Users, User, Paperclip, Image as ImageIcon, Smile } from "lucide-react";

interface ScheduledTask {
    id: string;
    targetId: string;
    message: string;
    executeAt: string;
    isSent: boolean;
    mediaName?: string;
    isSticker?: boolean;
}

export default function SchedulerPage() {
    const [targetType, setTargetType] = useState<"contact" | "group">("contact");
    const [targetId, setTargetId] = useState("");
    const [message, setMessage] = useState("");
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [isSticker, setIsSticker] = useState(false);

    const [tasks, setTasks] = useState<ScheduledTask[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchTasks = async () => {
        try {
            const res = await fetch("/api/schedule");
            const data = await res.json();
            setTasks(data);
        } catch (error) {
            console.error("Error cargando tareas programadas", error);
        }
    };

    useEffect(() => {
        fetchTasks();

        // Auto-llenar desde URL si venimos del botón del Chat
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            const autoTargetId = params.get("targetId");
            const autoTargetType = params.get("type");

            if (autoTargetId) setTargetId(autoTargetId);
            if (autoTargetType === "group" || autoTargetType === "contact") {
                setTargetType(autoTargetType as "group" | "contact");
            }
        }
    }, []);

    const handleDeleteTask = async (id: string) => {
        if (!confirm("¿Seguro que quieres cancelar este mensaje programado?")) return;

        try {
            const res = await fetch(`/api/schedule?id=${id}`, { method: "DELETE" });
            if (res.ok) {
                fetchTasks();
            } else {
                alert("Error al cancelar la tarea");
            }
        } catch (error) {
            alert("Error de red al cancelar la tarea");
        }
    };

    const handleSchedule = async () => {
        if (!targetId || (!message && !file) || !date || !time) {
            alert("Por favor completa los campos requeridos (Destinatario, Fecha, Hora y al menos un Mensaje o Archivo).");
            return;
        }

        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.append("targetId", targetId);
            formData.append("message", message);
            formData.append("date", date);
            formData.append("time", time);
            formData.append("isSticker", isSticker ? "true" : "false");

            if (file) {
                formData.append("file", file);
            }

            const res = await fetch("/api/schedule", {
                method: "POST",
                body: formData, // Enviar como multipart/form-data
            });

            const data = await res.json();

            if (data.success) {
                alert("✅ ¡Mensaje programado con éxito!");
                setTargetId("");
                setMessage("");
                setDate("");
                setTime("");
                setFile(null);
                setIsSticker(false);
                if (fileInputRef.current) fileInputRef.current.value = "";
                fetchTasks();
            } else {
                alert("❌ Error: " + (data.error || "Desconocido"));
            }
        } catch (error) {
            alert("❌ Error de conexión con el servidor.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-50 p-6 font-sans">
            <div className="max-w-4xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <CalendarClock className="text-emerald-500" />
                        Programador de Mensajes
                    </h1>
                    <p className="text-zinc-400 mt-2">
                        Configura mensajes automatizados, adjunta archivos (imágenes, audios, documentos) o stickers.
                    </p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
                    <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleSchedule(); }}>

                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Tipo de Destinatario */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300">Tipo de Destinatario</label>
                                <div className="flex gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setTargetType("contact")}
                                        className={`flex-1 flex items-center justify-center gap-2 py-3 border rounded-xl transition-colors ${targetType === "contact" ? "bg-emerald-600 border-emerald-500" : "bg-zinc-950 border-zinc-800 hover:border-zinc-700"}`}
                                    >
                                        <User className="w-4 h-4" /> Contacto
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTargetType("group")}
                                        className={`flex-1 flex items-center justify-center gap-2 py-3 border rounded-xl transition-colors ${targetType === "group" ? "bg-emerald-600 border-emerald-500" : "bg-zinc-950 border-zinc-800 hover:border-zinc-700"}`}
                                    >
                                        <Users className="w-4 h-4" /> Grupo
                                    </button>
                                </div>
                            </div>

                            {/* ID o Teléfono */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300">
                                    {targetType === "contact" ? "Número de Teléfono (con código de país)" : "ID del Grupo o Nombre"}
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder={targetType === "contact" ? "Ej: +34600000000" : "Ej: Familia o 123456@g.us"}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                                    value={targetId}
                                    onChange={(e) => setTargetId(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Mensaje */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300 flex justify-between">
                                Mensaje a Enviar
                                <span className="text-zinc-500 text-xs">(Soporta Emojis 🚀)</span>
                            </label>
                            <textarea
                                rows={4}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors resize-none mb-1"
                                placeholder="Escribe aquí tu mensaje."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                            />
                            {/* Consejos de Formato */}
                            <div className="bg-zinc-950/50 p-3 rounded-lg border border-zinc-800/50 flex gap-4 text-xs text-zinc-400">
                                <span><strong className="text-zinc-200">*Negrita*</strong></span>
                                <span><em className="text-zinc-200">_Cursiva_</em></span>
                                <span><del className="text-zinc-200">~Tachado~</del></span>
                                <span><code className="bg-zinc-800 px-1 rounded text-zinc-200">```Monoespaciado```</code></span>
                            </div>
                        </div>

                        {/* Adjuntos */}
                        <div className="space-y-2 border border-zinc-800 rounded-xl p-4 bg-zinc-950/30">
                            <label className="text-sm font-medium text-zinc-300 mb-2 flex items-center gap-2">
                                <Paperclip className="w-4 h-4" />
                                Archivo Adjunto (Opcional)
                            </label>
                            <div className="flex flex-col sm:flex-row gap-4 items-center">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                                    className="text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-emerald-500/10 file:text-emerald-500 hover:file:bg-emerald-500/20 w-full"
                                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
                                />
                                {file && file.type.startsWith("image/") && (
                                    <label className="flex items-center gap-2 text-sm text-zinc-300 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-xl cursor-pointer hover:bg-zinc-800 transition-colors whitespace-nowrap">
                                        <input
                                            type="checkbox"
                                            checked={isSticker}
                                            onChange={(e) => setIsSticker(e.target.checked)}
                                            className="w-4 h-4 rounded appearance-none border border-zinc-600 checked:bg-emerald-500 checked:border-emerald-500 relative before:content-['✓'] before:absolute before:text-white before:text-xs before:left-0.5 before:hidden checked:before:block"
                                        />
                                        <Smile className="w-4 h-4 text-emerald-500" />
                                        Enviar como Sticker
                                    </label>
                                )}
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Fecha */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300">Fecha</label>
                                <input
                                    type="date"
                                    required
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    style={{ colorScheme: "dark" }}
                                />
                            </div>

                            {/* Hora */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300">Hora</label>
                                <input
                                    type="time"
                                    required
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                    style={{ colorScheme: "dark" }}
                                />
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 transition-colors py-3 rounded-xl font-medium shadow-lg disabled:opacity-50"
                            >
                                <Send className="w-5 h-5" /> {isLoading ? "Programando..." : "Programar Mensaje"}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Lista de Mensajes Programados */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
                    <h2 className="text-xl font-bold mb-4">Mensajes Pendientes</h2>
                    {tasks.length === 0 ? (
                        <p className="text-zinc-500 text-sm">No hay mensajes programados pendientes.</p>
                    ) : (
                        <div className="space-y-4">
                            {tasks.map((task: ScheduledTask) => (
                                <div key={task.id} className="p-4 border border-zinc-800 rounded-xl bg-zinc-950/50 flex justify-between items-start gap-4">
                                    <div className="overflow-hidden">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-emerald-500 text-xs font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                                {new Date(task.executeAt).toLocaleString()}
                                            </span>
                                            <span className="text-zinc-400 text-xs text-ellipsis overflow-hidden whitespace-nowrap">
                                                Para: {task.targetId}
                                            </span>
                                        </div>
                                        <p className="text-sm text-zinc-300 line-clamp-2 mt-2 break-words">
                                            {task.message}
                                        </p>
                                        {task.mediaName && (
                                            <div className="flex items-center gap-1 mt-2 text-xs text-emerald-400 bg-emerald-500/10 w-fit px-2 py-1 rounded">
                                                {task.isSticker ? <Smile className="w-3 h-3" /> : <Paperclip className="w-3 h-3" />}
                                                <span className="truncate max-w-[200px]">{task.mediaName}</span>
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleDeleteTask(task.id)}
                                        className="text-xs text-red-500 hover:text-red-400 px-3 py-1.5 border border-red-500/30 hover:bg-red-500/10 rounded-lg whitespace-nowrap"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
