"use client";

import { useState, useEffect, useRef } from "react";
import { MessageSquare, User, Bot, Send, Search, Users, Clock } from "lucide-react";

interface WhatsAppChat {
    id: string;
    name: string;
    isGroup: boolean;
    unreadCount: number;
    timestamp: number;
    picUrl?: string | null;
}

interface WhatsAppMessage {
    id: string;
    fromMe: boolean;
    body: string;
    timestamp: number;
    type: string;
}

export default function ChatPage() {
    const [chats, setChats] = useState<WhatsAppChat[]>([]);
    const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
    const [selectedChat, setSelectedChat] = useState<WhatsAppChat | null>(null);
    const [replyText, setReplyText] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const fetchChats = async () => {
        try {
            const res = await fetch("/api/whatsapp/chats");
            if (res.ok) {
                const data = await res.json();
                setChats(data.sort((a: any, b: any) => b.timestamp - a.timestamp));
            }
        } catch (error) {
            console.error("Error fetching chats", error);
        }
    };

    const fetchMessages = async (chatId: string) => {
        try {
            const res = await fetch(`/api/whatsapp/chats/${encodeURIComponent(chatId)}/messages`);
            if (res.ok) {
                const data = await res.json();
                setMessages(data);
            }
        } catch (error) {
            console.error("Error fetching messages", error);
        }
    };

    useEffect(() => {
        fetchChats();
        const interval = setInterval(fetchChats, 10000); // Actualiza lista de chats cada 10s
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (selectedChat) {
            fetchMessages(selectedChat.id);
            const interval = setInterval(() => fetchMessages(selectedChat.id), 5000); // Polling de mensajes cada 5s
            return () => clearInterval(interval);
        }
    }, [selectedChat]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const filteredChats = chats.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const handleSendDirectMessage = async () => {
        if (!selectedChat || !replyText.trim()) return;

        const targetId = selectedChat.id;
        const msg = replyText;
        setReplyText(""); // Limpiar input rápido para UX

        // Lo mandamos vía Send local en lugar de la instancia para usar los flujos y logs centralizados
        try {
            const res = await fetch("/api/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ targetId, message: msg })
            });

            if (res.ok) {
                setTimeout(() => fetchMessages(selectedChat.id), 1000);
            } else {
                alert("Error al enviar mensaje");
            }
        } catch (error) {
            alert("Error de conexión");
        }
    };

    // Función rápida para llevar el ID al programador
    const handleScheduleShortcut = () => {
        if (!selectedChat) return;
        const type = selectedChat.isGroup ? "group" : "contact";
        window.location.href = `/scheduler?targetId=${encodeURIComponent(selectedChat.id)}&type=${type}`;
    };

    return (
        <div className="h-screen bg-zinc-950 text-zinc-50 flex overflow-hidden font-sans">
            {/* Sidebar de Contactos */}
            <div className="w-80 border-r border-zinc-800 flex flex-col bg-zinc-900/50">
                <div className="p-4 border-b border-zinc-800">
                    <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                        <MessageSquare className="text-emerald-500 w-5 h-5" />
                        Chats Recientes
                    </h2>
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Buscar en tus chats de WhatsApp..."
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-emerald-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {filteredChats.length === 0 ? (
                        <div className="p-4 text-center text-zinc-500 text-sm">
                            No se encontraron chats o no estás conectado a WhatsApp.
                        </div>
                    ) : (
                        filteredChats.map(chat => {
                            return (
                                // ...
                                <button
                                    key={chat.id}
                                    onClick={() => setSelectedChat(chat)}
                                    className={`w-full text-left p-4 border-b border-zinc-800/50 hover:bg-zinc-800/50 transition-colors flex items-center gap-3 ${selectedChat?.id === chat.id ? 'bg-zinc-800' : ''}`}
                                >
                                    <div className={`w-12 h-12 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 relative ${chat.isGroup ? 'bg-indigo-900/50 text-indigo-400' : 'bg-zinc-800 text-zinc-400'}`}>
                                        {chat.picUrl ? (
                                            <img src={chat.picUrl} alt={chat.name} className="w-full h-full object-cover" />
                                        ) : (
                                            chat.isGroup ? <Users className="w-6 h-6" /> : <User className="w-6 h-6" />
                                        )}
                                        {chat.unreadCount > 0 && (
                                            <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-zinc-900">
                                                {chat.unreadCount}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <h3 className="font-medium text-sm text-zinc-200 truncate">{chat.name}</h3>
                                            {chat.timestamp ? (
                                                <span className="text-[10px] text-zinc-500 whitespace-nowrap ml-2">
                                                    {new Date(chat.timestamp * 1000).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                                </span>
                                            ) : null}
                                        </div>
                                        <p className="text-xs text-zinc-500 truncate">
                                            {chat.id}
                                        </p>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Ventana Principal de Chat */}
            <div className="flex-1 flex flex-col bg-[#0b141a]"> {/* Color de fondo estilo WhatsApp Web oscuro */}
                {selectedChat ? (
                    <>
                        {/* Cabecera del Chat */}
                        <div className="h-16 flex items-center justify-between px-6 bg-zinc-900 border-b border-zinc-800 shadow-sm z-10 w-full">
                            <div className="flex items-center">
                                <div className={`w-10 h-10 rounded-full overflow-hidden flex items-center justify-center mr-4 ${selectedChat.isGroup ? 'bg-indigo-900/50 text-indigo-400' : 'bg-zinc-800 text-zinc-400'}`}>
                                    {selectedChat.picUrl ? (
                                        <img src={selectedChat.picUrl} alt={selectedChat.name} className="w-full h-full object-cover" />
                                    ) : (
                                        selectedChat.isGroup ? <Users className="w-5 h-5" /> : <User className="w-5 h-5" />
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-zinc-100">{selectedChat.name}</h3>
                                    <p className="text-xs text-zinc-400 font-mono">{selectedChat.id.split('@')[0]}</p>
                                </div>
                            </div>

                            <button
                                onClick={handleScheduleShortcut}
                                className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 px-4 py-2 rounded-xl text-sm font-medium transition-colors border border-emerald-500/20"
                            >
                                <Clock className="w-4 h-4" />
                                Programar a este {selectedChat.isGroup ? 'Grupo' : 'Chat'}
                            </button>
                        </div>

                        {/* Área de Mensajes */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 relative">
                            {/* Fondo tipo WhatsApp con una capa para atenuar */}
                            <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" style={{ backgroundImage: "url('https://static.whatsapp.net/rsrc.php/v3/yl/r/gi_DckOUM5a.png')", backgroundRepeat: 'repeat' }}></div>
                            <div className="relative z-10 space-y-4">
                                {messages.map((msg, i) => (
                                    <div key={msg.id || i} className={`flex flex-col gap-2 ${msg.fromMe ? 'items-end' : 'items-start'}`}>
                                        <div className={`max-w-[75%] p-3 shadow-md relative rounded-lg ${msg.fromMe ? 'bg-[#005c4b] text-zinc-100 rounded-tr-none' : 'bg-[#202c33] text-zinc-100 rounded-tl-none'}`}>

                                            {msg.type !== 'chat' && msg.type !== 'interactive' && msg.type !== 'buttons_response' && msg.type !== 'list_response' ? (
                                                <div className="text-xs italic text-zinc-300 mb-1 opacity-70">
                                                    [{msg.type.toUpperCase()}]
                                                </div>
                                            ) : null}

                                            <p className="text-sm whitespace-pre-wrap">{msg.body}</p>

                                            <span className={`text-[10px] float-right mt-1 ml-4 ${msg.fromMe ? 'text-[#8596a0]' : 'text-zinc-500'}`}>
                                                {new Date(msg.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>
                        </div>

                        {/* Input de Mensaje Manual */}
                        <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex items-center gap-4">
                            <input
                                type="text"
                                placeholder={`Enviar mensaje a ${selectedChat.name}...`}
                                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 text-zinc-100"
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSendDirectMessage()}
                            />
                            <button
                                onClick={handleSendDirectMessage}
                                disabled={!replyText.trim()}
                                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 transition-colors p-3 rounded-xl flex items-center justify-center"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
                        <MessageSquare className="w-16 h-16 mb-4 opacity-50" />
                        <p className="text-lg">Selecciona un chat para ver la conversación</p>
                        <p className="text-sm mt-2 max-w-sm text-center">
                            Aquí verás los grupos y contactos activos, idéntico a WhatsApp Web.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
