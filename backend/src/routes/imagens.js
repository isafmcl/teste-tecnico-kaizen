import { Router } from 'express';
import * as erp from '../erp/cliente.js';
import { ApiError } from '../lib/ApiError.js';

export const rotasImagens = Router();

/**
 * GET /api/imagens/:arquivo
 *
 * Repassa a imagem do ERP. Assim o front conhece so a URL da loja e o ERP pode
 * ficar numa rede privada, sem precisar estar aberto ao navegador.
 */
rotasImagens.get('/:arquivo', async (req, res) => {
  const { arquivo } = req.params;

  // So nome simples de arquivo: corta qualquer tentativa de ../ na URL.
  if (!/^[a-z0-9-]+\.svg$/i.test(arquivo)) {
    throw ApiError.naoEncontrado('Imagem nao encontrada.');
  }

  const { tipo, fluxo } = await erp.obterImagem(arquivo);

  res.setHeader('Content-Type', tipo);
  res.setHeader('Cache-Control', 'public, max-age=604800');

  fluxo.pipe(res);
});
