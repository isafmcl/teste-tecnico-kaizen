import { useEffect, useId, useRef, useState } from 'react';

const TETO = 99;

export function QuantidadeItem({ item, travado, aoAlterar }) {
  const [rascunho, setRascunho] = useState(String(item.quantidade));
  const [erro, setErro] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const enviando = useRef(false);
  const idCampo = useId();

  useEffect(() => {
    setRascunho(String(item.quantidade));
  }, [item.codigo_produto, item.quantidade]);

  async function confirmar(texto) {
    const numero = Number(texto);
    if (!Number.isInteger(numero) || numero < 1 || numero > TETO || numero === item.quantidade) {
      setRascunho(String(item.quantidade));
      return;
    }
    if (enviando.current) return;

    enviando.current = true;
    setOcupado(true);
    setErro(null);
    try {
      await aoAlterar(numero);
    } catch (falha) {
      setRascunho(String(item.quantidade));
      setErro(falha.message ?? 'Não foi possível alterar a quantidade.');
    } finally {
      enviando.current = false;
      setOcupado(false);
    }
  }

  const maisBloqueado = travado
    || ocupado
    || item.quantidade >= TETO
    || (item.estoque > 0 && item.quantidade >= item.estoque);

  return (
    <div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Diminuir quantidade de ${item.descricao}`}
          disabled={travado || ocupado || item.quantidade <= 1}
          onClick={() => confirmar(item.quantidade - 1)}
          className="grid size-8 place-items-center rounded-lg border border-tinta-300 text-tinta-700
            hover:bg-tinta-50 disabled:cursor-not-allowed disabled:text-tinta-400"
        >
          −
        </button>

        <label className="sr-only" htmlFor={idCampo}>
          Quantidade de {item.descricao}
        </label>
        <input
          id={idCampo}
          type="text"
          inputMode="numeric"
          value={rascunho}
          disabled={travado || ocupado}
          aria-invalid={erro ? 'true' : undefined}
          aria-describedby={erro ? `${idCampo}-erro` : undefined}
          onChange={(evento) => {
            setErro(null);
            setRascunho(evento.target.value.replace(/\D/g, ''));
          }}
          onBlur={() => confirmar(rascunho)}
          onKeyDown={(evento) => {
            if (evento.key === 'Enter') {
              evento.preventDefault();
              evento.currentTarget.blur();
            }
          }}
          className="w-14 rounded-lg border border-tinta-300 px-2 py-1.5 text-center text-sm
            focus:border-marca-500 focus:outline-none focus:ring-2 focus:ring-marca-100
            disabled:bg-tinta-100"
        />

        <button
          type="button"
          aria-label={`Aumentar quantidade de ${item.descricao}`}
          disabled={maisBloqueado}
          onClick={() => confirmar(item.quantidade + 1)}
          className="grid size-8 place-items-center rounded-lg border border-tinta-300 text-tinta-700
            hover:bg-tinta-50 disabled:cursor-not-allowed disabled:text-tinta-400"
        >
          +
        </button>
      </div>

      {erro && (
        <p id={`${idCampo}-erro`} role="alert" className="mt-1.5 text-sm text-red-700">
          {erro}
        </p>
      )}
    </div>
  );
}
