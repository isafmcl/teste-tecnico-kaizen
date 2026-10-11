import { useState } from 'react';
import { Link } from 'react-router-dom';
import { dinheiro } from '../api/cliente.js';
import { useCarrinho } from '../contextos/CarrinhoContext.jsx';
import { Alerta, Botao, Carregando, EstadoVazio } from '../componentes/ui.jsx';

function LinhaItem({ item, aoAlterar, aoRemover, ocupado }) {
  return (
    <li className="flex gap-4 py-4">
      <img
        src={item.imagem_url}
        alt=""
        width="80"
        height="80"
        className="size-20 shrink-0 rounded-lg bg-tinta-100 object-contain p-1"
      />

      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase text-marca-700">{item.marca}</p>

        <h3 className="truncate text-sm font-semibold text-tinta-900">
          <Link to={`/produto/${item.codigo_produto}`} className="hover:underline">
            {item.descricao}
          </Link>
        </h3>

        <p className="mt-0.5 text-xs text-tinta-500">
          {item.codigo_produto} · {dinheiro.format(item.preco_unitario)} cada
        </p>

        {item.problema && (
          <p className="mt-1.5 text-xs font-medium text-amber-700">{item.problema}</p>
        )}

        <div className="mt-2 flex items-center gap-3">
          <label className="sr-only" htmlFor={`qtd-${item.codigo_produto}`}>
            Quantidade de {item.descricao}
          </label>
          <input
            id={`qtd-${item.codigo_produto}`}
            type="number"
            min="1"
            max={item.estoque ?? 99}
            value={item.quantidade}
            disabled={ocupado || !item.disponivel}
            onChange={(evento) => {
              const valor = Number(evento.target.value);
              if (valor >= 1) aoAlterar(item.codigo_produto, valor);
            }}
            className="w-20 rounded-lg border border-tinta-300 px-2 py-1.5 text-sm
              focus:border-marca-500 focus:outline-none focus:ring-2 focus:ring-marca-100
              disabled:bg-tinta-100"
          />

          <button
            type="button"
            onClick={() => aoRemover(item.codigo_produto)}
            disabled={ocupado}
            className="text-sm text-tinta-500 underline hover:text-red-600 disabled:opacity-50"
          >
            Remover
          </button>
        </div>
      </div>

      <p className="shrink-0 text-right text-sm font-bold text-tinta-900">
        {dinheiro.format(item.valor_total)}
      </p>
    </li>
  );
}

export function Carrinho() {
  const { carrinho, carregando, alterar, remover, limpar } = useCarrinho();
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState(null);

  async function executar(acao) {
    setOcupado(true);
    setErro(null);
    try {
      await acao();
    } catch (falha) {
      setErro(falha);
    } finally {
      setOcupado(false);
    }
  }

  if (carregando && carrinho.itens.length === 0) {
    return <Carregando texto="Carregando carrinho..." />;
  }

  if (carrinho.itens.length === 0) {
    return (
      <EstadoVazio
        titulo="Seu carrinho está vazio"
        descricao="Procure a peça pelo nome, pela marca ou pelo carro em que ela se aplica."
        acao={<Link to="/"><Botao>Ver catálogo</Botao></Link>}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-tinta-900">Carrinho</h1>
        <button
          type="button"
          onClick={() => executar(limpar)}
          disabled={ocupado}
          className="text-sm text-tinta-500 underline hover:text-red-600 disabled:opacity-50"
        >
          Esvaziar
        </button>
      </div>

      {erro && <Alerta tipo="erro">{erro.message}</Alerta>}

      {!carrinho.pronto_para_checkout && (
        <Alerta tipo="aviso" titulo="Alguns itens precisam de ajuste">
          Ajuste ou remova os itens marcados abaixo para fechar o pedido.
        </Alerta>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-xl border border-tinta-200 bg-white px-5">
          <ul className="divide-y divide-tinta-200">
            {carrinho.itens.map((item) => (
              <LinhaItem
                key={item.codigo_produto}
                item={item}
                ocupado={ocupado}
                aoAlterar={(codigo, quantidade) => executar(() => alterar(codigo, quantidade))}
                aoRemover={(codigo) => executar(() => remover(codigo))}
              />
            ))}
          </ul>
        </div>

        <aside className="h-fit rounded-xl border border-tinta-200 bg-white p-5 lg:sticky lg:top-24">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-tinta-500">Resumo</h2>

          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-tinta-600">Itens</dt>
              <dd className="font-medium">{carrinho.quantidade_pecas}</dd>
            </div>
            <div className="flex justify-between border-t border-tinta-200 pt-3 text-base">
              <dt className="font-semibold text-tinta-900">Total</dt>
              <dd className="font-bold text-tinta-900">{dinheiro.format(carrinho.valor_total)}</dd>
            </div>
          </dl>

          <Link to="/checkout" className="mt-5 block">
            <Botao
              tamanho="grande"
              className="w-full"
              disabled={!carrinho.pronto_para_checkout || ocupado}
            >
              Fechar pedido
            </Botao>
          </Link>

          <Link
            to="/"
            className="mt-3 block text-center text-sm text-tinta-600 underline hover:text-marca-700"
          >
            Continuar comprando
          </Link>
        </aside>
      </div>
    </div>
  );
}
