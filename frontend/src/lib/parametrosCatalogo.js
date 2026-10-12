/**
 * Qualquer mudanca de filtro volta para a pagina 1. So a propria paginacao
 * altera "pagina"; as demais chaves a removem para nao pedir uma pagina
 * vazia de um resultado novo.
 */
export function aplicarParametroCatalogo(atuais, chave, valor) {
  const proximos = new URLSearchParams(atuais);

  if (valor === null || valor === '' || valor === false) proximos.delete(chave);
  else proximos.set(chave, String(valor));

  if (chave !== 'pagina') proximos.delete('pagina');

  return proximos;
}
