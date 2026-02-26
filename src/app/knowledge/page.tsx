"use client";

import { useState, useEffect, useCallback } from "react";
import {
    BookOpen,
    UploadCloud,
    Link as LinkIcon,
    FileText,
    Trash2,
    Loader2,
    Globe,
    CheckCircle2,
} from "lucide-react";

interface KnowledgeEntry {
    id: string;
    title: string;
    type: string;
    content: string;
    createdAt: string;
}

export default function KnowledgePage() {
    const [url, setUrl] = useState("");
    const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState("");

    const loadEntries = useCallback(async () => {
        try {
            const res = await fetch("/api/knowledge");
            if (res.ok) {
                const data = await res.json();
                setEntries(data);
            }
        } catch (err) {
            console.error("Error cargando entradas:", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadEntries();
    }, [loadEntries]);

    const showMessage = (msg: string) => {
        setMessage(msg);
        setTimeout(() => setMessage(""), 4000);
    };

    const handleUploadPDF = async () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".pdf";
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            setIsUploading(true);
            const formData = new FormData();
            formData.append("file", file);

            try {
                const res = await fetch("/api/knowledge/upload", {
                    method: "POST",
                    body: formData,
                });
                if (res.ok) {
                    showMessage("✅ PDF procesado e indexado correctamente");
                    loadEntries();
                } else {
                    showMessage("❌ Error al procesar el PDF");
                }
            } catch (err) {
                showMessage("❌ Error de conexión al subir el archivo");
            } finally {
                setIsUploading(false);
            }
        };
        input.click();
    };

    const handleExtractURL = async () => {
        if (!url.trim()) return;
        setIsExtracting(true);

        try {
            const res = await fetch("/api/knowledge", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: url, type: "url", url }),
            });
            if (res.ok) {
                showMessage("✅ Contenido web extraído e indexado");
                setUrl("");
                loadEntries();
            } else {
                showMessage("❌ Error al extraer la URL");
            }
        } catch (err) {
            showMessage("❌ Error de conexión");
        } finally {
            setIsExtracting(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`/api/knowledge?id=${id}`, { method: "DELETE" });
            if (res.ok) {
                setEntries((prev) => prev.filter((e) => e.id !== id));
                showMessage("🗑️ Entrada eliminada");
            }
        } catch (err) {
            showMessage("❌ Error al eliminar");
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-50 p-6 font-sans">
            <div className="max-w-4xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <BookOpen className="text-emerald-500" />
                        Base de Conocimientos (IA)
                    </h1>
                    <p className="text-zinc-400 mt-2">
                        Sube documentos PDF o pega enlaces web para entrenar a tu Copiloto
                    </p>
                </div>

                {message && (
                    <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-center font-medium animate-in fade-in">
                        {message}
                    </div>
                )}

                <div className="grid md:grid-cols-2 gap-6">
                    {/* Subir PDF */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="p-4 bg-zinc-800 rounded-full">
                            <UploadCloud className="w-8 h-8 text-emerald-500" />
                        </div>
                        <h3 className="text-xl font-semibold">Subir Documento (PDF)</h3>
                        <p className="text-sm text-zinc-400">
                            Selecciona un archivo PDF de tu dispositivo para agregarlo al
                            cerebro de la IA.
                        </p>
                        <button
                            onClick={handleUploadPDF}
                            disabled={isUploading}
                            className="mt-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors px-6 py-2 rounded-lg font-medium shadow flex items-center gap-2"
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" /> Procesando...
                                </>
                            ) : (
                                "Seleccionar Archivo"
                            )}
                        </button>
                    </div>

                    {/* Leer Web */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-center space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-zinc-800 rounded-full">
                                <LinkIcon className="w-6 h-6 text-emerald-500" />
                            </div>
                            <h3 className="text-xl font-semibold">Extraer de Sitio Web</h3>
                        </div>
                        <p className="text-sm text-zinc-400">
                            Introduce una URL y la IA extraerá su contenido automáticamente.
                        </p>
                        <div className="flex gap-2">
                            <input
                                type="url"
                                placeholder="https://tupagina.com"
                                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                            />
                            <button
                                onClick={handleExtractURL}
                                disabled={isExtracting || !url.trim()}
                                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                            >
                                {isExtracting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    "Extraer"
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Archivos Cargados */}
                <div className="mt-12">
                    <h2 className="text-xl font-bold mb-4">Información Indexada</h2>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden text-sm">
                        <div className="grid grid-cols-12 gap-4 p-4 text-zinc-400 font-medium border-b border-zinc-800">
                            <div className="col-span-5">Título / Origen</div>
                            <div className="col-span-2">Tipo</div>
                            <div className="col-span-3">Fecha</div>
                            <div className="col-span-2 text-right">Acciones</div>
                        </div>

                        {isLoading ? (
                            <div className="p-8 text-center text-zinc-500">
                                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                Cargando...
                            </div>
                        ) : entries.length === 0 ? (
                            <div className="p-8 text-center text-zinc-500">
                                No hay información indexada aún. Sube un PDF o extrae una URL
                                para comenzar.
                            </div>
                        ) : (
                            entries.map((entry) => (
                                <div
                                    key={entry.id}
                                    className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-zinc-800/50 transition-colors border-b border-zinc-800/50 last:border-0"
                                >
                                    <div className="col-span-5 flex items-center gap-2 truncate">
                                        {entry.type === "pdf" ? (
                                            <FileText className="w-4 h-4 text-red-400 shrink-0" />
                                        ) : (
                                            <Globe className="w-4 h-4 text-blue-400 shrink-0" />
                                        )}
                                        <span className="truncate">{entry.title}</span>
                                    </div>
                                    <div className="col-span-2">
                                        <span
                                            className={`text-xs px-2 py-1 rounded-full border ${entry.type === "pdf"
                                                    ? "text-red-400 border-red-400/20 bg-red-400/10"
                                                    : "text-blue-400 border-blue-400/20 bg-blue-400/10"
                                                }`}
                                        >
                                            {entry.type === "pdf" ? "PDF" : "Web"}
                                        </span>
                                    </div>
                                    <div className="col-span-3 text-zinc-500">
                                        {new Date(entry.createdAt).toLocaleDateString("es-AR")}
                                    </div>
                                    <div className="col-span-2 text-right">
                                        <button
                                            onClick={() => handleDelete(entry.id)}
                                            className="text-zinc-500 hover:text-red-400 transition-colors p-1"
                                            title="Eliminar"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
