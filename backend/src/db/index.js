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

export function aplicarSchema(db = obterBanco()) {
  const ddl = fs.readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');
  db.exec(ddl);
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
