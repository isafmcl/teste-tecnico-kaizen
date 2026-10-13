import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import Database from 'better-sqlite3';

process.env.DB_PATH = path.join(os.tmpdir(), `kaizen-testes-nao-usar-${process.pid}.db`);
process.env.ERP_URL = 'http://127.0.0.1:9';
process.env.ERP_TOKEN = 'token-de-teste';

const { aplicarSchema, aplicarVersao } = await import('../src/db/index.js');

const schemaSql = fs.readFileSync(new URL('../src/db/schema.sql', import.meta.url), 'utf8');
const migracaoV2 = fs.readFileSync(new URL('../src/db/migracoes/002_carrinhos.sql', import.meta.url), 'utf8');

function bancoV1() {
  const db = new Database(':memory:');
  assert.equal(db.name, ':memory:');
  db.pragma('foreign_keys = ON');
  aplicarVersao(db, 1, schemaSql);

  const agora = '2026-01-01T00:00:00.000Z';
  const usuarioId = Number(db.prepare(`
    INSERT INTO usuarios (nome, email, senha_hash, documento, telefone, criado_em, atualizado_em)
    VALUES ('Cliente', 'migracao@email.com', 'x', '12345678901', null, ?, ?)
  `).run(agora, agora).lastInsertRowid);

  const itemId = Number(db.prepare(`
    INSERT INTO carrinho_itens (usuario_id, codigo_produto, quantidade, adicionado_em)
    VALUES (?, 'VELA', 3, ?)
  `).run(usuarioId, agora).lastInsertRowid);

  return { db, usuarioId, itemId };
}

test('migracao de um banco v1 preserva os itens, nao duplica ao rodar de novo e falha no meio sem alterar nada', () => {
  const sucesso = bancoV1();
  try {
    aplicarSchema(sucesso.db);
    aplicarSchema(sucesso.db);

    assert.equal(sucesso.db.pragma('user_version', { simple: true }), 3);
    assert.equal(sucesso.db.prepare('SELECT COUNT(*) AS total FROM carrinhos').get().total, 1);
    assert.deepEqual(
      sucesso.db.prepare('SELECT id, codigo_produto, quantidade FROM carrinho_itens').all(),
      [{ id: sucesso.itemId, codigo_produto: 'VELA', quantidade: 3 }],
    );
    assert.equal(
      sucesso.db.prepare('SELECT nome FROM carrinhos WHERE usuario_id = ?').get(sucesso.usuarioId).nome,
      'Meu carrinho',
    );
  } finally {
    sucesso.db.close();
  }

  const falha = bancoV1();
  try {
    const antes = falha.db.prepare('SELECT id, usuario_id, codigo_produto, quantidade FROM carrinho_itens').all();
    assert.throws(() => aplicarVersao(falha.db, 2, `${migracaoV2}\nSELECT * FROM tabela_que_nao_existe;`));

    assert.equal(falha.db.pragma('user_version', { simple: true }), 1);
    assert.equal(
      falha.db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'carrinhos'").get(),
      undefined,
    );
    assert.deepEqual(
      falha.db.prepare('SELECT id, usuario_id, codigo_produto, quantidade FROM carrinho_itens').all(),
      antes,
    );
  } finally {
    falha.db.close();
  }
});
