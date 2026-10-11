import { Router } from 'express';
import { autenticar } from '../middleware/autenticacao.js';
import { atualizarPerfil, serializarUsuario, trocarSenha } from '../services/usuarioService.js';
import {
  ColetorDeErros,
  documento,
  exigirObjeto,
  senha,
  telefone,
  textoObrigatorio,
} from '../lib/validacao.js';

export const rotasPerfil = Router();

rotasPerfil.use(autenticar);

rotasPerfil.get('/', (req, res) => {
  res.json({ dados: serializarUsuario(req.usuario) });
});

/**
 * PATCH /api/perfil
 * E-mail nao e editavel aqui: trocar o identificador de login merece
 * confirmacao por e-mail, que esta fora do escopo.
 */
rotasPerfil.patch('/', (req, res) => {
  const corpo = exigirObjeto(req.body);
  const erros = new ColetorDeErros();

  const dados = {
    nome: textoObrigatorio(corpo.nome, 'nome', erros, { min: 3, max: 120 }),
    documento: documento(corpo.documento, 'documento', erros),
    telefone: telefone(corpo.telefone, 'telefone', erros),
  };

  erros.lancarSeInvalido('Nao foi possivel salvar o perfil.');

  res.json({ dados: serializarUsuario(atualizarPerfil(req.usuario.id, dados)) });
});

rotasPerfil.patch('/senha', async (req, res) => {
  const corpo = exigirObjeto(req.body);
  const erros = new ColetorDeErros();

  const atual = textoObrigatorio(corpo.senha_atual, 'senha_atual', erros, { min: 1, max: 200 });
  const nova = senha(corpo.nova_senha, 'nova_senha', erros);

  erros.lancarSeInvalido('Nao foi possivel trocar a senha.');

  await trocarSenha(req.usuario.id, atual, nova);
  res.json({ dados: { mensagem: 'Senha alterada.' } });
});
