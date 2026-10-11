import { ApiError } from '../lib/ApiError.js';
import { emProducao } from '../config.js';

export function rotaNaoEncontrada(req, _res, next) {
  next(ApiError.naoEncontrado(`Rota nao encontrada: ${req.method} ${req.path}`));
}

export function tratarErros(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof ApiError) {
    return res.status(err.status).json({
      erro: {
        codigo: err.codigo,
        mensagem: err.mensagem,
        ...(err.detalhes ? { detalhes: err.detalhes } : {}),
      },
      request_id: req.id,
    });
  }

  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({
      erro: { codigo: 'JSON_INVALIDO', mensagem: 'O corpo da requisicao nao e um JSON valido.' },
      request_id: req.id,
    });
  }

  if (err?.type === 'entity.too.large') {
    return res.status(413).json({
      erro: { codigo: 'PAYLOAD_GRANDE_DEMAIS', mensagem: 'Corpo da requisicao excede o limite.' },
      request_id: req.id,
    });
  }

  console.error(`[${req.id}] erro nao tratado:`, err);

  res.status(500).json({
    erro: {
      codigo: 'ERRO_INTERNO',
      mensagem: 'Erro interno no servidor.',
      ...(emProducao ? {} : { detalhes: err?.message }),
    },
    request_id: req.id,
  });
}
