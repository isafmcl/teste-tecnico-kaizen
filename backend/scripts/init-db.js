#!/usr/bin/env node
/**
 * Cria o schema da loja.
 *
 *   node scripts/init-db.js            # cria se nao existir
 *   node scripts/init-db.js --reset    # APAGA o banco e recria
 *
 * Nao ha seed de catalogo aqui: produtos vem do ERP.
 */
import fs from 'node:fs';
import { config } from '../src/config.js';
import { aplicarSchema, fecharBanco, obterBanco } from '../src/db/index.js';

if (process.argv.includes('--reset')) {
  for (const sufixo of ['', '-shm', '-wal']) {
    const caminho = `${config.caminhoBanco}${sufixo}`;
    if (fs.existsSync(caminho)) {
      fs.unlinkSync(caminho);
      console.log(`removido: ${caminho}`);
    }
  }
}

const db = obterBanco();
aplicarSchema(db);
console.log(`schema aplicado em: ${config.caminhoBanco}`);

for (const tabela of ['usuarios', 'enderecos', 'carrinho_itens', 'pedidos_usuario']) {
  const { total } = db.prepare(`SELECT COUNT(*) AS total FROM ${tabela}`).get();
  console.log(`  ${tabela}: ${total}`);
}

fecharBanco();
