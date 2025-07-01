// src/controllers/chamadosController.ts
import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import {
    criarChamadoSchema,
    atualizarChamadoSchema,
    filtrosChamadoSchema,
    paginacaoSchema,
    validarDados
} from '../utils/validations';
import { criarErro } from '../middleware/errorHandler';
import { StatusChamado, ChamadoResponse, RespostaPaginada } from '../types';

const prisma = new PrismaClient();

export class ChamadosController {
    // Criar novo chamado
    static async criar(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.usuario) {
                throw criarErro('Usuário não autenticado', 401, 'USER_NOT_AUTHENTICATED');
            }

            const dadosValidados = validarDados(criarChamadoSchema, req.body);

            const chamado = await prisma.chamado.create({
                data: {
                    ...dadosValidados,
                    criadorId: req.usuario.id
                },
                include: {
                    criador: {
                        select: {
                            id: true,
                            nome: true,
                            email: true,
                            departamento: true
                        }
                    },
                    atribuido: {
                        select: {
                            id: true,
                            nome: true,
                            email: true,
                            departamento: true
                        }
                    }
                }
            });

            // Registrar ação no histórico
            await prisma.historicoAcao.create({
                data: {
                    acao: 'CRIADO',
                    detalhes: `Chamado criado com prioridade ${chamado.prioridade}`,
                    chamadoId: chamado.id,
                    usuarioId: req.usuario.id
                }
            });

            // Emitir evento via Socket.IO
            if (req.io) {
                req.io.emit('chamado:criado', chamado);
            }

            res.status(201).json({
                mensagem: 'Chamado criado com sucesso',
                dados: chamado
            });
        } catch (error) {
            next(error);
        }
    }

    // Listar chamados com filtros e paginação
    static async listar(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.usuario) {
                throw criarErro('Usuário não autenticado', 401, 'USER_NOT_AUTHENTICATED');
            }

            const filtros = validarDados(filtrosChamadoSchema, req.query);
            const paginacao = validarDados(paginacaoSchema, req.query);

            // Construir where clause
            const where: any = {};

            if (filtros.status) where.status = filtros.status;
            if (filtros.prioridade) where.prioridade = filtros.prioridade;
            if (filtros.categoria) where.categoria = { contains: filtros.categoria };
            if (filtros.criadorId) where.criadorId = filtros.criadorId;
            if (filtros.atribuidoId) where.atribuidoId = filtros.atribuidoId;

            if (filtros.dataInicio || filtros.dataFim) {
                where.criadoEm = {};
                if (filtros.dataInicio) where.criadoEm.gte = new Date(filtros.dataInicio);
                if (filtros.dataFim) where.criadoEm.lte = new Date(filtros.dataFim);
            }

            // Construir orderBy
            const orderBy: any = {};
            if (paginacao.ordenarPor) {
                orderBy[paginacao.ordenarPor] = paginacao.ordem;
            } else {
                orderBy.criadoEm = paginacao.ordem;
            }

            // Garantir valores padrão para paginação
            const pagina = paginacao.pagina || 1;
            const limite = paginacao.limite || 10;

            // Executar consultas
            const [chamados, total] = await Promise.all([
                prisma.chamado.findMany({
                    where,
                    include: {
                        criador: {
                            select: {
                                id: true,
                                nome: true,
                                email: true,
                                departamento: true
                            }
                        },
                        atribuido: {
                            select: {
                                id: true,
                                nome: true,
                                email: true,
                                departamento: true
                            }
                        },
                        _count: {
                            select: {
                                comentarios: true
                            }
                        }
                    },
                    orderBy,
                    skip: (pagina - 1) * limite,
                    take: limite
                }),
                prisma.chamado.count({ where })
            ]);

            const totalPaginas = Math.ceil(total / limite);

            const resposta: RespostaPaginada<ChamadoResponse> = {
                dados: chamados as any,
                total,
                pagina,
                totalPaginas
            };

            res.json({
                mensagem: 'Chamados listados com sucesso',
                dados: resposta
            });
        } catch (error) {
            next(error);
        }
    }

    // Obter chamado por ID
    static async obterPorId(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;

            const chamado = await prisma.chamado.findUnique({
                where: { id },
                include: {
                    criador: {
                        select: {
                            id: true,
                            nome: true,
                            email: true,
                            departamento: true
                        }
                    },
                    atribuido: {
                        select: {
                            id: true,
                            nome: true,
                            email: true,
                            departamento: true
                        }
                    },
                    comentarios: {
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
                    },
                    historicoAcoes: {
                        include: {
                            usuario: {
                                select: {
                                    id: true,
                                    nome: true,
                                    email: true
                                }
                            }
                        },
                        orderBy: {
                            criadoEm: 'desc'
                        }
                    }
                }
            });

            if (!chamado) {
                throw criarErro('Chamado não encontrado', 404, 'CHAMADO_NOT_FOUND');
            }

            res.json({
                mensagem: 'Chamado obtido com sucesso',
                dados: chamado
            });
        } catch (error) {
            next(error);
        }
    }

    // Atualizar chamado
    static async atualizar(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.usuario) {
                throw criarErro('Usuário não autenticado', 401, 'USER_NOT_AUTHENTICATED');
            }

            const { id } = req.params;
            const dadosValidados = validarDados(atualizarChamadoSchema, req.body);

            // Verificar se o chamado existe
            const chamadoExistente = await prisma.chamado.findUnique({
                where: { id },
                select: { id: true, status: true, criadorId: true }
            });

            if (!chamadoExistente) {
                throw criarErro('Chamado não encontrado', 404, 'CHAMADO_NOT_FOUND');
            }

            // Verificar permissões (apenas o criador ou admin pode atualizar)
            const isAdmin = ['admin', 'administrador', 'gerente', 'supervisor'].some(cargo =>
                req.usuario!.cargo.toLowerCase().includes(cargo)
            );

            if (chamadoExistente.criadorId !== req.usuario.id && !isAdmin) {
                throw criarErro('Sem permissão para atualizar este chamado', 403, 'INSUFFICIENT_PERMISSIONS');
            }

            // Atualizar chamado
            const chamadoAtualizado = await prisma.chamado.update({
                where: { id },
                data: {
                    ...dadosValidados,
                    ...(dadosValidados.status === StatusChamado.RESOLVIDO && {
                        resolvidoEm: new Date()
                    })
                },
                include: {
                    criador: {
                        select: {
                            id: true,
                            nome: true,
                            email: true,
                            departamento: true
                        }
                    },
                    atribuido: {
                        select: {
                            id: true,
                            nome: true,
                            email: true,
                            departamento: true
                        }
                    }
                }
            });

            // Registrar alterações no histórico
            const alteracoes = [];
            if (dadosValidados.status && dadosValidados.status !== chamadoExistente.status) {
                alteracoes.push(`Status alterado para ${dadosValidados.status}`);
            }
            if (dadosValidados.titulo) alteracoes.push('Título atualizado');
            if (dadosValidados.descricao) alteracoes.push('Descrição atualizada');
            if (dadosValidados.prioridade) alteracoes.push(`Prioridade alterada para ${dadosValidados.prioridade}`);
            if (dadosValidados.atribuidoId) alteracoes.push('Chamado reatribuído');

            if (alteracoes.length > 0) {
                await prisma.historicoAcao.create({
                    data: {
                        acao: 'ATUALIZADO',
                        detalhes: alteracoes.join(', '),
                        chamadoId: id,
                        usuarioId: req.usuario.id
                    }
                });
            }

            // Emitir eventos via Socket.IO
            if (req.io) {
                req.io.emit('chamado:atualizado', chamadoAtualizado);

                if (dadosValidados.status && dadosValidados.status !== chamadoExistente.status) {
                    req.io.emit('chamado:status-alterado', {
                        chamadoId: id,
                        novoStatus: dadosValidados.status,
                        alteradoPor: req.usuario.nome
                    });
                }
            }

            res.json({
                mensagem: 'Chamado atualizado com sucesso',
                dados: chamadoAtualizado
            });
        } catch (error) {
            next(error);
        }
    }

    // Deletar chamado
    static async deletar(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.usuario) {
                throw criarErro('Usuário não autenticado', 401, 'USER_NOT_AUTHENTICATED');
            }

            const { id } = req.params;

            // Verificar se o chamado existe
            const chamado = await prisma.chamado.findUnique({
                where: { id },
                select: { id: true, criadorId: true, titulo: true }
            });

            if (!chamado) {
                throw criarErro('Chamado não encontrado', 404, 'CHAMADO_NOT_FOUND');
            }

            // Verificar permissões (apenas admin pode deletar)
            const isAdmin = ['admin', 'administrador', 'gerente', 'supervisor'].some(cargo =>
                req.usuario!.cargo.toLowerCase().includes(cargo)
            );

            if (!isAdmin) {
                throw criarErro('Sem permissão para deletar chamados', 403, 'INSUFFICIENT_PERMISSIONS');
            }

            // Deletar chamado (cascade irá deletar comentários, histórico e anexos)
            await prisma.chamado.delete({
                where: { id }
            });

            res.json({
                mensagem: 'Chamado deletado com sucesso'
            });
        } catch (error) {
            next(error);
        }
    }

    // Atribuir chamado a um usuário
    static async atribuir(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.usuario) {
                throw criarErro('Usuário não autenticado', 401, 'USER_NOT_AUTHENTICATED');
            }

            const { id } = req.params;
            const { atribuidoId } = req.body;

            // Verificar se o usuário a ser atribuído existe
            if (atribuidoId) {
                const usuarioAtribuido = await prisma.usuario.findUnique({
                    where: { id: atribuidoId },
                    select: { id: true, ativo: true }
                });

                if (!usuarioAtribuido || !usuarioAtribuido.ativo) {
                    throw criarErro('Usuário para atribuição não encontrado ou inativo', 404, 'USER_NOT_FOUND');
                }
            }

            // Atualizar chamado
            const chamadoAtualizado = await prisma.chamado.update({
                where: { id },
                data: {
                    atribuidoId: atribuidoId || null,
                    status: atribuidoId ? StatusChamado.EM_ANDAMENTO : StatusChamado.ABERTO
                },
                include: {
                    criador: {
                        select: {
                            id: true,
                            nome: true,
                            email: true,
                            departamento: true
                        }
                    },
                    atribuido: {
                        select: {
                            id: true,
                            nome: true,
                            email: true,
                            departamento: true
                        }
                    }
                }
            });

            // Registrar no histórico
            const acao = atribuidoId ? 'ATRIBUIDO' : 'DESATRIBUIDO';
            const detalhes = atribuidoId
                ? `Chamado atribuído para ${chamadoAtualizado.atribuido?.nome}`
                : 'Chamado desatribuído';

            await prisma.historicoAcao.create({
                data: {
                    acao,
                    detalhes,
                    chamadoId: id,
                    usuarioId: req.usuario.id
                }
            });

            // Emitir evento via Socket.IO
            if (req.io) {
                req.io.emit('chamado:atualizado', chamadoAtualizado);
            }

            res.json({
                mensagem: atribuidoId ? 'Chamado atribuído com sucesso' : 'Chamado desatribuído com sucesso',
                dados: chamadoAtualizado
            });
        } catch (error) {
            next(error);
        }
    }
}