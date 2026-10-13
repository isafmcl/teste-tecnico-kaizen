import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import dotenv from 'dotenv';

const CODIGO_PRODUTO = 'SUS-2004';

test('contrato do ERP real, somente leitura: health ok e campos do produto SUS-2004', async (t) => {
  if (process.env.ERP_REAL !== '1') {
    t.skip('Sem ERP_REAL=1 este teste nao consulta o ERP. Ele so le o health e um produto, e fica de fora do npm test.');
    return;
  }

  dotenv.config({ path: path.join(import.meta.dirname, '../.env') });
  process.env.DB_PATH = path.join(os.tmpdir(), `kaizen-contrato-nao-usar-${process.pid}.db`);

  const { buscarProduto, verificarErp } = await import('../src/erp/cliente.js');

  assert.equal(await verificarErp(), 'ok');

  const produto = await buscarProduto(CODIGO_PRODUTO);
  assert.ok(produto);

  assert.equal(typeof produto.codigo, 'string');
  assert.equal(produto.codigo.toUpperCase(), CODIGO_PRODUTO);
  assert.equal(typeof produto.descricao, 'string');
  assert.equal(typeof produto.marca, 'string');
  assert.equal(typeof produto.categoria, 'string');
  assert.equal(typeof produto.aplicacao, 'string');
  assert.equal(typeof produto.preco_unitario, 'number');
  assert.equal(Number.isFinite(produto.preco_unitario), true);
  assert.equal(typeof produto.estoque, 'number');
  assert.equal(Number.isFinite(produto.estoque), true);
  assert.equal(typeof produto.ativo, 'boolean');
  if (produto.imagem_url != null) assert.equal(typeof produto.imagem_url, 'string');
});
