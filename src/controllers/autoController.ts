// src/controllers/authController.ts
import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { criarUsuarioSchema, loginSchema, validarDados } from '../utils/validations';
import { criarErro } from '../middleware/errorHandler';
import type { AuthResponse } from '../types';

const prisma = new PrismaClient();

export class AuthController {
    // Registrar novo usuário
    static async registrar(req: Request, res: Response, next: NextFunction) {
        try {
            const dadosValidados = validarDados(criarUsuarioSchema, req.body);

            // Verificar se o email já existe
            const usuarioExistente = await prisma.usuario.findUnique({
                where: { email: dadosValidados.email }
            });

            if (usuarioExistente) {
                throw criarErro('Email já está em uso', 409, 'EMAIL_ALREADY_EXISTS');
            }

            // Criptografar a senha
            const senhaHash = await bcrypt.hash(dadosValidados.senha, 12);

            // Criar o usuário
            const usuario = await prisma.usuario.create({
                data: {
                    ...dadosValidados,
                    senha: senhaHash
                },
                select: {
                    id: true,
                    nome: true,
                    email: true,
                    departamento: true,
                    cargo: true,
                    criadoEm: true
                }
            });

            // Gerar token JWT
            const JWT_SECRET = process.env.JWT_SECRET;
            if (!JWT_SECRET) {
                throw criarErro('Configuração JWT não encontrada', 500, 'JWT_CONFIG_ERROR');
            }

            const token = jwt.sign(
                { id: usuario.id, email: usuario.email },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            const response: AuthResponse = {
                usuario: {
                    id: usuario.id,
                    nome: usuario.nome,
                    email: usuario.email,
                    departamento: usuario.departamento,
                    cargo: usuario.cargo
                },
                token
            };

            res.status(201).json({
                mensagem: 'Usuário criado com sucesso',
                dados: response
            });
        } catch (error) {
            next(error);
        }
    }

    // Login do usuário
    static async login(req: Request, res: Response, next: NextFunction) {
        try {
            const dadosValidados = validarDados(loginSchema, req.body);

            // Buscar usuário pelo email
            const usuario = await prisma.usuario.findUnique({
                where: { email: dadosValidados.email },
                select: {
                    id: true,
                    nome: true,
                    email: true,
                    senha: true,
                    departamento: true,
                    cargo: true,
                    ativo: true
                }
            });

            if (!usuario || !usuario.ativo) {
                throw criarErro('Credenciais inválidas', 401, 'INVALID_CREDENTIALS');
            }

            // Verificar a senha
            const senhaValida = await bcrypt.compare(dadosValidados.senha, usuario.senha);
            if (!senhaValida) {
                throw criarErro('Credenciais inválidas', 401, 'INVALID_CREDENTIALS');
            }

            // Gerar token JWT
            const JWT_SECRET = process.env.JWT_SECRET;
            if (!JWT_SECRET) {
                throw criarErro('Configuração JWT não encontrada', 500, 'JWT_CONFIG_ERROR');
            }

            const token = jwt.sign(
                { id: usuario.id, email: usuario.email },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            const response: AuthResponse = {
                usuario: {
                    id: usuario.id,
                    nome: usuario.nome,
                    email: usuario.email,
                    departamento: usuario.departamento,
                    cargo: usuario.cargo
                },
                token
            };

            res.json({
                mensagem: 'Login realizado com sucesso',
                dados: response
            });
        } catch (error) {
            next(error);
        }
    }

    // Obter perfil do usuário logado
    static async perfil(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.usuario) {
                throw criarErro('Usuário não autenticado', 401, 'USER_NOT_AUTHENTICATED');
            }

            const usuario = await prisma.usuario.findUnique({
                where: { id: req.usuario.id },
                select: {
                    id: true,
                    nome: true,
                    email: true,
                    departamento: true,
                    cargo: true,
                    ativo: true,
                    criadoEm: true,
                    atualizadoEm: true
                }
            });

            if (!usuario) {
                throw criarErro('Usuário não encontrado', 404, 'USER_NOT_FOUND');
            }

            res.json({
                mensagem: 'Perfil obtido com sucesso',
                dados: usuario
            });
        } catch (error) {
            next(error);
        }
    }

    // Alterar senha
    static async alterarSenha(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.usuario) {
                throw criarErro('Usuário não autenticado', 401, 'USER_NOT_AUTHENTICATED');
            }

            const { senhaAtual, novaSenha } = req.body;

            if (!senhaAtual || !novaSenha) {
                throw criarErro('Senha atual e nova senha são obrigatórias', 400, 'MISSING_PASSWORDS');
            }

            if (novaSenha.length < 6) {
                throw criarErro('Nova senha deve ter no mínimo 6 caracteres', 400, 'INVALID_PASSWORD_LENGTH');
            }

            // Buscar usuário com a senha atual
            const usuario = await prisma.usuario.findUnique({
                where: { id: req.usuario.id },
                select: { id: true, senha: true }
            });

            if (!usuario) {
                throw criarErro('Usuário não encontrado', 404, 'USER_NOT_FOUND');
            }

            // Verificar senha atual
            const senhaValida = await bcrypt.compare(senhaAtual, usuario.senha);
            if (!senhaValida) {
                throw criarErro('Senha atual incorreta', 400, 'INVALID_CURRENT_PASSWORD');
            }

            // Criptografar nova senha
            const novaSenhaHash = await bcrypt.hash(novaSenha, 12);

            // Atualizar senha
            await prisma.usuario.update({
                where: { id: req.usuario.id },
                data: { senha: novaSenhaHash }
            });

            res.json({
                mensagem: 'Senha alterada com sucesso'
            });
        } catch (error) {
            next(error);
        }
    }

    // Validar token
    static async validarToken(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.usuario) {
                throw criarErro('Token inválido', 401, 'INVALID_TOKEN');
            }

            res.json({
                mensagem: 'Token válido',
                dados: {
                    usuario: req.usuario
                }
            });
        } catch (error) {
            next(error);
        }
    }
}