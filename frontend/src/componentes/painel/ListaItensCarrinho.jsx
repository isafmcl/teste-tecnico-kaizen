import { useState } from 'react';
import { Link } from 'react-router-dom';
import { dinheiro } from '../../api/cliente.js';
import { Alerta } from '../ui.jsx';
import { useCarrinho } from '../../contextos/CarrinhoContext.jsx';
import { metaDoAtivo, quantidadeTravada } from './metaCarrinho.js';
import { QuantidadeItem } from './QuantidadeItem.jsx';

export function ListaItensCarrinho() {
  const { carrinho, carrinhos, alterar, remover, limpar, fecharPainel } = useCarrinho();
  const fechando = metaDoAtivo(carrinhos, carrinho)?.status === 'FECHANDO';
  const [erroRemocao, setErroRemocao] = useState(null);
  const [esvaziando, setEsvaziando] = useState(false);

  async function tirar(codigo) {
    setErroRemocao(null);
    try {
      await remover(codigo);
    } catch (falha) {
      setErroRemocao({ codigo, mensagem: falha.message ?? 'Não foi possível remover a peça.' });
    }
  }

  async function esvaziar() {
    setEsvaziando(true);
    setErroRemocao(null);
    try {
      await limpar();
    } catch (falha) {
      setErroRemocao({ codigo: null, mensagem: falha.message ?? 'Não foi possível esvaziar o carrinho.' });
    } finally {
      setEsvaziando(false);
    }
  }

  if (carrinho.itens.length === 0) {
    return <p className="py-6 text-sm text-tinta-600">Seu carrinho está vazio.</p>;
  }

  return (
    <div>
      {!fechando && !carrinho.pronto_para_checkout && (
        <Alerta tipo="aviso" titulo="Alguns itens precisam de ajuste" className="mt-4">
          Ajuste ou remova os itens marcados abaixo para fechar o pedido.
        </Alerta>
      )}
      {!fechando && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={esvaziar}
            disabled={esvaziando}
            className="text-sm text-tinta-500 underline hover:text-red-700 disabled:opacity-50"
          >
            Esvaziar
          </button>
        </div>
      )}

      <ul className="divide-y divide-tinta-200">
        {carrinho.itens.map((item) => (
          <li key={item.codigo_produto} className="flex gap-4 py-4">
            <img
              src={item.imagem_url || '/imagens/generico.svg'}
              alt=""
              width="80"
              height="80"
              className="size-16 shrink-0 rounded-lg bg-tinta-100 object-contain p-1 sm:size-20"
            />

            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase text-marca-700">{item.marca}</p>
              <h3 className="truncate text-sm font-semibold text-tinta-900">
                <Link
                  to={`/produto/${item.codigo_produto}`}
                  onClick={fecharPainel}
                  className="hover:underline"
                >
                  {item.descricao}
                </Link>
              </h3>
              <p className="mt-0.5 text-xs text-tinta-500">
                {item.codigo_produto} · {dinheiro.format(item.preco_unitario)} cada
              </p>

              {item.problema && (
                <p className="mt-1.5 text-xs font-medium text-amber-700">{item.problema}</p>
              )}

              {fechando ? (
                <p className="mt-2 text-sm text-tinta-600">Quantidade: {item.quantidade}</p>
              ) : (
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <QuantidadeItem
                    item={item}
                    travado={quantidadeTravada(item)}
                    aoAlterar={(quantidade) => alterar(item.codigo_produto, quantidade)}
                  />
                  <button
                    type="button"
                    onClick={() => tirar(item.codigo_produto)}
                    className="text-sm text-tinta-500 underline hover:text-red-700"
                  >
                    Remover
                  </button>
                </div>
              )}

              {erroRemocao?.codigo === item.codigo_produto && (
                <p role="alert" className="mt-1.5 text-sm text-red-700">{erroRemocao.mensagem}</p>
              )}
            </div>

            <p className="shrink-0 text-right text-sm font-bold text-tinta-900">
              {dinheiro.format(item.valor_total)}
            </p>
          </li>
        ))}
      </ul>

      {erroRemocao?.codigo == null && erroRemocao?.mensagem && (
        <p role="alert" className="pb-3 text-sm text-red-700">{erroRemocao.mensagem}</p>
      )}
    </div>
  );
}
