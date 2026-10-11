import fs from 'node:fs';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { config, emProducao } from './config.js';
import { obterBanco } from './db/index.js';
import { verificarErp } from './erp/cliente.js';
import { rotaNaoEncontrada, tratarErros } from './middleware/erros.js';
import { identificarRequisicao, registrarAcesso } from './middleware/requisicao.js';
import { rotasAuth } from './routes/auth.js';
import { rotasCarrinho } from './routes/carrinho.js';
import { rotasCatalogo } from './routes/catalogo.js';
import { rotasEnderecos } from './routes/enderecos.js';
import { rotasImagens } from './routes/imagens.js';
import { rotasPedidos } from './routes/pedidos.js';
import { rotasPerfil } from './routes/perfil.js';

export function criarApp() {
  const app = express();

  app.set('trust proxy', true);
  app.disable('x-powered-by');

  // O front roda em outra porta durante o desenvolvimento e estava dando erro
  // de CORS no preflight. Refletir a origem da requisicao resolve em qualquer
  // porta, sem precisar ficar ajustando a lista a cada ambiente.
  app.use(cors({ origin: true, credentials: true }));

  app.use(identificarRequisicao);
  app.use(registrarAcesso);
  app.use(express.json({ limit: '128kb' }));
  app.use(cookieParser());

  app.get('/api/health', async (_req, res) => {
    obterBanco().prepare('SELECT 1').get();

    res.json({
      status: 'ok',
      ambiente: config.ambiente,
      erp: await verificarErp(),
      uptime_s: Math.round(process.uptime()),
      horario: new Date().toISOString(),
    });
  });

  // Publicas: da para navegar na loja sem conta.
  app.use('/api/catalogo', rotasCatalogo);
  app.use('/api/imagens', rotasImagens);
  app.use('/api/auth', rotasAuth);

  // Exigem sessao (o autenticar fica dentro de cada router).
  app.use('/api/perfil', rotasPerfil);
  app.use('/api/enderecos', rotasEnderecos);
  app.use('/api/carrinho', rotasCarrinho);
  app.use('/api/pedidos', rotasPedidos);

  /**
   * Em producao o backend tambem entrega o front ja buildado. Uma porta so,
   * sem CORS e sem nginx precisando rotear dois upstreams.
   */
  const distFront = path.resolve(config.raizProjeto, '../frontend/dist');

  if (emProducao && fs.existsSync(distFront)) {
    app.use(express.static(distFront, { index: false, maxAge: '1h' }));

    // Fallback do React Router: qualquer caminho que nao seja /api devolve o
    // index.html para o roteamento acontecer no navegador.
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
      res.sendFile(path.join(distFront, 'index.html'));
    });
  }

  app.use(rotaNaoEncontrada);
  app.use(tratarErros);

  return app;
}
