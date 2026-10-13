import { Link } from 'react-router-dom';
import { dinheiro } from '../../api/cliente.js';
import { Botao, classesBotao } from '../ui.jsx';
import { useCarrinho } from '../../contextos/CarrinhoContext.jsx';
import { metaDoAtivo } from './metaCarrinho.js';

export function ResumoCarrinho({ solto = true }) {
  const { carrinho, carrinhos, fecharPainel } = useCarrinho();
  const fechando = metaDoAtivo(carrinhos, carrinho)?.status === 'FECHANDO';
  const podeFechar = carrinho.pronto_para_checkout && !fechando;
  const temPendencia = carrinho.itens.some((item) => !item.disponivel);

  return (
    <aside className={solto ? 'h-fit rounded-xl border border-tinta-200 bg-white p-5 lg:sticky lg:top-24' : ''}>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-tinta-500">Resumo</h2>

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-tinta-600">Peças</dt>
          <dd className="font-medium">{carrinho.quantidade_pecas}</dd>
        </div>
        <div className="flex justify-between border-t border-tinta-200 pt-3 text-base">
          <dt className="font-semibold text-tinta-900">Total</dt>
          <dd className="font-bold text-tinta-900">{dinheiro.format(carrinho.valor_total)}</dd>
        </div>
      </dl>

      {temPendencia && (
        <p className="mt-2 text-sm text-tinta-600">
          Itens com pendência não entram no total.
        </p>
      )}

      {podeFechar ? (
        <Link
          to="/checkout"
          onClick={fecharPainel}
          className={classesBotao('primario', 'grande', 'mt-5 w-full no-underline')}
        >
          Fechar pedido
        </Link>
      ) : (
        <Botao type="button" tamanho="grande" className="mt-5 w-full" disabled>
          Fechar pedido
        </Botao>
      )}

      <Link
        to="/"
        onClick={fecharPainel}
        className="mt-3 block text-center text-sm text-tinta-600 underline hover:text-marca-700"
      >
        Continuar comprando
      </Link>
    </aside>
  );
}
