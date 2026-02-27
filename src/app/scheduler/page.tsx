"use client";

import { useState, useEffect, useRef } from "react";
import { CalendarClock, Send, Users, User, Paperclip, Image as ImageIcon, Smile, Mic, Square, Trash2, Edit2, CheckCircle2, Clock } from "lucide-react";
import WhatsAppInput from "@/components/WhatsAppInput";

interface ScheduledTask {
    id: string;
    targetId: string;
    message: string;
    executeAt: string;
    isSent: boolean;
    mediaName?: string | null;
    mediaPath?: string | null;
    mediaType?: string | null;
    isSticker?: boolean | null;
}

export default function SchedulerPage() {
    const [targetType, setTargetType] = useState<"contact" | "group">("contact");
    const [targetId, setTargetId] = useState("");
    const [message, setMessage] = useState("");
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [isSticker, setIsSticker] = useState(false);

    // Edit mode
    const [editingId, setEditingId] = useState<string | null>(null);

    // Audio recording
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

            if (autoTargetId) {
                setTargetId(autoTargetId.replace(/@c\.us|@g\.us|@lid/g, ''));
            }
            if (autoTargetType === "group" || autoTargetType === "contact") {
                setTargetType(autoTargetType as "group" | "contact");
            }
        }
    }, []);

    const handleDeleteTask = async (id: string) => {
        if (!confirm("¿Seguro que quieres eliminar este mensaje?")) return;

        try {
            const res = await fetch(`/api/schedule?id=${id}`, { method: "DELETE" });
            if (res.ok) {
                fetchTasks();
            } else {
                alert("Error al eliminar la tarea");
            }
        } catch (error) {
            alert("Error de red al eliminar la tarea");
        }
    };

    const handleEditClick = (task: ScheduledTask) => {
        setEditingId(task.id);
        const [d, t] = new Date(task.executeAt).toISOString().split('T');
        setDate(d);
        setTime(t.substring(0, 5));
        setMessage(task.message);
        setTargetId(task.targetId.replace(/@c\.us|@g\.us|@lid/g, ''));
        setTargetType(task.targetId.includes("@g.us") ? "group" : "contact");
        setIsSticker(task.isSticker || false);
        setFile(null); // Simple file reset for now
        if (fileInputRef.current) fileInputRef.current.value = "";
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setTargetId("");
        setMessage("");
        setDate("");
        setTime("");
        setFile(null);
        setIsSticker(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleSchedule = async () => {
        if (!targetId || (!message && !file && !audioBlob) || !date || !time) {
            alert("Por favor completa los campos requeridos (Destinatario, Fecha, Hora y al menos un Mensaje o Archivo/Audio).");
            return;
        }

        setIsLoading(true);
        try {
            const formData = new FormData();
            if (editingId) formData.append("id", editingId);

            // Reconstruir el ID con dominio antes de enviarlo
            let cleanId = targetId.replace(/[^0-9a-zA-Z-]/g, ''); // Remover +, espacios, etc.
            let finalTargetId = targetType === "group" ? `${cleanId}@g.us` : `${cleanId}@c.us`;

            formData.append("targetId", finalTargetId);
            formData.append("message", message);
            formData.append("date", date);
            formData.append("time", time);
            formData.append("isSticker", isSticker ? "true" : "false");

            if (file) {
                formData.append("file", file);
            } else if (audioBlob) {
                formData.append("file", audioBlob, "scheduled-voice.webm");
            }

            const res = await fetch("/api/schedule", {
                method: editingId ? "PUT" : "POST",
                body: formData,
            });

            const data = await res.json();

            if (data.success) {
                alert(editingId ? "✅ ¡Mensaje editado con éxito!" : "✅ ¡Mensaje programado con éxito!");
                cancelEdit();
                setAudioBlob(null);
                setRecordingTime(0);
                cancelRecording();
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

    // ---- Audio Logic ----
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);
            timerIntervalRef.current = setInterval(() => setRecordingTime(p => p + 1), 1000);
        } catch (err) {
            console.error(err);
            alert("Error al usar el micrófono.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        }
    };

    const cancelRecording = () => {
        if (mediaRecorderRef.current && isRecording) mediaRecorderRef.current.stop();
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        setIsRecording(false);
        setAudioBlob(null);
        setRecordingTime(0);
    };

    const formatTime = (secs: number) => `${Math.floor(secs / 60).toString().padStart(2, '0')}:${(secs % 60).toString().padStart(2, '0')}`;


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

                            <WhatsAppInput
                                value={message}
                                onChange={setMessage}
                                className="mb-1"
                            />
                            {/* Consejos de Formato */}
                            <div className="bg-zinc-950/50 p-3 rounded-lg border border-zinc-800/50 flex gap-4 text-xs text-zinc-400">
                                <span><strong className="text-zinc-200">*Negrita*</strong></span>
                                <span><em className="text-zinc-200">_Cursiva_</em></span>
                                <span><del className="text-zinc-200">~Tachado~</del></span>
                                <span><code className="bg-zinc-800 px-1 rounded text-zinc-200">```Monoespaciado```</code></span>
                            </div>
                        </div>

                        {/* Adjuntos y Audio */}
                        <div className="space-y-2 border border-zinc-800 rounded-xl p-4 bg-zinc-950/30">
                            <label className="text-sm font-medium text-zinc-300 mb-2 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Paperclip className="w-4 h-4" />
                                    Archivo Adjunto / Nota de Voz
                                </div>
                            </label>

                            {!isRecording && !audioBlob && (
                                <div className="flex flex-col sm:flex-row gap-4 items-center">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={(e) => {
                                            if (e.target.files?.length) {
                                                setFile(e.target.files[0]);
                                                setAudioBlob(null);
                                            }
                                        }}
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
                            )}

                            {/* Voice Recorder Block */}
                            {!file && (
                                <div className="mt-4 pt-4 border-t border-zinc-800/50 flex items-center gap-4">
                                    {isRecording ? (
                                        <div className="flex-1 flex items-center justify-between bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2 text-red-500 animate-pulse">
                                            <div className="flex items-center gap-3">
                                                <Mic className="w-5 h-5 text-red-500" />
                                                <span className="font-medium text-sm">Grabando Audio...</span>
                                            </div>
                                            <span className="font-mono">{formatTime(recordingTime)}</span>
                                        </div>
                                    ) : audioBlob ? (
                                        <div className="flex-1 flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2 text-emerald-500">
                                            <div className="flex items-center gap-3">
                                                <Mic className="w-5 h-5" />
                                                <span className="font-medium text-sm">Nota de voz lista ({formatTime(recordingTime)})</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <button type="button" onClick={startRecording} className="flex-1 flex items-center justify-center gap-2 py-3 border border-zinc-800 rounded-xl text-zinc-400 hover:text-emerald-500 hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-colors">
                                            <Mic className="w-5 h-5" />
                                            Grabar Mensaje de Voz
                                        </button>
                                    )}

                                    {/* Mic/Audio Controls */}
                                    {isRecording ? (
                                        <>
                                            <button type="button" onClick={cancelRecording} className="p-3 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-xl transition-colors shrink-0">
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                            <button type="button" onClick={stopRecording} className="p-3 text-red-500 hover:bg-red-500/20 rounded-xl transition-colors shrink-0 border border-red-500/50 hover:border-transparent">
                                                <Square className="w-5 h-5 fill-current" />
                                            </button>
                                        </>
                                    ) : audioBlob ? (
                                        <button type="button" onClick={cancelRecording} className="p-3 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-xl transition-colors shrink-0">
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    ) : null}
                                </div>
                            )}

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
                                className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 transition-colors py-3 rounded-xl font-medium shadow-lg disabled:opacity-50"
                            >
                                {editingId ? <Edit2 className="w-5 h-5" /> : <Send className="w-5 h-5" />}
                                {isLoading ? "Programando..." : (editingId ? "Guardar Edición" : "Programar Mensaje")}
                            </button>
                            {editingId && (
                                <button
                                    type="button"
                                    onClick={cancelEdit}
                                    className="px-6 py-3 border border-zinc-800 hover:bg-zinc-800 rounded-xl transition-colors font-medium text-zinc-300"
                                >
                                    Cancelar Edición
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* Listas de Mensajes Programados / Enviados */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
                    <h2 className="text-xl font-bold mb-4">Lista de Tareas</h2>
                    {tasks.length === 0 ? (
                        <p className="text-zinc-500 text-sm">No hay mensajes programados aún.</p>
                    ) : (
                        <div className="space-y-4">
                            {tasks.map((task: ScheduledTask) => (
                                <div key={task.id} className={`p-4 border ${task.isSent ? 'border-zinc-800/50 bg-zinc-950/20' : 'border-zinc-800 bg-zinc-950/50'} rounded-xl flex justify-between items-start gap-4 transition-colors ${editingId === task.id ? 'ring-2 ring-emerald-500/50' : ''}`}>
                                    <div className="overflow-hidden">
                                        <div className="flex items-center gap-2 mb-1">
                                            {task.isSent ? (
                                                <span className="text-blue-500 text-xs font-bold bg-blue-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                    <CheckCircle2 className="w-3 h-3" /> Enviado: {new Date(task.executeAt).toLocaleString()}
                                                </span>
                                            ) : (
                                                <span className="text-emerald-500 text-xs font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                    <Clock className="w-3 h-3" /> Pendiente: {new Date(task.executeAt).toLocaleString()}
                                                </span>
                                            )}
                                            <span className="text-zinc-400 text-xs text-ellipsis overflow-hidden whitespace-nowrap">
                                                Para: {task.targetId}
                                            </span>
                                        </div>
                                        <p className={`text-sm ${task.isSent ? 'text-zinc-500' : 'text-zinc-300'} line-clamp-2 mt-2 break-words`}>
                                            {task.message || (task.mediaPath ? "🎵 Documento / Audio adjunto" : "")}
                                        </p>
                                        {task.mediaName && (
                                            <div className="flex items-center gap-1 mt-2 text-xs text-emerald-400 bg-emerald-500/10 w-fit px-2 py-1 rounded">
                                                {task.isSticker ? <Smile className="w-3 h-3" /> : (task.mediaName.includes('.webm') ? <Mic className="w-3 h-3" /> : <Paperclip className="w-3 h-3" />)}
                                                <span className="truncate max-w-[200px]">{task.mediaName}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-2 shrink-0">
                                        {!task.isSent && (
                                            <button
                                                onClick={() => handleEditClick(task)}
                                                className="text-xs text-amber-500 hover:text-amber-400 px-3 py-1.5 border border-amber-500/30 hover:bg-amber-500/10 rounded-lg whitespace-nowrap flex items-center justify-center gap-1"
                                            >
                                                <Edit2 className="w-3 h-3" /> Editar
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDeleteTask(task.id)}
                                            className="text-xs text-red-500 hover:text-red-400 px-3 py-1.5 border border-red-500/30 hover:bg-red-500/10 rounded-lg whitespace-nowrap flex items-center justify-center gap-1"
                                        >
                                            <Trash2 className="w-3 h-3" /> {task.isSent ? "Borrar Registro" : "Cancelar"}
                                        </button>
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
