import { obterBanco, agoraISO } from '../db/index.js';
import { ApiError } from '../lib/ApiError.js';
import { paraCentavos, paraReais } from '../lib/dinheiro.js';
import * as erp from '../erp/cliente.js';
import { buscarEndereco, serializarEndereco } from './enderecoService.js';
import { garantirCarrinhoAtivo, lerItens } from './carrinhoService.js';

// Dois casos de trava:
// - O processo cai no meio: nao sabemos se o ERP aceitou. A trava vence
//   em 5 minutos (risco aceito de um segundo pedido).
// - O ERP aceitou e a gravacao local falhou: fechando_em fica NULL.
//   A condicao de trava vencida exige fechando_em preenchido, entao essa
//   trava nao vence. So a reconciliacao manual libera.
const PRAZO_TRAVA_MS = 5 * 60 * 1000;

// Teto do campo observacao no SIAC. O ERP responde 422
// "Deve ter no maximo 500 caracteres". A ARQUITETURA.md nao documenta o numero.
const LIMITE_OBSERVACAO_ERP = 500;

function enderecoEmUmaLinha(e) {
  const complemento = e.complemento ? `, ${e.complemento}` : '';
  return `${e.logradouro}, ${e.numero}${complemento} - ${e.bairro}, ${e.cidade}/${e.uf} - CEP ${e.cep}`;
}

/**
 * O SIAC nao tem campo de entrega: endereco e nota vao juntos na observacao.
 * Nunca corta. Se nao couber, recusa antes de criar o pedido no ERP.
 */
function montarObservacaoErp(endereco, observacao) {
  const entrega = `Entrega: ${enderecoEmUmaLinha(endereco)}`;
  const partes = [entrega];
  if (observacao) partes.push(`Obs. do cliente: ${observacao}`);

  const texto = partes.join(' | ');
  if (texto.length <= LIMITE_OBSERVACAO_ERP) return texto;

  const reservado = entrega.length + ' | Obs. do cliente: '.length;
  const maximo = Math.max(0, LIMITE_OBSERVACAO_ERP - reservado);

  throw ApiError.naoProcessavel('Nao foi possivel fechar o pedido.', [
    {
      campo: 'observacao',
      mensagem: `Para este endereco, a observacao pode ter no maximo ${maximo} caracteres.`,
    },
  ]);
}

function travarCarrinho(usuarioId, carrinhoId, db) {
  const agora = agoraISO();
  const limite = new Date(Date.now() - PRAZO_TRAVA_MS).toISOString();
  const resultado = db.prepare(`
    UPDATE carrinhos
       SET status = 'FECHANDO', fechando_em = ?
     WHERE id = ?
       AND usuario_id = ?
       AND (status = 'ABERTO' OR (fechando_em IS NOT NULL AND fechando_em < ?))
  `).run(agora, carrinhoId, usuarioId, limite);

  if (resultado.changes > 0) return;

  const existe = db
    .prepare('SELECT id FROM carrinhos WHERE id = ? AND usuario_id = ?')
    .get(carrinhoId, usuarioId);

  if (!existe) throw ApiError.naoEncontrado('Carrinho nao encontrado.');
  throw ApiError.conflito('CARRINHO_EM_FECHAMENTO', 'Esse carrinho ja esta sendo fechado.');
}

function destravarCarrinho(usuarioId, carrinhoId, db) {
  db.prepare(`
    UPDATE carrinhos
       SET status = 'ABERTO', fechando_em = NULL
     WHERE id = ? AND usuario_id = ?
  `).run(carrinhoId, usuarioId);
}

/**
 * Fecha o pedido.
 *
 * O pedido de verdade nasce no ERP. A loja guarda so o vinculo
 * numero <-> usuario, porque o ERP conhece "Fulano, CPF X", nao "a conta
 * fulano@email.com". Sem esse vinculo nao daria para montar "meus pedidos".
 */
export async function finalizarPedido(usuario, enderecoId, observacao, carrinhoId = null, db = obterBanco()) {
  const enderecoLinha = buscarEndereco(usuario.id, enderecoId, db);
  if (!enderecoLinha) {
    throw ApiError.naoProcessavel('Nao foi possivel fechar o pedido.', [
      { campo: 'endereco_id', mensagem: 'Endereco de entrega nao encontrado.' },
    ]);
  }

  const endereco = serializarEndereco(enderecoLinha);
  const textoObservacao = montarObservacaoErp(endereco, observacao);

  const idCarrinho = carrinhoId ?? garantirCarrinhoAtivo(usuario.id, db).id;
  travarCarrinho(usuario.id, idCarrinho, db);

  let pedidoErp;
  try {
    const carrinho = await lerItens(usuario.id, idCarrinho, db);

    if (carrinho.itens.length === 0) {
      throw ApiError.conflito('CARRINHO_VAZIO', 'Seu carrinho esta vazio.');
    }

    if (!carrinho.pronto_para_checkout) {
      throw ApiError.conflito(
        'CARRINHO_COM_PENDENCIAS',
        'Alguns itens do carrinho precisam de ajuste antes de fechar o pedido.',
        carrinho.itens
          .filter((item) => !item.disponivel)
          .map((item) => ({ codigo_produto: item.codigo_produto, motivo: item.problema })),
      );
    }

    pedidoErp = await erp.criarPedido({
      cliente: { nome: usuario.nome, documento: usuario.documento },
      observacao: textoObservacao,
      itens: carrinho.itens.map((item) => ({
        codigo_produto: item.codigo_produto,
        quantidade: item.quantidade,
      })),
    });
  } catch (erro) {
    destravarCarrinho(usuario.id, idCarrinho, db);
    throw erro;
  }

  /*
   * Daqui para baixo o estoque JA foi baixado no ERP. Se a gravacao local
   * falhar, o pedido existe mas nao aparece em "meus pedidos" - por isso o log
   * abaixo carrega o numero: da para reconciliar a mao. A trava fica
   * permanente (FECHANDO com fechando_em nulo) para nao nascer um segundo pedido.
   * Resolver isso de verdade exigiria um outbox ou um endpoint de
   * cancelamento no ERP; esta anotado no README como evolucao.
   */
  try {
    db.transaction(() => {
      db.prepare(`
        INSERT INTO pedidos_usuario (
          usuario_id, numero_erp, endereco_entrega, valor_total_centavos, criado_em
        ) VALUES (?, ?, ?, ?, ?)
      `).run(
        usuario.id,
        pedidoErp.numero,
        JSON.stringify(endereco),
        paraCentavos(pedidoErp.valor_total),
        agoraISO(),
      );

      const { carrinho_ativo_id: ativo } = db
        .prepare('SELECT carrinho_ativo_id FROM usuarios WHERE id = ?')
        .get(usuario.id);
      const eraAtivo = ativo === idCarrinho;

      db.prepare('DELETE FROM carrinhos WHERE id = ? AND usuario_id = ?').run(idCarrinho, usuario.id);

      if (eraAtivo) garantirCarrinhoAtivo(usuario.id, db);
    })();
  } catch (erro) {
    console.error(
      `[pedido] ERP criou ${pedidoErp.numero} para o usuario ${usuario.id}, ` +
      'mas a gravacao local falhou. Reconciliar manualmente.',
      erro,
    );
    try {
      db.prepare(`
        UPDATE carrinhos
           SET status = 'FECHANDO', fechando_em = NULL
         WHERE id = ? AND usuario_id = ?
      `).run(idCarrinho, usuario.id);
    } catch (erroTrava) {
      console.error(
        `[pedido] Nao foi possivel tornar permanente a trava do carrinho ${idCarrinho}.`,
        erroTrava,
      );
    }
    throw erro;
  }

  return { ...pedidoErp, endereco_entrega: endereco };
}

/**
 * Lista os pedidos do usuario.
 *
 * Numero, valor e data vem do banco local; a situacao atual vem do ERP, que e
 * quem manda nisso. Sao N chamadas por pagina - com paginas de 10 e um
 * catalogo deste tamanho, compensa a simplicidade. Um volume maior pediria
 * cache ou um endpoint de consulta em lote no ERP.
 */
export async function listarPedidos(usuarioId, { pagina, tamanho }, db = obterBanco()) {
  const { total } = db
    .prepare('SELECT COUNT(*) AS total FROM pedidos_usuario WHERE usuario_id = ?')
    .get(usuarioId);

  const linhas = db
    .prepare(`
      SELECT * FROM pedidos_usuario
       WHERE usuario_id = ?
       ORDER BY id DESC
       LIMIT ? OFFSET ?
    `)
    .all(usuarioId, tamanho, (pagina - 1) * tamanho);

  const pedidos = await Promise.all(
    linhas.map(async (linha) => {
      const base = {
        numero: linha.numero_erp,
        valor_total: paraReais(linha.valor_total_centavos),
        criado_em: linha.criado_em,
        endereco_entrega: JSON.parse(linha.endereco_entrega),
      };

      try {
        const doErp = await erp.buscarPedido(linha.numero_erp);
        return {
          ...base,
          situacao: doErp?.situacao ?? 'INDISPONIVEL',
          quantidade_itens: doErp?.quantidade_itens ?? null,
        };
      } catch {
        // ERP fora do ar: mostra o que a loja sabe em vez de quebrar a pagina.
        return { ...base, situacao: 'INDISPONIVEL', quantidade_itens: null };
      }
    }),
  );

  return {
    pedidos,
    paginacao: {
      pagina,
      tamanho,
      total,
      total_paginas: Math.max(1, Math.ceil(total / tamanho)),
    },
  };
}

export async function buscarPedidoDoUsuario(usuarioId, numero, db = obterBanco()) {
  // Checa a posse ANTES de ir no ERP: trocar o numero na URL nao pode revelar
  // o pedido de outro cliente.
  const vinculo = db
    .prepare('SELECT * FROM pedidos_usuario WHERE usuario_id = ? AND UPPER(numero_erp) = ?')
    .get(usuarioId, String(numero).toUpperCase());

  if (!vinculo) {
    throw ApiError.naoEncontrado('Pedido nao encontrado.');
  }

  const pedido = await erp.buscarPedido(vinculo.numero_erp);

  if (!pedido) {
    throw ApiError.naoEncontrado('Pedido nao encontrado no sistema de estoque.');
  }

  return { ...pedido, endereco_entrega: JSON.parse(vinculo.endereco_entrega) };
}
