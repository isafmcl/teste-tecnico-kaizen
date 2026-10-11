import { Link } from 'react-router-dom';
import { dinheiro } from '../api/cliente.js';

export function CardProduto({ produto, aoAdicionar, adicionando = false }) {
  const semEstoque = produto.estoque === 0;

  return (
    <article
      className="group flex flex-col overflow-hidden rounded-xl border border-tinta-200 bg-white
        transition-shadow hover:shadow-md"
    >
      <Link to={`/produto/${produto.codigo}`} className="block bg-tinta-100">
        <img
          src={produto.imagem_url}
          alt={produto.descricao}
          loading="lazy"
          width="240"
          height="240"
          className="mx-auto aspect-square w-full max-w-[200px] object-contain p-3
            transition-transform group-hover:scale-105"
        />
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-marca-700">
          {produto.marca}
        </p>

        <h3 className="mt-1 text-sm font-semibold leading-snug text-tinta-900">
          <Link to={`/produto/${produto.codigo}`} className="hover:underline">
            {produto.descricao}
          </Link>
        </h3>

        {produto.aplicacao && (
          <p className="mt-1 line-clamp-2 text-xs text-tinta-500">{produto.aplicacao}</p>
        )}

        <p className="mt-3 text-xl font-bold text-tinta-900">
          {dinheiro.format(produto.preco_unitario)}
        </p>

        <p className="mt-0.5 text-xs text-tinta-500">
          {semEstoque ? (
            <span className="font-medium text-red-600">Sem estoque</span>
          ) : produto.estoque <= 5 ? (
            <span className="font-medium text-amber-700">Últimas {produto.estoque} unidades</span>
          ) : (
            `${produto.estoque} em estoque`
          )}
        </p>

        <button
          type="button"
          onClick={() => aoAdicionar(produto)}
          disabled={semEstoque || adicionando}
          className="mt-4 w-full rounded-lg bg-marca-700 px-4 py-2.5 text-sm font-semibold
            text-white transition-colors hover:bg-marca-800
            disabled:cursor-not-allowed disabled:bg-tinta-200 disabled:text-tinta-600"
        >
          {semEstoque ? 'Indisponível' : adicionando ? 'Adicionando...' : 'Adicionar'}
        </button>
      </div>
    </article>
  );
}
