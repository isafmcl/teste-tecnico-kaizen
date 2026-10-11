import { config, validarConfig } from './config.js';
import { aplicarSchema, fecharBanco, obterBanco } from './db/index.js';
import { verificarErp } from './erp/cliente.js';
import { criarApp } from './app.js';

try {
  validarConfig();
} catch (erro) {
  console.error(erro.message);
  process.exit(1);
}

aplicarSchema(obterBanco());

const app = criarApp();
const servidor = app.listen(config.porta, config.host, async () => {
  console.log(`Kaizen Autopecas (loja) em http://${config.host}:${config.porta} (${config.ambiente})`);
  console.log(`Banco: ${config.caminhoBanco}`);

  // Avisa na subida se o ERP esta fora: erro de configuracao aparece agora,
  // nao so quando o primeiro cliente abrir a vitrine.
  const estado = await verificarErp();
  const rotulo = estado === 'ok' ? 'ok' : `INDISPONIVEL (${estado})`;
  console.log(`ERP: ${config.erp.url} -> ${rotulo}`);
});

function encerrar(sinal) {
  console.log(`\nRecebido ${sinal}, encerrando...`);

  servidor.close(() => {
    fecharBanco();
    process.exit(0);
  });

  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => encerrar('SIGTERM'));
process.on('SIGINT', () => encerrar('SIGINT'));
