import { useEffect, useRef } from 'react';
import { useCarrinho } from '../../contextos/CarrinhoContext.jsx';
import { ListaItensCarrinho } from './ListaItensCarrinho.jsx';
import { ResumoCarrinho } from './ResumoCarrinho.jsx';
import { SeletorCarrinho } from './SeletorCarrinho.jsx';

function focaveis(raiz) {
  return [...raiz.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )].filter((elemento) => !elemento.hasAttribute('disabled') && elemento.tabIndex !== -1);
}

export function PainelCarrinho() {
  const { painelAberto, fecharPainel, carrinho } = useCarrinho();
  const painel = useRef(null);

  useEffect(() => {
    if (!painelAberto) return undefined;

    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    painel.current?.focus();

    function tecla(evento) {
      if (evento.key === 'Escape') {
        evento.preventDefault();
        fecharPainel();
        return;
      }
      if (evento.key !== 'Tab' || !painel.current) return;

      const lista = focaveis(painel.current);
      if (lista.length === 0) {
        evento.preventDefault();
        painel.current.focus();
        return;
      }

      const primeiro = lista[0];
      const ultimo = lista[lista.length - 1];
      const ativo = document.activeElement;

      if (evento.shiftKey && (ativo === primeiro || ativo === painel.current)) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && ativo === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    }

    document.addEventListener('keydown', tecla);
    return () => {
      document.body.style.overflow = anterior;
      document.removeEventListener('keydown', tecla);
    };
  }, [painelAberto, fecharPainel]);

  if (!painelAberto) return null;

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end lg:flex-row lg:justify-end">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Fechar painel do carrinho"
        onClick={fecharPainel}
        className="absolute inset-0 bg-tinta-900/40"
      />

      <div
        ref={painel}
        id="painel-carrinho"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-painel-carrinho"
        tabIndex={-1}
        className="relative z-10 flex max-h-[85dvh] w-full min-h-0 flex-col rounded-t-2xl bg-white
          pb-[env(safe-area-inset-bottom)] shadow-xl outline-none
          lg:h-full lg:max-h-none lg:max-w-md lg:rounded-none lg:pb-0"
      >
        <div className="flex items-center justify-between border-b border-tinta-200 px-5 py-4">
          <h2 id="titulo-painel-carrinho" className="min-w-0 flex-1 truncate text-lg font-bold text-tinta-900">
            {carrinho.nome || 'Carrinho'}
          </h2>
          <button
            type="button"
            onClick={fecharPainel}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-tinta-600 hover:bg-tinta-100"
          >
            Fechar
          </button>
        </div>

        <div className="border-b border-tinta-200 px-5 py-4">
          <SeletorCarrinho />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5">
          <ListaItensCarrinho />
        </div>

        <div className="border-t border-tinta-200 px-5 py-4">
          <ResumoCarrinho solto={false} />
        </div>
      </div>
    </div>
  );
}
