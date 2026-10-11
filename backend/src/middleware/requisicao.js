import crypto from 'node:crypto';
import { config } from '../config.js';

/**
 * Carimba cada requisicao com um id, devolvido no header X-Request-Id e no
 * corpo dos erros. Quando a outra API reclamar de um 500, esse id localiza a
 * linha exata no journalctl da EC2.
 */
export function identificarRequisicao(req, res, next) {
  req.id = req.get('x-request-id')?.trim() || crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
}

export function registrarAcesso(req, res, next) {
  const inicio = process.hrtime.bigint();

  res.on('finish', () => {
    const duracaoMs = Number(process.hrtime.bigint() - inicio) / 1e6;
    const linha = [
      new Date().toISOString(),
      req.method,
      req.originalUrl,
      res.statusCode,
      `${duracaoMs.toFixed(1)}ms`,
      req.id,
    ].join(' ');

    // Em producao sobe para o journald via systemd; local vai pro terminal.
    if (config.ambiente !== 'test') {
      console.log(linha);
    }
  });

  next();
}
