import { Readable } from 'node:stream';
import { config } from '../config.js';
import { ApiError } from '../lib/ApiError.js';

/**
 * Cliente HTTP do Kaizen ERP.
 *
 * Todo acesso ao catalogo e aos pedidos passa por aqui. O token do ERP vive
 * SO neste processo - o navegador nunca o ve.
 *
 * Tradução de falhas:
 *   - rede/timeout/5xx do ERP  -> 502 ERP_INDISPONIVEL (problema nosso)
 *   - 401 do ERP               -> 502 ERP_NAO_AUTORIZADO (token mal configurado,
 *                                 nao e culpa de quem esta comprando)
 *   - 404/409/422 do ERP       -> repassado como veio, porque e informacao util
 *                                 para quem esta na loja (produto sumiu, faltou
 *                                 estoque, codigo invalido)
 */

function montarUrl(caminho, parametros) {
  const url = new URL(`${config.erp.url}${caminho}`);

  for (const [chave, valor] of Object.entries(parametros ?? {})) {
    if (valor !== undefined && valor !== null && valor !== '') {
      url.searchParams.set(chave, String(valor));
    }
  }

  return url;
}

async function requisitar(caminho, { parametros, metodo = 'GET', corpo } = {}) {
  const url = montarUrl(caminho, parametros);
  let resposta;

  try {
    resposta = await fetch(url, {
      method: metodo,
      headers: {
        'X-API-Token': config.erp.token,
        Accept: 'application/json',
        ...(corpo ? { 'Content-Type': 'application/json' } : {}),
      },
      body: corpo ? JSON.stringify(corpo) : undefined,
      signal: AbortSignal.timeout(config.erp.timeoutMs),
    });
  } catch (erro) {
    const motivo = erro?.name === 'TimeoutError' ? 'tempo limite excedido' : erro?.message;
    console.error(`[erp] falha de rede em ${metodo} ${url.pathname}: ${motivo}`);

    throw new ApiError(
      502,
      'ERP_INDISPONIVEL',
      'Nao foi possivel falar com o sistema de estoque. Tente novamente em instantes.',
    );
  }

  let json = null;
  try {
    json = await resposta.json();
  } catch {
    json = null;
  }

  if (resposta.ok) return json;

  const erroErp = json?.erro ?? {};

  if (resposta.status === 401) {
    console.error('[erp] token recusado pelo ERP - confira ERP_TOKEN no .env');
    throw new ApiError(
      502,
      'ERP_NAO_AUTORIZADO',
      'A loja nao conseguiu se autenticar no sistema de estoque.',
    );
  }

  // 404, 409 e 422 carregam informacao que o cliente precisa ver.
  if ([404, 409, 422].includes(resposta.status)) {
    throw new ApiError(
      resposta.status,
      erroErp.codigo ?? 'ERP_RECUSOU',
      erroErp.mensagem ?? 'O sistema de estoque recusou a operacao.',
      erroErp.detalhes,
    );
  }

  console.error(`[erp] status ${resposta.status} em ${metodo} ${url.pathname}`, erroErp);

  throw new ApiError(
    502,
    'ERP_INDISPONIVEL',
    'O sistema de estoque respondeu de forma inesperada.',
  );
}

// ------------------------------------------------------------------ leitura --

export async function listarProdutos(filtros) {
  return requisitar('/produtos', { parametros: filtros });
}

export async function buscarProduto(codigo) {
  const json = await requisitar(`/produtos/${encodeURIComponent(codigo)}`);
  return json?.dados ?? null;
}

export async function listarCategorias() {
  const json = await requisitar('/produtos/categorias');
  return json?.dados ?? [];
}

export async function buscarPedido(numero) {
  const json = await requisitar(`/pedidos/${encodeURIComponent(numero)}`);
  return json?.dados ?? null;
}

// ------------------------------------------------------------------ escrita --

export async function criarPedido(payload) {
  const json = await requisitar('/pedidos', { metodo: 'POST', corpo: payload });
  return json?.dados ?? null;
}

// ------------------------------------------------------------------ imagens --

/**
 * Repassa a imagem do ERP. O front so conhece a URL da loja, entao o ERP pode
 * ficar numa rede privada sem ser exposto ao navegador.
 */
export async function obterImagem(arquivo) {
  const url = montarUrl(`/imagens/${encodeURIComponent(arquivo)}`);
  let resposta;

  try {
    resposta = await fetch(url, { signal: AbortSignal.timeout(config.erp.timeoutMs) });
  } catch {
    throw new ApiError(502, 'ERP_INDISPONIVEL', 'Nao foi possivel carregar a imagem.');
  }

  if (!resposta.ok) {
    throw ApiError.naoEncontrado(`Imagem nao encontrada: ${arquivo}`);
  }

  return {
    tipo: resposta.headers.get('content-type') ?? 'application/octet-stream',
    fluxo: Readable.fromWeb(resposta.body),
  };
}

// ------------------------------------------------------------------- health --

export async function verificarErp() {
  try {
    const resposta = await fetch(`${config.erp.url}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return resposta.ok ? 'ok' : `http ${resposta.status}`;
  } catch (erro) {
    return erro?.name === 'TimeoutError' ? 'timeout' : 'inacessivel';
  }
}
