import { Server as SocketIOServer } from 'socket.io';

declare module 'express-serve-static-core' {
    interface Request {
        io: SocketIOServer;
    }
}

declare namespace Express {
    export interface Request {
        usuario?: any
        io?: any
    }
} 