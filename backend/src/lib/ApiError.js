/**
 * Erro de negocio/validacao que vira resposta HTTP previsivel.
 * Qualquer outro erro que chegar ao handler final vira 500 generico.
 */
export class ApiError extends Error {
  constructor(status, codigo, mensagem, detalhes) {
    super(mensagem);
    this.name = 'ApiError';
    // Alias em portugues: o handler de erros serializa a partir de `mensagem`.
    this.mensagem = mensagem;
    this.status = status;
    this.codigo = codigo;
    this.detalhes = detalhes;
  }

  static naoAutorizado(codigo, mensagem) {
    return new ApiError(401, codigo, mensagem);
  }

  static requisicaoInvalida(mensagem, detalhes) {
    return new ApiError(400, 'REQUISICAO_INVALIDA', mensagem, detalhes);
  }

  static naoEncontrado(mensagem) {
    return new ApiError(404, 'NAO_ENCONTRADO', mensagem);
  }

  static naoProcessavel(mensagem, detalhes) {
    return new ApiError(422, 'ENTIDADE_NAO_PROCESSAVEL', mensagem, detalhes);
  }

  static conflito(codigo, mensagem, detalhes) {
    return new ApiError(409, codigo, mensagem, detalhes);
  }
}
