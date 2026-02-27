import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import next from 'next';
import { setupWhatsAppClient } from './src/services/whatsappClient';
import { startCronJobs } from './src/services/cron';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

// cuando se usa custom server, deben proveerse hostname y port
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();
  const httpServer = createServer(server);

  // Configurar Socket.IO para comunicación en tiempo real con el panel frontend
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', async (socket) => {
    console.log('📱 Cliente conectado al Panel Web (Socket.IO)');

    // Si el cliente de WhatsApp ya está inicializado y listo, informarle al instante
    try {
      const state = await whatsapp.getState();
      if (state === 'CONNECTED') {
        socket.emit('ready', { ready: true });
      }
    } catch (e) {
      // Ignorar si el cliente aún no arrancó
    }

    socket.on('disconnect', () => {
      console.log('📱 Cliente desconectado del Panel Web');
    });
  });

  // Inicializar el cliente de WhatsApp
  console.log('🚀 Inicializando el cerebro del Copiloto, WhatsApp y Programador...');
  const whatsapp = setupWhatsAppClient(io);
  whatsapp.initialize();

  // Iniciar Cron Jobs pasando la instancia de WhatsApp
  startCronJobs(whatsapp);

  // --- Endpoints de la API Directa de WhatsApp ---

  // Obtener lista de todos los chats reales de WhatsApp
  server.get('/api/whatsapp/chats', async (req: express.Request, res: express.Response) => {
    try {
      const state = await whatsapp.getState();
      console.log(`[API] Estado de WhatsApp solicitado: ${state}`);
      // Removemos el check estricto de !== 'CONNECTED' porque a veces devuelve null o UNPAIRED_IDLE incluso estando listo
      const chats = await whatsapp.getChats();
      // Mapear lo básico y extraer la foto de perfil en paralelo
      const mappedChats = await Promise.all(chats.map(async (c: any) => {
        let picUrl = null;
        let realNumber = null;
        try {
          // Extraemos el contacto asociado al chat para ver su foto y número crudo
          const contact = await c.getContact();
          picUrl = await contact.getProfilePicUrl();
          realNumber = contact.number;
        } catch (err) {
          // Ignorar si no tiene foto o falla
        }

        return {
          id: c.id._serialized,
          name: c.name || c.id.user,
          isGroup: c.isGroup,
          unreadCount: c.unreadCount,
          timestamp: c.timestamp,
          picUrl: picUrl,
          realNumber: realNumber
        };
      }));
      res.json(mappedChats);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Fallo interno al obtener chats' });
    }
  });

  // Obtener los mensajes de un chat específico
  server.get('/api/whatsapp/chats/:chatId/messages', async (req: express.Request, res: express.Response) => {
    try {
      const chatId = req.params.chatId as string;
      const chat = await whatsapp.getChatById(chatId);
      const messages = await chat.fetchMessages({ limit: 50 });
      const mappedMessages = messages.map((m: any) => ({
        id: m.id._serialized,
        fromMe: m.fromMe,
        body: m.body,
        timestamp: m.timestamp,
        type: m.type,
      }));
      res.json(mappedMessages);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Fallo al obtener mensajes del chat' });
    }
  });

  // Next.js maneja las demás rutas web (incluyendo /_next/static/...)
  server.all('/{*path}', (req: express.Request, res: express.Response) => {
    return handle(req, res);
  });

  httpServer.listen(port, () => {
    console.log(`\n> ✅ Servidor Web y Copiloto listos en http://${hostname}:${port}`);
    console.log(`> ⏳ Esperando código QR o sesión previa de WhatsApp...\n`);
  });
}).catch((err) => {
  console.error('❌ Error al iniciar el servidor:', err);
  process.exit(1);
});
