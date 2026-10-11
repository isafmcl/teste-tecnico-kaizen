import { Router } from 'express';
import {
  assinarToken,
  autenticar,
  definirCookieSessao,
  limparCookieSessao,
} from '../middleware/autenticacao.js';
import {
  autenticarUsuario,
  cadastrarUsuario,
  serializarUsuario,
} from '../services/usuarioService.js';
import {
  ColetorDeErros,
  documento,
  email,
  exigirObjeto,
  senha,
  telefone,
  textoObrigatorio,
} from '../lib/validacao.js';

export const rotasAuth = Router();

/** POST /api/auth/cadastro - cria a conta e ja deixa a pessoa logada. */
rotasAuth.post('/cadastro', async (req, res) => {
  const corpo = exigirObjeto(req.body);
  const erros = new ColetorDeErros();

  const dados = {
    nome: textoObrigatorio(corpo.nome, 'nome', erros, { min: 3, max: 120 }),
    email: email(corpo.email, 'email', erros),
    senha: senha(corpo.senha, 'senha', erros),
    documento: documento(corpo.documento, 'documento', erros),
    telefone: telefone(corpo.telefone, 'telefone', erros),
  };

  erros.lancarSeInvalido('Nao foi possivel criar a conta.');

  const usuario = await cadastrarUsuario(dados);

  definirCookieSessao(res, assinarToken(usuario.id));
  res.status(201).json({ dados: serializarUsuario(usuario) });
});

/** POST /api/auth/login */
rotasAuth.post('/login', async (req, res) => {
  const corpo = exigirObjeto(req.body);
  const erros = new ColetorDeErros();

  const enderecoEmail = email(corpo.email, 'email', erros);
  const texto = textoObrigatorio(corpo.senha, 'senha', erros, { min: 1, max: 200 });

  erros.lancarSeInvalido('Informe e-mail e senha.');

  const usuario = await autenticarUsuario(enderecoEmail, texto);

  definirCookieSessao(res, assinarToken(usuario.id));
  res.json({ dados: serializarUsuario(usuario) });
});

/** POST /api/auth/logout - idempotente: sem sessao tambem responde 200. */
rotasAuth.post('/logout', (_req, res) => {
  limparCookieSessao(res);
  res.json({ dados: { mensagem: 'Sessao encerrada.' } });
});

/** GET /api/auth/eu - quem esta logado. O front chama no boot. */
rotasAuth.get('/eu', autenticar, (req, res) => {
  res.json({ dados: serializarUsuario(req.usuario) });
});
