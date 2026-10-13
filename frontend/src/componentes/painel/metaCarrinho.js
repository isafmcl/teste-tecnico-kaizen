export function metaDoAtivo(carrinhos, carrinho) {
  return carrinhos.find((item) => item.id === carrinho?.id) ?? null;
}

export function quantidadeTravada(item) {
  if (item.estoque == null || item.estoque === 0) return true;
  return item.problema === 'Produto saiu de linha.'
    || item.problema === 'Produto indisponivel no catalogo.';
}
