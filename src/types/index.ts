// src/types/index.ts
import { Request } from 'express';
import { Server } from 'socket.io';

// Extensão do Request do Express para incluir o usuário autenticado e Socket.IO
declare global {
    namespace Express {
        export interface Request {
            usuario?: {
                id: string;
                email: string;
                nome: string;
                departamento: string;
                cargo: string;
            };
            io?: Server;
        }
    }
}

// Enums
export enum Prioridade {
    BAIXA = 'BAIXA',
    MEDIA = 'MEDIA',
    ALTA = 'ALTA',
    CRITICA = 'CRITICA'
}

export enum StatusChamado {
    ABERTO = 'ABERTO',
    EM_ANDAMENTO = 'EM_ANDAMENTO',
    AGUARDANDO_RESPOSTA = 'AGUARDANDO_RESPOSTA',
    RESOLVIDO = 'RESOLVIDO',
    FECHADO = 'FECHADO',
    CANCELADO = 'CANCELADO'
}

// Tipos para DTOs (Data Transfer Objects)
export interface CriarUsuarioDTO {
    nome: string;
    email: string;
    senha: string;
    departamento: string;
    cargo: string;
}

export interface LoginDTO {
    email: string;
    senha: string;
}

export interface CriarChamadoDTO {
    titulo: string;
    descricao: string;
    prioridade: Prioridade;
    categoria: string;
}

export interface AtualizarChamadoDTO {
    titulo?: string;
    descricao?: string;
    prioridade?: Prioridade;
    status?: StatusChamado;
    categoria?: string;
    atribuidoId?: string;
}

export interface CriarComentarioDTO {
    conteudo: string;
    chamadoId: string;
}

// Tipos para respostas da API
export interface AuthResponse {
    usuario: {
        id: string;
        nome: string;
        email: string;
        departamento: string;
        cargo: string;
    };
    token: string;
}

export interface ChamadoResponse {
    id: string;
    titulo: string;
    descricao: string;
    prioridade: Prioridade;
    status: StatusChamado;
    categoria: string;
    criadoEm: Date;
    atualizadoEm: Date;
    resolvidoEm?: Date;
    criador: {
        id: string;
        nome: string;
        email: string;
        departamento: string;
    };
    atribuido?: {
        id: string;
        nome: string;
        email: string;
        departamento: string;
    };
    comentarios?: ComentarioResponse[];
}

export interface ComentarioResponse {
    id: string;
    conteudo: string;
    criadoEm: Date;
    autor: {
        id: string;
        nome: string;
        email: string;
    };
}

// Tipos para filtros e paginação
export interface FiltrosChamado {
    status?: StatusChamado;
    prioridade?: Prioridade;
    categoria?: string;
    criadorId?: string;
    atribuidoId?: string;
    dataInicio?: Date;
    dataFim?: Date;
}

export interface PaginacaoParams {
    pagina?: number;
    limite?: number;
    ordenarPor?: string;
    ordem?: 'asc' | 'desc';
}

export interface RespostaPaginada<T> {
    dados: T[];
    total: number;
    pagina: number;
    totalPaginas: number;
}

// Tipos para erros
export interface ErroAPI {
    mensagem: string;
    codigo?: string;
    detalhes?: any;
}

// Tipos para eventos do Socket.IO
export interface EventosChamado {
    'chamado:criado': ChamadoResponse;
    'chamado:atualizado': ChamadoResponse;
    'chamado:comentario': ComentarioResponse & { chamadoId: string };
    'chamado:status-alterado': {
        chamadoId: string;
        novoStatus: StatusChamado;
        alteradoPor: string;
    };
}