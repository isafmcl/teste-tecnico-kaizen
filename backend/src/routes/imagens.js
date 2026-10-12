import { Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { Router } from 'express';
import * as erp from '../erp/cliente.js';
import { ApiError } from '../lib/ApiError.js';

export const rotasImagens = Router();

/**
 * GET /api/imagens/:arquivo
 *
 * Repassa a imagem do ERP. Assim o front conhece so a URL da loja e o ERP pode
 * ficar numa rede privada, sem precisar estar aberto ao navegador.
 *
 * pipeline escuta o 'error' do fluxo. pipe nao escuta: o timeout do fetch
 * (que vale durante o download) ou uma queda do ERP no meio da imagem
 * derrubaria o processo.
 */
rotasImagens.get('/:arquivo', async (req, res, next) => {
  const { arquivo } = req.params;

  // So nome simples de arquivo: corta qualquer tentativa de ../ na URL.
  if (!/^[a-z0-9-]+\.svg$/i.test(arquivo)) {
    throw ApiError.naoEncontrado('Imagem nao encontrada.');
  }

  const { tipo, fluxo } = await erp.obterImagem(arquivo);

  res.setHeader('Content-Type', tipo);
  res.setHeader('Cache-Control', 'public, max-age=604800');

  // pipeline destroi o destino quando o fluxo falha. Este gravador so
  // repassa os bytes, para a resposta HTTP continuar sob nosso controle.
  const destino = new Writable({
    write(chunk, encoding, callback) {
      res.write(chunk, encoding, callback);
    },
    final(callback) {
      res.end(callback);
    },
  });

  try {
    await pipeline(fluxo, destino);
  } catch (erro) {
    console.error(`[${req.id}] falha ao transmitir imagem ${arquivo}:`, erro);

    // Nada foi para o cliente: tira os cabecalhos da imagem (senao o 500
    // sairia como svg e com cache de uma semana) e deixa o handler padrao.
    if (!res.headersSent) {
      res.removeHeader('Content-Type');
      res.removeHeader('Cache-Control');
      next(erro);
      return;
    }

    res.destroy();
  }
});
