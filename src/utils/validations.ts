// src/utils/validations.ts
import { z } from 'zod';
import { Prioridade, StatusChamado } from '../types';

// Schemas de validação para usuários
export const criarUsuarioSchema = z.object({
    nome: z.string()
        .min(2, 'Nome deve ter no mínimo 2 caracteres')
        .max(100, 'Nome deve ter no máximo 100 caracteres'),

    email: z.string()
        .email('Email inválido')
        .toLowerCase(),

    senha: z.string()
        .min(6, 'Senha deve ter no mínimo 6 caracteres')
        .max(100, 'Senha deve ter no máximo 100 caracteres'),

    departamento: z.string()
        .min(2, 'Departamento deve ter no mínimo 2 caracteres')
        .max(50, 'Departamento deve ter no máximo 50 caracteres'),

    cargo: z.string()
        .min(2, 'Cargo deve ter no mínimo 2 caracteres')
        .max(50, 'Cargo deve ter no máximo 50 caracteres')
});

export const loginSchema = z.object({
    email: z.string()
        .email('Email inválido')
        .toLowerCase(),

    senha: z.string()
        .min(1, 'Senha é obrigatória')
});

export const atualizarUsuarioSchema = z.object({
    nome: z.string()
        .min(2, 'Nome deve ter no mínimo 2 caracteres')
        .max(100, 'Nome deve ter no máximo 100 caracteres')
        .optional(),

    departamento: z.string()
        .min(2, 'Departamento deve ter no mínimo 2 caracteres')
        .max(50, 'Departamento deve ter no máximo 50 caracteres')
        .optional(),

    cargo: z.string()
        .min(2, 'Cargo deve ter no mínimo 2 caracteres')
        .max(50, 'Cargo deve ter no máximo 50 caracteres')
        .optional(),

    ativo: z.boolean().optional()
});

// Schemas de validação para chamados
export const criarChamadoSchema = z.object({
    titulo: z.string()
        .min(5, 'Título deve ter no mínimo 5 caracteres')
        .max(200, 'Título deve ter no máximo 200 caracteres'),

    descricao: z.string()
        .min(10, 'Descrição deve ter no mínimo 10 caracteres')
        .max(5000, 'Descrição deve ter no máximo 5000 caracteres'),

    prioridade: z.nativeEnum(Prioridade, {
        errorMap: () => ({ message: 'Prioridade inválida' })
    }),

    categoria: z.string()
        .min(2, 'Categoria deve ter no mínimo 2 caracteres')
        .max(50, 'Categoria deve ter no máximo 50 caracteres')
});

export const atualizarChamadoSchema = z.object({
    titulo: z.string()
        .min(5, 'Título deve ter no mínimo 5 caracteres')
        .max(200, 'Título deve ter no máximo 200 caracteres')
        .optional(),

    descricao: z.string()
        .min(10, 'Descrição deve ter no mínimo 10 caracteres')
        .max(5000, 'Descrição deve ter no máximo 5000 caracteres')
        .optional(),

    prioridade: z.nativeEnum(Prioridade, {
        errorMap: () => ({ message: 'Prioridade inválida' })
    }).optional(),

    status: z.nativeEnum(StatusChamado, {
        errorMap: () => ({ message: 'Status inválido' })
    }).optional(),

    categoria: z.string()
        .min(2, 'Categoria deve ter no mínimo 2 caracteres')
        .max(50, 'Categoria deve ter no máximo 50 caracteres')
        .optional(),

    atribuidoId: z.string().uuid('ID do usuário inválido').optional()
});

// Schemas de validação para comentários
export const criarComentarioSchema = z.object({
    conteudo: z.string()
        .min(1, 'Conteúdo é obrigatório')
        .max(2000, 'Conteúdo deve ter no máximo 2000 caracteres'),

    chamadoId: z.string().uuid('ID do chamado inválido')
});

// Schemas de validação para filtros e paginação
export const filtrosChamadoSchema = z.object({
    status: z.nativeEnum(StatusChamado).optional(),
    prioridade: z.nativeEnum(Prioridade).optional(),
    categoria: z.string().optional(),
    criadorId: z.string().uuid().optional(),
    atribuidoId: z.string().uuid().optional(),
    dataInicio: z.string().datetime().optional(),
    dataFim: z.string().datetime().optional()
});

export const paginacaoSchema = z.object({
    pagina: z.coerce.number().min(1, 'Página deve ser maior que 0').default(1),
    limite: z.coerce.number().min(1, 'Limite deve ser maior que 0').max(100, 'Limite não pode ser maior que 100').default(10),
    ordenarPor: z.string().optional(),
    ordem: z.enum(['asc', 'desc']).default('desc')
});

// Função helper para validar dados
export const validarDados = <T>(schema: z.ZodSchema<T>, dados: unknown): T => {
    return schema.parse(dados);
};