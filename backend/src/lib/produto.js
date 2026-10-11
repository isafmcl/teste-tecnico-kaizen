/**
 * O ERP devolve imagem_url como caminho dele proprio ("/imagens/x.svg").
 * O navegador fala com a loja, nao com o ERP, entao o caminho e reescrito para
 * o proxy da loja antes de sair daqui. Sem isso o front teria que conhecer o
 * endereco do ERP - exatamente o acoplamento que o BFF existe para evitar.
 */
export function comImagemDaLoja(produto) {
  if (!produto) return produto;

  const origem = produto.imagem_url ?? '/imagens/generico.svg';
  const arquivo = origem.split('/').pop();

  return { ...produto, imagem_url: `/api/imagens/${arquivo}` };
}

export function listaComImagemDaLoja(produtos) {
  return (produtos ?? []).map(comImagemDaLoja);
}
