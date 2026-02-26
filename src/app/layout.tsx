import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Smartphone, BookOpen, CalendarClock, MessageSquare, Settings, MessageCircle } from "lucide-react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "WhatsApp AI Copilot",
  description: "Tu asistente personal con Inteligencia Artificial",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-zinc-950 text-zinc-50 flex h-screen overflow-hidden`}>

        {/* Sidebar Nav */}
        <aside className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col">
          <div className="p-6 border-b border-zinc-800 flex items-center gap-3">
            <div className="bg-emerald-500/10 p-2 rounded-lg">
              <MessageSquare className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight">WA Copilot</h2>
              <p className="text-xs text-zinc-400">Panel de IA</p>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            <Link
              href="/"
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-800 text-zinc-300 hover:text-emerald-400 transition-colors"
            >
              <Smartphone className="w-5 h-5" /> Escáner y Estado
            </Link>
            <Link
              href="/knowledge"
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-800 text-zinc-300 hover:text-emerald-400 transition-colors"
            >
              <BookOpen className="w-5 h-5" /> Base de Conocimiento
            </Link>
            <Link
              href="/scheduler"
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-800 text-zinc-300 hover:text-emerald-400 transition-colors"
            >
              <CalendarClock className="w-5 h-5" /> Programador
            </Link>
            <Link
              href="/chat"
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-800 text-zinc-300 hover:text-emerald-400 transition-colors"
            >
              <MessageSquare className="w-5 h-5" /> Chat en Vivo
            </Link>
            <Link
              href="/logs"
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-800 text-zinc-300 hover:text-emerald-400 transition-colors"
            >
              <MessageCircle className="w-5 h-5" /> Registros
            </Link>
            <Link
              href="/settings"
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-800 text-zinc-300 hover:text-emerald-400 transition-colors"
            >
              <Settings className="w-5 h-5" /> Ajustes
            </Link>
          </nav>

          <div className="p-4 border-t border-zinc-800 text-xs text-center text-zinc-500">
            WhatsApp AI Copilot v1.0 <br /> Powered by Gemini Pro
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>

      </body>
    </html>
  );
}
