"use client";

import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import QRCode from "react-qr-code";
import { Loader2, Smartphone, CheckCircle2 } from "lucide-react";

export default function Home() {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [status, setStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const [socketConnected, setSocketConnected] = useState(false);

  useEffect(() => {
    // Conectar al servidor Socket.IO (mismo host, puerto 3000)
    const socket = io(window.location.origin, {
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      setSocketConnected(true);
      setStatus("connecting");
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
      setStatus("disconnected");
    });

    socket.on("qr", (qr) => {
      setQrCode(qr);
      setStatus("disconnected");
    });

    socket.on("authenticated", () => {
      setQrCode(null);
    });

    socket.on("ready", () => {
      setStatus("connected");
      setQrCode(null);
    });

    socket.on("disconnected", () => {
      setStatus("disconnected");
      setQrCode(null);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-zinc-950 text-zinc-50 font-sans">
      <div className="w-full max-w-md border border-zinc-800 bg-zinc-900 rounded-2xl shadow-2xl p-6">
        <div className="text-center pb-6">
          <h2 className="text-2xl font-bold flex items-center justify-center gap-2 m-0">
            <Smartphone className="w-6 h-6 text-emerald-500" />
            WhatsApp Copilot
          </h2>
          <p className="text-zinc-400 text-sm mt-2">
            Vincula tu WhatsApp para activar el asistente de IA
          </p>
        </div>
        <div className="flex flex-col items-center justify-center min-h-[300px]">
          {!socketConnected ? (
            <div className="flex flex-col items-center gap-4 text-zinc-500">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p>Conectando al servidor...</p>
            </div>
          ) : status === "connected" ? (
            <div className="flex flex-col items-center gap-4 text-emerald-500 text-center animate-in fade-in zoom-in duration-500">
              <CheckCircle2 className="w-16 h-16" />
              <div>
                <h3 className="text-xl font-bold text-zinc-100">Bot Conectado y Listo</h3>
                <p className="text-zinc-400 mt-1">Tu Copiloto de IA está activo y escuchando.</p>
              </div>
            </div>
          ) : qrCode ? (
            <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in">
              <div className="bg-white p-4 rounded-xl shadow-inner">
                <QRCode value={qrCode} size={200} />
              </div>
              <div className="text-center space-y-2">
                <p className="text-sm font-medium text-zinc-300">
                  Abre WhatsApp en tu teléfono
                </p>
                <ol className="text-xs text-zinc-500 text-left list-decimal list-inside space-y-1">
                  <li>Toca el Menú ⋮ o Configuración ⚙️</li>
                  <li>Selecciona Dispositivos Vinculados</li>
                  <li>Toca en Vincular un Dispositivo</li>
                  <li>Apunta tu teléfono a esta pantalla</li>
                </ol>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 text-zinc-400">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
              <p>Generando Código QR...</p>
            </div>
          )}

          <div className="mt-8 w-full border-t border-zinc-800 pt-4 flex justify-between items-center text-xs text-zinc-500">
            <span>Estado:</span>
            <span
              className={`px-2 py-1 rounded-full border ${status === "connected" ? "border-emerald-500 text-emerald-500 bg-emerald-500/10" :
                status === "connecting" ? "border-amber-500 text-amber-500 bg-amber-500/10" :
                  "border-zinc-700 text-zinc-400 bg-zinc-800"
                }`}
            >
              {status === "connected" ? "CONECTADO" : status === "connecting" ? "CONECTANDO" : "DESCONECTADO"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
