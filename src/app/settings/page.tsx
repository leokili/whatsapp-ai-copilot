"use client";

import { useState, useEffect } from "react";
import { Settings, Save, AlertCircle } from "lucide-react";

export default function SettingsPage() {
    const [apiKey, setApiKey] = useState("");
    const [aiEnabled, setAiEnabled] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        // Cargar config actual de la base de datos
        fetch("/api/config")
            .then(res => res.json())
            .then(data => {
                if (data) {
                    setApiKey(data.geminiApiKey || "");
                    setAiEnabled(Boolean(data.globalAiEnabled));
                }
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Error cargando config", err);
                setIsLoading(false);
            });
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage("");

        try {
            const res = await fetch("/api/config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    geminiApiKey: apiKey,
                    globalAiEnabled: aiEnabled
                })
            });

            if (res.ok) {
                setMessage("✅ Configuración guardada correctamente");
            } else {
                setMessage("❌ Hubo un error al guardar");
            }
        } catch (err) {
            setMessage("❌ Hubo un error al conectar con el servidor.");
        } finally {
            setIsSaving(false);
            setTimeout(() => setMessage(""), 3000);
        }
    };

    if (isLoading) return <div className="p-8 text-center text-zinc-400 font-sans bg-zinc-950 min-h-screen">Cargando configuración...</div>;

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-50 p-6 font-sans">
            <div className="max-w-2xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Settings className="text-emerald-500" />
                        Configuración del Copiloto
                    </h1>
                    <p className="text-zinc-400 mt-2">
                        Ajusta los parámetros principales de la Inteligencia Artificial y la conexión.
                    </p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-6">
                    <form onSubmit={handleSave} className="space-y-6">

                        {/* Clave de API de Gemini */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300 block">
                                Clave API de Google AI Studio (Gemini Pro)
                            </label>
                            <div className="flex flex-col gap-2">
                                <input
                                    type="password"
                                    required
                                    placeholder="AIzaSy..."
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                />
                                <p className="text-xs text-zinc-500 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    Consigue tu clave en aistudio.google.com de forma gratuita.
                                </p>
                            </div>
                        </div>

                        {/* Interruptor Global IA */}
                        <div className="space-y-3 pt-4 border-t border-zinc-800">
                            <div>
                                <h3 className="text-sm font-medium text-zinc-300">Activar Asistente (Interruptor Global)</h3>
                                <p className="text-xs text-zinc-500">
                                    Si desactivas esto, la IA dejará de responder a <strong>todos</strong> los mensajes entrantes temporalmente.
                                </p>
                            </div>
                            <label className="flex items-center cursor-pointer">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={aiEnabled}
                                        onChange={(e) => setAiEnabled(e.target.checked)}
                                    />
                                    <div className={`block w-14 h-8 rounded-full transition-colors ${aiEnabled ? 'bg-emerald-600' : 'bg-zinc-700'}`}></div>
                                    <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${aiEnabled ? 'transform translate-x-3' : ''}`}></div>
                                </div>
                                <div className="ml-3 text-sm font-medium text-zinc-300">
                                    {aiEnabled ? "Cerebro IA Activo" : "Cerebro IA en Pausa"}
                                </div>
                            </label>
                        </div>

                        <div className="pt-6">
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 transition-colors px-6 py-3 rounded-xl font-medium shadow-lg w-full md:w-auto ml-auto"
                            >
                                <Save className="w-5 h-5" /> {isSaving ? "Guardando..." : "Guardar Cambios"}
                            </button>
                        </div>
                    </form>

                    {message && (
                        <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-center font-medium animate-in fade-in">
                            {message}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
