import { Router } from 'express';
import { autenticar } from '../middleware/autenticacao.js';
import { ApiError } from '../lib/ApiError.js';
import { ColetorDeErros, exigirObjeto, textoObrigatorio, textoOpcional } from '../lib/validacao.js';
import { validarInclusaoDeItem, validarQuantidadeDoItem } from './validarItemCarrinho.js';
import {
  adicionarItemNoCarrinho,
  alterarQuantidadeNoCarrinho,
  apagarCarrinho,
  ativarCarrinho,
  criarCarrinho,
  lerItens,
  limparItens,
  listarCarrinhos,
  removerItemNoCarrinho,
  renomearCarrinho,
} from '../services/carrinhoService.js';

export const rotasCarrinhos = Router();

rotasCarrinhos.use(autenticar);

function idDoCarrinho(valor) {
  const numero = Number(valor);
  if (!Number.isSafeInteger(numero) || numero < 1) {
    throw ApiError.naoEncontrado('Carrinho nao encontrado.');
  }
  return numero;
}

function nomeParaCriar(corpo) {
  const erros = new ColetorDeErros();
  const nome = textoOpcional(corpo.nome, 'nome', erros, { max: 40 });
  erros.lancarSeInvalido('Nao foi possivel criar o carrinho.');
  return nome;
}

function nomeParaRenomear(corpo) {
  const erros = new ColetorDeErros();
  const nome = textoObrigatorio(corpo.nome, 'nome', erros, { min: 1, max: 40 });
  erros.lancarSeInvalido('Nao foi possivel renomear o carrinho.');
  return nome;
}

rotasCarrinhos.get('/', (req, res) => {
  res.json({ dados: listarCarrinhos(req.usuario.id) });
});

rotasCarrinhos.post('/', (req, res) => {
  const nome = nomeParaCriar(exigirObjeto(req.body));
  res.status(201).json({ dados: criarCarrinho(req.usuario.id, nome) });
});

rotasCarrinhos.post('/:id/ativar', (req, res) => {
  ativarCarrinho(req.usuario.id, idDoCarrinho(req.params.id));
  res.json({ dados: listarCarrinhos(req.usuario.id) });
});

rotasCarrinhos.post('/:id/itens', async (req, res) => {
  const id = idDoCarrinho(req.params.id);
  const { codigo, quantidade } = validarInclusaoDeItem(exigirObjeto(req.body));
  res.status(201).json({ dados: await adicionarItemNoCarrinho(req.usuario.id, id, codigo, quantidade) });
});

rotasCarrinhos.patch('/:id/itens/:codigo', async (req, res) => {
  const id = idDoCarrinho(req.params.id);
  const quantidade = validarQuantidadeDoItem(exigirObjeto(req.body));
  res.json({
    dados: await alterarQuantidadeNoCarrinho(req.usuario.id, id, req.params.codigo, quantidade),
  });
});

rotasCarrinhos.delete('/:id/itens/:codigo', async (req, res) => {
  const id = idDoCarrinho(req.params.id);
  res.json({ dados: await removerItemNoCarrinho(req.usuario.id, id, req.params.codigo) });
});

rotasCarrinhos.delete('/:id/itens', async (req, res) => {
  const id = idDoCarrinho(req.params.id);
  limparItens(req.usuario.id, id);
  res.json({ dados: await lerItens(req.usuario.id, id) });
});

rotasCarrinhos.get('/:id', async (req, res) => {
  res.json({ dados: await lerItens(req.usuario.id, idDoCarrinho(req.params.id)) });
});

rotasCarrinhos.patch('/:id', (req, res) => {
  const id = idDoCarrinho(req.params.id);
  const nome = nomeParaRenomear(exigirObjeto(req.body));
  res.json({ dados: renomearCarrinho(req.usuario.id, id, nome) });
});

rotasCarrinhos.delete('/:id', (req, res) => {
  apagarCarrinho(req.usuario.id, idDoCarrinho(req.params.id));
  res.json({ dados: listarCarrinhos(req.usuario.id) });
});
