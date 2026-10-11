import { obterBanco, agoraISO } from '../db/index.js';
import { ApiError } from '../lib/ApiError.js';
import { conferirSenha, gerarHash } from '../lib/senha.js';

/** Nunca devolve senha_hash. */
export function serializarUsuario(linha) {
  return {
    id: linha.id,
    nome: linha.nome,
    email: linha.email,
    documento: linha.documento,
    telefone: linha.telefone,
    criado_em: linha.criado_em,
  };
}

export function buscarUsuarioPorId(id, db = obterBanco()) {
  return db.prepare('SELECT * FROM usuarios WHERE id = ?').get(id) ?? null;
}

export function buscarUsuarioPorEmail(email, db = obterBanco()) {
  return db.prepare('SELECT * FROM usuarios WHERE email = ?').get(String(email).toLowerCase()) ?? null;
}

export async function cadastrarUsuario({ nome, email, senha, documento, telefone }, db = obterBanco()) {
  if (buscarUsuarioPorEmail(email, db)) {
    throw ApiError.conflito('EMAIL_EM_USO', 'Ja existe uma conta com esse e-mail.');
  }

  const agora = agoraISO();
  const senhaHash = await gerarHash(senha);

  let resultado;
  try {
    resultado = db
      .prepare(`
        INSERT INTO usuarios (nome, email, senha_hash, documento, telefone, criado_em, atualizado_em)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .run(nome, email, senhaHash, documento, telefone, agora, agora);
  } catch (erro) {
    // Corrida entre dois cadastros com o mesmo e-mail: o UNIQUE do banco e a
    // garantia de verdade, a checagem acima e so para dar mensagem melhor.
    if (erro?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw ApiError.conflito('EMAIL_EM_USO', 'Ja existe uma conta com esse e-mail.');
    }
    throw erro;
  }

  return buscarUsuarioPorId(Number(resultado.lastInsertRowid), db);
}

/**
 * Valida as credenciais.
 *
 * E-mail inexistente e senha errada devolvem a MESMA mensagem de proposito:
 * respostas diferentes permitiriam descobrir quais e-mails tem conta na loja.
 */
export async function autenticarUsuario(email, senha, db = obterBanco()) {
  const usuario = buscarUsuarioPorEmail(email, db);

  if (!usuario) {
    // Gasta o tempo de um hash mesmo sem usuario, para que a resposta nao seja
    // visivelmente mais rapida quando o e-mail nao existe.
    await gerarHash(senha);
    throw ApiError.naoAutorizado('CREDENCIAIS_INVALIDAS', 'E-mail ou senha incorretos.');
  }

  const confere = await conferirSenha(senha, usuario.senha_hash);
  if (!confere) {
    throw ApiError.naoAutorizado('CREDENCIAIS_INVALIDAS', 'E-mail ou senha incorretos.');
  }

  return usuario;
}

export function atualizarPerfil(usuarioId, { nome, telefone, documento }, db = obterBanco()) {
  const atual = buscarUsuarioPorId(usuarioId, db);
  if (!atual) throw ApiError.naoEncontrado('Usuario nao encontrado.');

  db.prepare(`
    UPDATE usuarios
       SET nome = ?, telefone = ?, documento = ?, atualizado_em = ?
     WHERE id = ?
  `).run(
    nome ?? atual.nome,
    telefone || atual.telefone,
    documento ?? atual.documento,
    agoraISO(),
    usuarioId,
  );

  return buscarUsuarioPorId(usuarioId, db);
}

export async function trocarSenha(usuarioId, senhaAtual, novaSenha, db = obterBanco()) {
  const usuario = buscarUsuarioPorId(usuarioId, db);
  if (!usuario) throw ApiError.naoEncontrado('Usuario nao encontrado.');

  const confere = await conferirSenha(senhaAtual, usuario.senha_hash);
  if (!confere) {
    throw ApiError.naoProcessavel('Nao foi possivel trocar a senha.', [
      { campo: 'senha_atual', mensagem: 'Senha atual incorreta.' },
    ]);
  }

  db.prepare('UPDATE usuarios SET senha_hash = ?, atualizado_em = ? WHERE id = ?')
    .run(await gerarHash(novaSenha), agoraISO(), usuarioId);
}
