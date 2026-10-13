import { ColetorDeErros, inteiroPositivo, textoObrigatorio } from '../lib/validacao.js';
import { MAXIMO_POR_ITEM } from '../services/carrinhoService.js';

export function validarInclusaoDeItem(corpo) {
  const erros = new ColetorDeErros();
  const codigo = textoObrigatorio(corpo.codigo_produto, 'codigo_produto', erros, { min: 1, max: 40 });
  const quantidade = inteiroPositivo(corpo.quantidade ?? 1, 'quantidade', erros, { max: MAXIMO_POR_ITEM });

  erros.lancarSeInvalido('Nao foi possivel adicionar ao carrinho.');
  return { codigo, quantidade };
}

export function validarQuantidadeDoItem(corpo) {
  const erros = new ColetorDeErros();
  const quantidade = inteiroPositivo(corpo.quantidade, 'quantidade', erros, { max: MAXIMO_POR_ITEM });

  erros.lancarSeInvalido('Quantidade invalida.');
  return quantidade;
}
