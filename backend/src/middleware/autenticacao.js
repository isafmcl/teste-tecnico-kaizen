import jwt from 'jsonwebtoken';
import { config, emProducao } from '../config.js';
import { ApiError } from '../lib/ApiError.js';
import { buscarUsuarioPorId } from '../services/usuarioService.js';

/** Converte "7d" / "12h" / "30m" em milissegundos, para o maxAge do cookie. */
function paraMilissegundos(expiracao) {
  const partida = /^(\d+)([smhd])$/.exec(String(expiracao).trim());
  if (!partida) return 7 * 24 * 60 * 60 * 1000;

  const unidades = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return Number(partida[1]) * unidades[partida[2]];
}

export function assinarToken(usuarioId) {
  return jwt.sign({ sub: String(usuarioId) }, config.jwt.segredo, {
    expiresIn: config.jwt.expiracao,
  });
}

/**
 * O token vai em cookie httpOnly, nao no corpo da resposta.
 *
 * Em localStorage qualquer script injetado na pagina le o token; httpOnly o
 * JavaScript nao enxerga. O preco e precisar de SameSite contra CSRF - "lax"
 * ja barra POST de outro site, e a loja nao faz acao sensivel por GET.
 */
export function definirCookieSessao(res, token) {
  res.cookie(config.jwt.nomeCookie, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: emProducao,
    maxAge: paraMilissegundos(config.jwt.expiracao),
    path: '/',
  });
}

export function limparCookieSessao(res) {
  res.clearCookie(config.jwt.nomeCookie, {
    httpOnly: true,
    sameSite: 'lax',
    secure: emProducao,
    path: '/',
  });
}

/** Exige sessao valida. Carrega o usuario em req.usuario. */
export function autenticar(req, res, next) {
  const token = req.cookies?.[config.jwt.nomeCookie];

  if (!token) {
    return next(ApiError.naoAutorizado('NAO_AUTENTICADO', 'Faca login para continuar.'));
  }

  let conteudo;
  try {
    conteudo = jwt.verify(token, config.jwt.segredo);
  } catch {
    limparCookieSessao(res);
    return next(ApiError.naoAutorizado('SESSAO_INVALIDA', 'Sua sessao expirou. Entre de novo.'));
  }

  // Confere no banco: conta apagada nao deve continuar navegando com token velho.
  const usuario = buscarUsuarioPorId(Number(conteudo.sub));
  if (!usuario) {
    limparCookieSessao(res);
    return next(ApiError.naoAutorizado('SESSAO_INVALIDA', 'Sua sessao expirou. Entre de novo.'));
  }

  req.usuario = usuario;
  next();
}

/** Nao bloqueia: so popula req.usuario quando houver sessao. */
export function autenticarOpcional(req, _res, next) {
  const token = req.cookies?.[config.jwt.nomeCookie];
  if (!token) return next();

  try {
    const conteudo = jwt.verify(token, config.jwt.segredo);
    req.usuario = buscarUsuarioPorId(Number(conteudo.sub)) ?? undefined;
  } catch {
    // Token invalido em rota publica e so "visitante".
  }

  next();
}
