// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export interface ErroCustomizado extends Error {
    statusCode?: number;
    codigo?: string;
}

export const errorHandler = (
    error: ErroCustomizado,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    console.error('Erro capturado:', error);

    // Erro de validação do Zod
    if (error instanceof ZodError) {
        return res.status(400).json({
            mensagem: 'Dados inválidos',
            codigo: 'VALIDATION_ERROR',
            detalhes: error.errors.map(err => ({
                campo: err.path.join('.'),
                mensagem: err.message
            }))
        });
    }

    // Erros do Prisma
    if (error.name === 'PrismaClientKnownRequestError') {
        const prismaError = error as any;
        switch (prismaError.code) {
            case 'P2002':
                return res.status(409).json({
                    mensagem: 'Dados duplicados. Este registro já existe.',
                    codigo: 'DUPLICATE_RECORD'
                });

            case 'P2025':
                return res.status(404).json({
                    mensagem: 'Registro não encontrado.',
                    codigo: 'RECORD_NOT_FOUND'
                });

            case 'P2003':
                return res.status(400).json({
                    mensagem: 'Violação de chave estrangeira.',
                    codigo: 'FOREIGN_KEY_VIOLATION'
                });

            default:
                return res.status(500).json({
                    mensagem: 'Erro interno do banco de dados.',
                    codigo: 'DATABASE_ERROR'
                });
        }
    }

    // Erro de conexão com o banco
    if (error.name === 'PrismaClientInitializationError') {
        return res.status(500).json({
            mensagem: 'Erro de conexão com o banco de dados.',
            codigo: 'DATABASE_CONNECTION_ERROR'
        });
    }

    // Erro de timeout
    if (error.name === 'PrismaClientRustPanicError') {
        return res.status(500).json({
            mensagem: 'Timeout na operação do banco de dados.',
            codigo: 'DATABASE_TIMEOUT'
        });
    }

    // Erro JWT
    if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
            mensagem: 'Token inválido.',
            codigo: 'INVALID_TOKEN'
        });
    }

    if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
            mensagem: 'Token expirado.',
            codigo: 'EXPIRED_TOKEN'
        });
    }

    // Erro customizado com status code
    if (error.statusCode) {
        return res.status(error.statusCode).json({
            mensagem: error.message,
            codigo: error.codigo || 'CUSTOM_ERROR'
        });
    }

    // Erro genérico
    return res.status(500).json({
        mensagem: 'Erro interno do servidor.',
        codigo: 'INTERNAL_SERVER_ERROR',
        ...(process.env.NODE_ENV === 'development' && {
            stack: error.stack
        })
    });
};

// Função para criar erros customizados
export const criarErro = (
    mensagem: string,
    statusCode: number = 500,
    codigo?: string
): ErroCustomizado => {
    const erro = new Error(mensagem) as ErroCustomizado;
    erro.statusCode = statusCode;
    erro.codigo = codigo;
    return erro;
};