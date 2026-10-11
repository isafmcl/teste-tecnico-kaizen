import { Router } from 'express';
import * as erp from '../erp/cliente.js';
import { ApiError } from '../lib/ApiError.js';
import { comImagemDaLoja, listaComImagemDaLoja } from '../lib/produto.js';
import { lerBooleano, lerPaginacao } from '../lib/validacao.js';

export const rotasCatalogo = Router();

/**
 * Vitrine publica: da para navegar sem conta, so o checkout exige login.
 *
 * O token do ERP fica no servidor. O navegador fala com a loja, a loja fala
 * com o ERP - nenhum segredo chega ao cliente.
 */

/** GET /api/catalogo */
rotasCatalogo.get('/', async (req, res) => {
  const { pagina, tamanho } = lerPaginacao(req.query);

  const resposta = await erp.listarProdutos({
    busca: req.query.busca,
    categoria: req.query.categoria,
    marca: req.query.marca,
    // A loja nunca mostra produto inativo, mesmo que peçam na query.
    ativo: 'true',
    somente_disponiveis: lerBooleano(req.query.somente_disponiveis) ? 'true' : undefined,
    pagina,
    tamanho,
  });

  res.json({
    dados: listaComImagemDaLoja(resposta?.dados),
    paginacao: resposta?.paginacao,
  });
});

/** GET /api/catalogo/categorias */
rotasCatalogo.get('/categorias', async (_req, res) => {
  res.json({ dados: await erp.listarCategorias() });
});

/** GET /api/catalogo/:codigo */
rotasCatalogo.get('/:codigo', async (req, res) => {
  const produto = await erp.buscarProduto(req.params.codigo);

  if (!produto || !produto.ativo) {
    throw ApiError.naoEncontrado(`Produto nao encontrado: ${req.params.codigo}`);
  }

  res.json({ dados: comImagemDaLoja(produto) });
});
