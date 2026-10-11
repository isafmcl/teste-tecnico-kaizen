import { config } from '../config.js';
import { ApiError } from './ApiError.js';

/**
 * Acumulador de erros de validacao: a API devolve TODOS os problemas do
 * formulario de uma vez, para o front marcar cada campo em uma passada.
 */
export class ColetorDeErros {
  constructor() {
    this.itens = [];
  }

  adicionar(campo, mensagem) {
    this.itens.push({ campo, mensagem });
  }

  get temErros() {
    return this.itens.length > 0;
  }

  lancarSeInvalido(mensagem = 'Payload invalido.') {
    if (this.temErros) {
      throw ApiError.naoProcessavel(mensagem, this.itens);
    }
  }
}

export function exigirObjeto(corpo) {
  if (typeof corpo !== 'object' || corpo === null || Array.isArray(corpo)) {
    throw ApiError.requisicaoInvalida('O corpo da requisicao deve ser um objeto JSON.');
  }
  return corpo;
}

export function textoObrigatorio(valor, campo, erros, { min = 1, max = 255 } = {}) {
  if (typeof valor !== 'string' || valor.trim().length === 0) {
    erros.adicionar(campo, 'Campo obrigatorio.');
    return null;
  }
  const limpo = valor.trim();
  if (limpo.length < min) {
    erros.adicionar(campo, `Deve ter no minimo ${min} caracteres.`);
    return null;
  }
  if (limpo.length > max) {
    erros.adicionar(campo, `Deve ter no maximo ${max} caracteres.`);
    return null;
  }
  return limpo;
}

export function textoOpcional(valor, campo, erros, { max = 255 } = {}) {
  if (valor === undefined || valor === null || valor === '') return null;
  if (typeof valor !== 'string') {
    erros.adicionar(campo, 'Deve ser texto.');
    return null;
  }
  const limpo = valor.trim();
  if (limpo.length > max) {
    erros.adicionar(campo, `Deve ter no maximo ${max} caracteres.`);
    return null;
  }
  return limpo || null;
}

export function inteiroPositivo(valor, campo, erros, { max = 9999 } = {}) {
  if (valor === undefined || valor === null || valor === '') {
    erros.adicionar(campo, 'Campo obrigatorio.');
    return null;
  }
  const numero = Number(valor);
  if (!Number.isInteger(numero)) {
    erros.adicionar(campo, 'Deve ser um numero inteiro.');
    return null;
  }
  if (numero < 1) {
    erros.adicionar(campo, 'Deve ser maior que zero.');
    return null;
  }
  if (numero > max) {
    erros.adicionar(campo, `Deve ser no maximo ${max}.`);
    return null;
  }
  return numero;
}

/**
 * Validacao de e-mail deliberadamente permissiva: a regra real de um endereco
 * valido e enorme e regex agressiva rejeita gente de verdade. Confirmacao por
 * e-mail e o que valida de fato, e esta fora do escopo deste projeto.
 */
export function email(valor, campo, erros) {
  const texto = textoObrigatorio(valor, campo, erros, { min: 5, max: 160 });
  if (texto === null) return null;

  const limpo = texto.toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(limpo)) {
    erros.adicionar(campo, 'E-mail invalido.');
    return null;
  }
  return limpo;
}

export function senha(valor, campo, erros) {
  if (typeof valor !== 'string' || valor.length === 0) {
    erros.adicionar(campo, 'Campo obrigatorio.');
    return null;
  }
  if (valor.length < 8) {
    erros.adicionar(campo, 'A senha deve ter no minimo 8 caracteres.');
    return null;
  }
  if (valor.length > 200) {
    erros.adicionar(campo, 'A senha deve ter no maximo 200 caracteres.');
    return null;
  }
  if (!/[a-zA-Z]/.test(valor) || !/\d/.test(valor)) {
    erros.adicionar(campo, 'A senha deve conter ao menos uma letra e um numero.');
    return null;
  }
  return valor;
}

/** Aceita CPF (11) ou CNPJ (14), com ou sem mascara. Valida so o tamanho. */
export function documento(valor, campo, erros) {
  const texto = textoObrigatorio(valor, campo, erros, { min: 11, max: 18 });
  if (texto === null) return null;

  const digitos = texto.replace(/\D/g, '');
  if (digitos.length !== 11 && digitos.length !== 14) {
    erros.adicionar(campo, 'Informe um CPF (11 digitos) ou CNPJ (14 digitos).');
    return null;
  }
  return texto;
}

export function cep(valor, campo, erros) {
  const texto = textoObrigatorio(valor, campo, erros, { min: 8, max: 9 });
  if (texto === null) return null;

  const digitos = texto.replace(/\D/g, '');
  if (digitos.length !== 8) {
    erros.adicionar(campo, 'CEP deve ter 8 digitos.');
    return null;
  }
  return `${digitos.slice(0, 5)}-${digitos.slice(5)}`;
}

const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

export function uf(valor, campo, erros) {
  const texto = textoObrigatorio(valor, campo, erros, { min: 2, max: 2 });
  if (texto === null) return null;

  const sigla = texto.toUpperCase();
  if (!UFS.includes(sigla)) {
    erros.adicionar(campo, 'UF invalida.');
    return null;
  }
  return sigla;
}

export function telefone(valor, campo, erros) {
  const texto = textoOpcional(valor, campo, erros, { max: 20 });
  if (texto === null) return null;

  const digitos = texto.replace(/\D/g, '');
  if (digitos.length < 10 || digitos.length > 11) {
    erros.adicionar(campo, 'Telefone deve ter DDD + numero (10 ou 11 digitos).');
    return null;
  }
  return texto;
}

export function lerPaginacao(query) {
  const pagina = Math.max(1, Number.parseInt(query.pagina ?? '1', 10) || 1);
  const bruto = Number.parseInt(query.tamanho ?? String(config.paginacao.tamanhoPadrao), 10);
  const tamanho = Math.min(
    config.paginacao.tamanhoMaximo,
    Math.max(1, Number.isNaN(bruto) ? config.paginacao.tamanhoPadrao : bruto),
  );
  return { pagina, tamanho };
}

export function lerBooleano(valor) {
  if (valor === undefined || valor === null || valor === '') return null;
  const texto = String(valor).trim().toLowerCase();
  if (['true', '1', 'sim', 's'].includes(texto)) return true;
  if (['false', '0', 'nao', 'n'].includes(texto)) return false;
  return null;
}
