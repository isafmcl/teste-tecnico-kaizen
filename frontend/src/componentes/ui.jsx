/**
 * Primitivos de interface da loja.
 * Ficam juntos de proposito: sao pequenos, usados em toda tela, e manter o
 * estilo num arquivo so evita que cada pagina invente seu proprio botao.
 */

/**
 * Botao desabilitado troca TAMBEM a cor do texto. Manter `text-white` sobre um
 * fundo claro deixaria o rotulo ilegivel - e o estado desabilitado precisa
 * continuar legivel para a pessoa entender o que esta bloqueado.
 *
 * O WCAG 1.4.3 isenta componente desabilitado da regra de contraste, mas
 * "isento" nao e desculpa para ninguem conseguir ler. Os tons aqui ficam
 * apagados o suficiente para parecerem inativos e escuros o suficiente para
 * serem lidos.
 */
const ESTILOS_BOTAO = {
  primario: 'bg-marca-700 text-white hover:bg-marca-800 disabled:bg-tinta-200 disabled:text-tinta-600',
  secundario: 'bg-tinta-800 text-white hover:bg-tinta-900 disabled:bg-tinta-200 disabled:text-tinta-600',
  contorno: 'border border-tinta-300 bg-white text-tinta-700 hover:bg-tinta-50 disabled:text-tinta-500',
  discreto: 'text-tinta-600 hover:bg-tinta-100 disabled:text-tinta-500',
  perigo: 'border border-red-200 bg-white text-red-700 hover:bg-red-50 disabled:text-red-300',
};

const TAMANHOS_BOTAO = {
  pequeno: 'px-3 py-1.5 text-sm',
  medio: 'px-4 py-2.5 text-sm',
  grande: 'px-6 py-3 text-base',
};

export function Botao({
  variante = 'primario',
  tamanho = 'medio',
  carregando = false,
  className = '',
  children,
  ...props
}) {
  return (
    <button
      {...props}
      disabled={props.disabled || carregando}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold
        transition-colors disabled:cursor-not-allowed
        ${ESTILOS_BOTAO[variante]} ${TAMANHOS_BOTAO[tamanho]} ${className}`}
    >
      {carregando && (
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
}

export function Campo({ rotulo, erro, dica, id, className = '', children, ...props }) {
  const idCampo = id ?? props.name;
  const idErro = erro ? `${idCampo}-erro` : undefined;

  return (
    <div className={className}>
      <label htmlFor={idCampo} className="mb-1.5 block text-sm font-medium text-tinta-700">
        {rotulo}
      </label>

      {children ?? (
        <input
          {...props}
          id={idCampo}
          aria-invalid={erro ? 'true' : undefined}
          aria-describedby={idErro}
          className={`w-full rounded-lg border px-3 py-2.5 text-sm text-tinta-900
            placeholder:text-tinta-400 focus:outline-none focus:ring-2
            ${erro
              ? 'border-red-400 bg-red-50 focus:ring-red-200'
              : 'border-tinta-300 bg-white focus:border-marca-500 focus:ring-marca-100'}`}
        />
      )}

      {erro && (
        <p id={idErro} className="mt-1.5 text-sm text-red-600">
          {erro}
        </p>
      )}
      {!erro && dica && <p className="mt-1.5 text-xs text-tinta-500">{dica}</p>}
    </div>
  );
}

const ESTILOS_ALERTA = {
  erro: 'border-red-200 bg-red-50 text-red-800',
  sucesso: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  aviso: 'border-amber-200 bg-amber-50 text-amber-900',
  info: 'border-tinta-200 bg-tinta-100 text-tinta-700',
};

export function Alerta({ tipo = 'erro', titulo, children, className = '' }) {
  return (
    <div
      role={tipo === 'erro' ? 'alert' : 'status'}
      className={`rounded-lg border px-4 py-3 text-sm ${ESTILOS_ALERTA[tipo]} ${className}`}
    >
      {titulo && <p className="font-semibold">{titulo}</p>}
      {children}
    </div>
  );
}

/** Lista os erros de validacao que nao casaram com nenhum input da tela. */
export function ErroGeral({ erro, camposConhecidos = [] }) {
  if (!erro) return null;

  const porCampo = erro.porCampo ?? {};
  const sobrando = Object.entries(porCampo).filter(([campo]) => !camposConhecidos.includes(campo));
  const detalhesLivres = Array.isArray(erro.detalhes)
    ? erro.detalhes.filter((item) => !item?.campo)
    : [];

  return (
    <Alerta tipo="erro" titulo={erro.message}>
      {(sobrando.length > 0 || detalhesLivres.length > 0) && (
        <ul className="mt-1 list-inside list-disc">
          {sobrando.map(([campo, mensagem]) => (
            <li key={campo}>
              {campo}: {mensagem}
            </li>
          ))}
          {detalhesLivres.map((item, indice) => (
            <li key={indice}>
              {item.codigo_produto ? `${item.codigo_produto}: ` : ''}
              {item.mensagem ?? item.motivo}
              {item.estoque_disponivel !== undefined && ` (disponivel: ${item.estoque_disponivel})`}
            </li>
          ))}
        </ul>
      )}
    </Alerta>
  );
}

export function Carregando({ texto = 'Carregando...', className = '' }) {
  return (
    <div className={`flex items-center justify-center gap-3 py-16 text-tinta-500 ${className}`}>
      <span
        aria-hidden="true"
        className="size-5 animate-spin rounded-full border-2 border-tinta-300 border-t-marca-600"
      />
      <span className="text-sm">{texto}</span>
    </div>
  );
}

export function EstadoVazio({ titulo, descricao, acao }) {
  return (
    <div className="rounded-xl border border-dashed border-tinta-300 bg-white px-6 py-16 text-center">
      <p className="text-lg font-semibold text-tinta-800">{titulo}</p>
      {descricao && <p className="mx-auto mt-2 max-w-md text-sm text-tinta-500">{descricao}</p>}
      {acao && <div className="mt-6 flex justify-center">{acao}</div>}
    </div>
  );
}

const ESTILOS_SELO = {
  ABERTO: 'bg-sky-100 text-sky-800',
  FATURADO: 'bg-emerald-100 text-emerald-800',
  CANCELADO: 'bg-red-100 text-red-800',
  INDISPONIVEL: 'bg-tinta-200 text-tinta-600',
};

export function SeloSituacao({ situacao }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold
        ${ESTILOS_SELO[situacao] ?? ESTILOS_SELO.INDISPONIVEL}`}
    >
      {situacao === 'INDISPONIVEL' ? 'consultando...' : situacao.toLowerCase()}
    </span>
  );
}

export function Paginacao({ paginacao, aoMudar }) {
  if (!paginacao || paginacao.total_paginas <= 1) return null;

  const { pagina, total_paginas: totalPaginas, total } = paginacao;

  return (
    <nav className="flex items-center justify-between gap-4 pt-4" aria-label="Paginacao">
      <p className="text-sm text-tinta-500">
        Página {pagina} de {totalPaginas} · {total} {total === 1 ? 'resultado' : 'resultados'}
      </p>

      <div className="flex gap-2">
        <Botao
          variante="contorno"
          tamanho="pequeno"
          disabled={pagina <= 1}
          onClick={() => aoMudar(pagina - 1)}
        >
          Anterior
        </Botao>
        <Botao
          variante="contorno"
          tamanho="pequeno"
          disabled={pagina >= totalPaginas - 1}
          onClick={() => aoMudar(pagina + 1)}
        >
          Próxima
        </Botao>
      </div>
    </nav>
  );
}
