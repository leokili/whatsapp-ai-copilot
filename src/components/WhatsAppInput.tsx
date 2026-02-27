"use client";

import React, { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { Smile, Bold, Italic, Strikethrough, Code } from "lucide-react";

// Emoji Picker con SRR desactivado
const EmojiPicker = dynamic(
    () => import("emoji-picker-react"),
    { ssr: false, loading: () => <div className="w-[300px] h-[400px] flex items-center justify-center bg-zinc-900 animate-pulse text-zinc-500 text-sm">Cargando Emojis...</div> }
);

interface WhatsAppInputProps {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    onSubmit?: () => void;
    disabled?: boolean;
    className?: string;
}

export default function WhatsAppInput({
    value,
    onChange,
    placeholder = "Escribe aquí tu mensaje.",
    onSubmit,
    disabled = false,
    className = ""
}: WhatsAppInputProps) {
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null);
    const [selectionCoords, setSelectionCoords] = useState<{ start: number, end: number } | null>(null);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const formatterRef = useRef<HTMLDivElement>(null);

    // Click outside para cerrar el emoji picker o el menú de formato
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            // Cerrar emojis
            if (showEmojiPicker && containerRef.current && !containerRef.current.contains(event.target as Node)) {
                // Prevenir que si hizo click en el picker mismo se cierre (EmojiPicker teletransporta unos nodos)
                const isEmojiNode = (event.target as Node).parentElement?.closest('.EmojiPickerReact') != null;
                if (!isEmojiNode) {
                    setShowEmojiPicker(false);
                }
            }

            // Cerrar formato si clica fuera del textarea y de la barra
            if (selectionRect &&
                textareaRef.current && !textareaRef.current.contains(event.target as Node) &&
                formatterRef.current && !formatterRef.current.contains(event.target as Node)
            ) {
                setSelectionRect(null);
                setSelectionCoords(null);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showEmojiPicker, selectionRect]);

    const handleEmojiClick = (emojiObject: any) => {
        const cursor = textareaRef.current?.selectionStart || value.length;
        const textBefore = value.substring(0, cursor);
        const textAfter = value.substring(cursor, value.length);

        onChange(textBefore + emojiObject.emoji + textAfter);

        // Restaurar foco al textarea luego de hacer clic (usando timeout corto para esperar que React actualice)
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
                textareaRef.current.setSelectionRange(cursor + emojiObject.emoji.length, cursor + emojiObject.emoji.length);
            }
        }, 10);
    };

    const handleSelect = () => {
        if (!textareaRef.current) return;
        const { selectionStart, selectionEnd } = textareaRef.current;

        if (selectionStart !== selectionEnd && selectionStart !== null && selectionEnd !== null) {
            const textContent = textareaRef.current.value.substring(selectionStart, selectionEnd);
            // Solo mostrar barra si seleccionó texto real (no solo espacios en blanco)
            if (textContent.trim().length > 0) {
                // Estrategia simplificada: Solo mostrar la barra flotante encima del textarea base (centro superior)
                // O si queres precisión real de las coordenadas del caret, NextJS requeriría el paquete 'textarea-caret' 
                // Por ahora una barra flotante general arriba del rect del contenedor sirve para el efecto
                const rect = textareaRef.current.getBoundingClientRect();
                setSelectionRect(rect);
                setSelectionCoords({ start: selectionStart, end: selectionEnd });
            } else {
                setSelectionRect(null);
                setSelectionCoords(null);
            }
        } else {
            setSelectionRect(null);
            setSelectionCoords(null);
        }
    };

    const applyFormat = (wrapper: string) => {
        if (!selectionCoords || !textareaRef.current) return;
        const { start, end } = selectionCoords;
        const selectedText = value.substring(start, end);

        // Evitar doble formateo si ya tiene los wrap
        if (selectedText.startsWith(wrapper) && selectedText.endsWith(wrapper)) {
            // Quitar wrap
            const cleanText = selectedText.substring(wrapper.length, selectedText.length - wrapper.length);
            const newText = value.substring(0, start) + cleanText + value.substring(end);
            onChange(newText);

            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.focus();
                    textareaRef.current.setSelectionRange(start, start + cleanText.length);
                }
            }, 10);

        } else {
            // Aplicar wrap
            const newText = value.substring(0, start) + wrapper + selectedText + wrapper + value.substring(end);
            onChange(newText);

            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.focus();
                    const newLength = selectedText.length + (wrapper.length * 2);
                    textareaRef.current.setSelectionRange(start, start + newLength);
                }
            }, 10);
        }

        // Mantener barra de formato viva
        handleSelect();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey && onSubmit) {
            e.preventDefault();
            onSubmit();
        }
    };

    return (
        <div className={`relative flex items-end gap-2 bg-zinc-950 border border-zinc-800 rounded-xl p-2 focus-within:border-emerald-500 transition-colors ${className}`} ref={containerRef}>

            {/* Popover Emoji */}
            {showEmojiPicker && (
                <div className="absolute bottom-full left-0 mb-4 z-50 shadow-2xl rounded-xl overflow-hidden border border-zinc-800"
                    onClick={(e) => e.stopPropagation()} // Prevenir burbujeo para que no cierre todo el form
                >
                    <EmojiPicker
                        onEmojiClick={handleEmojiClick}
                        theme={'dark' as any}
                        lazyLoadEmojis
                        searchDisabled={false}
                        skinTonesDisabled
                    />
                </div>
            )}

            {/* Bubble Formato */}
            {selectionRect && (
                <div
                    ref={formatterRef}
                    className="absolute z-40 bg-zinc-900 border border-zinc-700 shadow-xl rounded-lg py-1 px-2 flex items-center gap-1 -top-12 left-1/2 transform -translate-x-1/2 animate-in fade-in zoom-in duration-200"
                    onMouseDown={(e) => e.preventDefault()} // Prevenir perder el foco del textarea!
                >
                    <button onClick={() => applyFormat("*")} className="p-1.5 hover:bg-zinc-800 rounded text-zinc-300 hover:text-white transition-colors" title="Negrita (*texto*)">
                        <Bold className="w-4 h-4" />
                    </button>
                    <button onClick={() => applyFormat("_")} className="p-1.5 hover:bg-zinc-800 rounded text-zinc-300 hover:text-white transition-colors" title="Cursiva (_texto_)">
                        <Italic className="w-4 h-4" />
                    </button>
                    <button onClick={() => applyFormat("~")} className="p-1.5 hover:bg-zinc-800 rounded text-zinc-300 hover:text-white transition-colors" title="Tachado (~texto~)">
                        <Strikethrough className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-zinc-700 mx-1" />
                    <button onClick={() => applyFormat("```")} className="p-1.5 hover:bg-zinc-800 rounded text-zinc-300 hover:text-white transition-colors" title="Código (```texto```)">
                        <Code className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Botón Emojis */}
            <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={`p-2 rounded-lg transition-colors shrink-0 self-end mb-1
                    ${showEmojiPicker ? 'bg-emerald-500/20 text-emerald-500' : 'text-zinc-400 hover:text-emerald-500 hover:bg-zinc-900'}
                `}
                disabled={disabled}
            >
                <Smile className="w-6 h-6" />
            </button>

            {/* Textarea Reemplazo */}
            <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onSelect={handleSelect}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none resize-none py-2 min-h-[44px] max-h-[160px] overflow-y-auto"
                rows={1}
                // Auto-grow function can be injected directly via a small effect, but for simplicity we rely on native rows or CSS
                onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = `${Math.min(target.scrollHeight, 160)}px`;
                }}
            />
        </div>
    );
}

