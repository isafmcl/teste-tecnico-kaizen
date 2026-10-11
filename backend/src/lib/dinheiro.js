/**
 * Dinheiro trafega em reais no JSON mas e armazenado e somado em centavos
 * (inteiro), para nao acumular erro de ponto flutuante no total do pedido.
 */

export function paraCentavos(reais) {
  return Math.floor(Number(reais) * 100);
}

export function paraReais(centavos) {
  return Number((Number(centavos) / 100).toFixed(2));
}
