import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { config } from '../config.js';

let instancia = null;

export function obterBanco() {
  if (instancia) return instancia;

  fs.mkdirSync(path.dirname(config.caminhoBanco), { recursive: true });
  instancia = new Database(config.caminhoBanco);

  instancia.pragma('journal_mode = WAL');
  instancia.pragma('foreign_keys = ON');
  instancia.pragma('busy_timeout = 5000');

  return instancia;
}

const VERSOES = [
  { versao: 1, arquivo: new URL('./schema.sql', import.meta.url) },
  { versao: 2, arquivo: new URL('./migracoes/002_carrinhos.sql', import.meta.url) },
  { versao: 3, arquivo: new URL('./migracoes/003_status_carrinho.sql', import.meta.url) },
];

/**
 * SQL e user_version entram na mesma transacao. O commit grava os dois
 * juntos: se o processo cair antes, a migracao nao fica aplicada com a
 * versao antiga. Se o SQL falhar, a transacao desfaz as tabelas e a
 * versao nao avanca.
 */
export function aplicarVersao(db, versao, sql) {
  const transacao = db.transaction(() => {
    db.exec(sql);
    db.pragma(`user_version = ${versao}`);
  });

  transacao();
}

export function aplicarSchema(db = obterBanco()) {
  // Fora de transacao: o PRAGMA foreign_keys nao muda no meio de uma.
  db.pragma('foreign_keys = ON');

  for (const etapa of VERSOES) {
    if (db.pragma('user_version', { simple: true }) >= etapa.versao) continue;

    const sql = fs.readFileSync(etapa.arquivo, 'utf8');
    aplicarVersao(db, etapa.versao, sql);
  }
}

export function fecharBanco() {
  if (instancia) {
    instancia.close();
    instancia = null;
  }
}

export function agoraISO() {
  return new Date().toISOString();
}
