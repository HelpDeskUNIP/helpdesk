// src/controllers/comentariosController.ts
import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { criarComentarioSchema, validarDados } from '../utils/validations';
import { criarErro } from '../middleware/errorHandler';

const prisma = new PrismaClient();

export class ComentariosController {
    // Criar novo comentário
    static async criar(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.usuario) {
                throw criarErro('Usuário não autenticado', 401, 'USER_NOT_AUTHENTICATED');
            }

            const dadosValidados = validarDados(criarComentarioSchema, req.body);

            // Verificar se o chamado existe
            const chamado = await prisma.chamado.findUnique({
                where: { id: dadosValidados.chamadoId },
                select: { id: true, titulo: true }
            });

            if (!chamado) {
                throw criarErro('Chamado não encontrado', 404, 'CHAMADO_NOT_FOUND');
            }

            // Criar comentário
            const comentario = await prisma.comentario.create({
                data: {
                    conteudo: dadosValidados.conteudo,
                    chamadoId: dadosValidados.chamadoId,
                    autorId: req.usuario.id
                },
                include: {
                    autor: {
                        select: {
                            id: true,
                            nome: true,
                            email: true
                        }
                    }
                }
            });

            // Registrar no histórico do chamado
            await prisma.historicoAcao.create({
                data: {
                    acao: 'COMENTARIO_ADICIONADO',
                    detalhes: 'Novo comentário adicionado',
                    chamadoId: dadosValidados.chamadoId,
                    usuarioId: req.usuario.id
                }
            });

            // Emitir evento via Socket.IO
            if (req.io) {
                req.io.emit('chamado:comentario', {
                    ...comentario,
                    chamadoId: dadosValidados.chamadoId
                });
            }

            res.status(201).json({
                mensagem: 'Comentário criado com sucesso',
                dados: comentario
            });
        } catch (error) {
            next(error);
        }
    }

    // Listar comentários de um chamado
    static async listarPorChamado(req: Request, res: Response, next: NextFunction) {
        try {
            const { chamadoId } = req.params;

            // Verificar se o chamado existe
            const chamado = await prisma.chamado.findUnique({
                where: { id: chamadoId },
                select: { id: true }
            });

            if (!chamado) {
                throw criarErro('Chamado não encontrado', 404, 'CHAMADO_NOT_FOUND');
            }

            // Buscar comentários
            const comentarios = await prisma.comentario.findMany({
                where: { chamadoId },
                include: {
                    autor: {
                        select: {
                            id: true,
                            nome: true,
                            email: true
                        }
                    }
                },
                orderBy: {
                    criadoEm: 'asc'
                }
            });

            res.json({
                mensagem: 'Comentários listados com sucesso',
                dados: comentarios
            });
        } catch (error) {
            next(error);
        }
    }

    // Atualizar comentário
    static async atualizar(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.usuario) {
                throw criarErro('Usuário não autenticado', 401, 'USER_NOT_AUTHENTICATED');
            }

            const { id } = req.params;
            const { conteudo } = req.body;

            if (!conteudo || conteudo.trim().length === 0) {
                throw criarErro('Conteúdo do comentário é obrigatório', 400, 'CONTENT_REQUIRED');
            }

            if (conteudo.length > 2000) {
                throw criarErro('Conteúdo deve ter no máximo 2000 caracteres', 400, 'CONTENT_TOO_LONG');
            }

            // Verificar se o comentário existe e pertence ao usuário
            const comentario = await prisma.comentario.findUnique({
                where: { id },
                select: {
                    id: true,
                    autorId: true,
                    chamadoId: true,
                    criadoEm: true
                }
            });

            if (!comentario) {
                throw criarErro('Comentário não encontrado', 404, 'COMENTARIO_NOT_FOUND');
            }

            // Verificar se o usuário é o autor ou admin
            const isAdmin = ['admin', 'administrador', 'gerente', 'supervisor'].some(cargo =>
                req.usuario!.cargo.toLowerCase().includes(cargo)
            );

            if (comentario.autorId !== req.usuario.id && !isAdmin) {
                throw criarErro('Sem permissão para editar este comentário', 403, 'INSUFFICIENT_PERMISSIONS');
            }

            // Verificar se o comentário não é muito antigo (30 minutos para edição)
            const agora = new Date();
            const criadoHa = agora.getTime() - comentario.criadoEm.getTime();
            const trintaMinutos = 30 * 60 * 1000;

            if (criadoHa > trintaMinutos && !isAdmin) {
                throw criarErro('Comentário muito antigo para edição', 400, 'COMMENT_TOO_OLD');
            }

            // Atualizar comentário
            const comentarioAtualizado = await prisma.comentario.update({
                where: { id },
                data: { conteudo },
                include: {
                    autor: {
                        select: {
                            id: true,
                            nome: true,
                            email: true
                        }
                    }
                }
            });

            // Registrar no histórico do chamado
            await prisma.historicoAcao.create({
                data: {
                    acao: 'COMENTARIO_EDITADO',
                    detalhes: 'Comentário editado',
                    chamadoId: comentario.chamadoId,
                    usuarioId: req.usuario.id
                }
            });

            res.json({
                mensagem: 'Comentário atualizado com sucesso',
                dados: comentarioAtualizado
            });
        } catch (error) {
            next(error);
        }
    }

    // Deletar comentário
    static async deletar(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.usuario) {
                throw criarErro('Usuário não autenticado', 401, 'USER_NOT_AUTHENTICATED');
            }

            const { id } = req.params;

            // Verificar se o comentário existe
            const comentario = await prisma.comentario.findUnique({
                where: { id },
                select: {
                    id: true,
                    autorId: true,
                    chamadoId: true
                }
            });

            if (!comentario) {
                throw criarErro('Comentário não encontrado', 404, 'COMENTARIO_NOT_FOUND');
            }

            // Verificar se o usuário é o autor ou admin
            const isAdmin = ['admin', 'administrador', 'gerente', 'supervisor'].some(cargo =>
                req.usuario!.cargo.toLowerCase().includes(cargo)
            );

            if (comentario.autorId !== req.usuario.id && !isAdmin) {
                throw criarErro('Sem permissão para deletar este comentário', 403, 'INSUFFICIENT_PERMISSIONS');
            }

            // Deletar comentário
            await prisma.comentario.delete({
                where: { id }
            });

            // Registrar no histórico do chamado
            await prisma.historicoAcao.create({
                data: {
                    acao: 'COMENTARIO_DELETADO',
                    detalhes: 'Comentário deletado',
                    chamadoId: comentario.chamadoId,
                    usuarioId: req.usuario.id
                }
            });

            // Emitir evento via Socket.IO
            if (req.io) {
                req.io.emit('chamado:comentario-deletado', {
                    comentarioId: id,
                    chamadoId: comentario.chamadoId
                });
            }

            res.json({
                mensagem: 'Comentário deletado com sucesso'
            });
        } catch (error) {
            next(error);
        }
    }
}