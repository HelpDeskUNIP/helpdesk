import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

import authRoutes from './routes/auth';
import chamadoRoutes from './routes/chamados';
import usuarioRoutes from './routes/usuarios';

import { errorHandler } from "./middleware/errorHandler";
import { authMiddleware } from "./middleware/auth";
import { uptime } from 'process';

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

// Middlewares globais
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/chamados', authMiddleware, chamadoRoutes);
app.use('/api/usuarios', authMiddleware, usuarioRoutes);

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

io.on('connection', (socket) => {
    console.log('Cliente conectado', socket.id);

    socket.on('Join room', (roomId: string) => {
        socket.join(roomId);
        console.log(`Cliente ${socket.id} entrou na sala ${roomId}`);
    });

    socket.on('leave room', (roomId: string) => {
        socket.leave(roomId);
        console.log(`Cliente ${socket.id} saiu da sala ${roomId}`);
    });

    socket.on('Disconnect', () => {
        console.log('Cliente desconhecido', socket.id);
    });

});

app.use(errorHandler);
const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log("Socket.IO ativo para atualização em tempo real");
});
export { io };