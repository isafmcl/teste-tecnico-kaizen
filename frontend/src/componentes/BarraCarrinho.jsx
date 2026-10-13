import { useLocation } from 'react-router-dom';
import { dinheiro } from '../api/cliente.js';
import { useAuth } from '../contextos/AuthContext.jsx';
import { useCarrinho } from '../contextos/CarrinhoContext.jsx';

export function BarraCarrinho() {
  const { autenticado } = useAuth();
  const { carrinho, painelAberto, abrirPainel } = useCarrinho();
  const { pathname } = useLocation();
  const pecas = carrinho.quantidade_pecas;
  const visivel = autenticado
    && pecas > 0
    && pathname !== '/carrinho'
    && pathname !== '/checkout';

  if (!visivel) return null;

  const nome = carrinho.nome || 'Carrinho';

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-30 bg-marca-700 pb-[env(safe-area-inset-bottom)] lg:hidden">
        <button
          type="button"
          onClick={abrirPainel}
          aria-expanded={painelAberto}
          aria-controls="painel-carrinho"
          className="flex min-h-[4.5rem] w-full items-center gap-3 px-4 py-3 text-left text-white
            hover:bg-marca-800 focus-visible:outline focus-visible:outline-2
            focus-visible:outline-offset-[-2px] focus-visible:outline-white"
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{nome}</span>
            <span className="block text-xs text-white">
              {pecas} {pecas === 1 ? 'peça' : 'peças'}
            </span>
          </span>
          <span className="shrink-0 text-sm font-bold">{dinheiro.format(carrinho.valor_total)}</span>
        </button>
      </div>

      <div aria-hidden="true" className="h-[calc(4.5rem_+_env(safe-area-inset-bottom))] lg:hidden" />
    </>
  );
}
