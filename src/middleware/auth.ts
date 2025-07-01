import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const authMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            res.status(401).json({
                mensagem: 'Token de acesso não fornecido'
            });
            return;
        }

        const JWT_SECRET = process.env.JWT_SECRET;
        if (!JWT_SECRET) {
            throw new Error('JWT_SECRET não configurado');
        }

        const decoded = jwt.verify(token, JWT_SECRET) as {
            id: string;
            email: string;
        };

        const usuario = await prisma.usuario.findUnique({
            where: { id: decoded.id },
            select: {
                id: true,
                nome: true,
                email: true,
                departamento: true,
                cargo: true,
                ativo: true
            }
        });

        if (!usuario || !usuario.ativo) {
            res.status(401).json({
                mensagem: 'Usuário não encontrado ou inativo'
            });
            return;
        }

        req.usuario = usuario;
        next();
        return;
    } catch (error) {
        console.error('Erro na autenticação:', error);
        res.status(401).json({
            mensagem: 'Token inválido'
        });
        return;
    }
};

export const adminMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    if (!req.usuario) {
        res.status(401).json({
            mensagem: 'Usuário não autenticado'
        });
        return;
    }

    const cargosAdmin = ['admin', 'administrador', 'gerente', 'supervisor'];
    const isAdmin = cargosAdmin.some(cargo =>
        req.usuario!.cargo.toLowerCase().includes(cargo)
    );

    if (!isAdmin) {
        res.status(403).json({
            mensagem: 'Acesso negado. Privilégios de administrador necessários.'
        });
        return;
    }

    next();
    return;
};