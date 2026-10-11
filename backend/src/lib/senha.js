import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(crypto.scrypt);

const TAMANHO_SAL = 16;
const TAMANHO_CHAVE = 64;
// N=16384 custa ~16MB e ~60ms por hash: caro o suficiente para forca bruta,
// barato o suficiente para um login nao travar a requisicao.
const PARAMETROS = { N: 16384, r: 8, p: 1 };

/**
 * Usa scrypt do proprio Node em vez de bcrypt.
 * Motivos: zero dependencia nativa para compilar na EC2, e scrypt e resistente
 * a ataque com hardware dedicado (memory-hard), coisa que bcrypt nao e.
 *
 * Formato guardado: scrypt$N$r$p$sal_base64$chave_base64
 * Os parametros viajam junto com o hash para que senhas antigas continuem
 * validando se os custos mudarem no futuro.
 */
export async function gerarHash(senha) {
  const sal = crypto.randomBytes(TAMANHO_SAL);
  const chave = await scrypt(senha.normalize('NFKC'), sal, TAMANHO_CHAVE, PARAMETROS);

  return [
    'scrypt',
    PARAMETROS.N,
    PARAMETROS.r,
    PARAMETROS.p,
    sal.toString('base64'),
    chave.toString('base64'),
  ].join('$');
}

export async function conferirSenha(senha, hashArmazenado) {
  try {
    const [algoritmo, n, r, p, salB64, chaveB64] = String(hashArmazenado).split('$');
    if (algoritmo !== 'scrypt') return false;

    const sal = Buffer.from(salB64, 'base64');
    const esperada = Buffer.from(chaveB64, 'base64');

    const calculada = await scrypt(senha.normalize('NFKC'), sal, esperada.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
    });

    return crypto.timingSafeEqual(calculada, esperada);
  } catch {
    // Hash corrompido ou formato desconhecido: trata como senha errada.
    return false;
  }
}
