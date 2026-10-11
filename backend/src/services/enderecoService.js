import { obterBanco, agoraISO } from '../db/index.js';
import { ApiError } from '../lib/ApiError.js';

export function serializarEndereco(linha) {
  return {
    id: linha.id,
    apelido: linha.apelido,
    cep: linha.cep,
    logradouro: linha.logradouro,
    numero: linha.numero,
    complemento: linha.complemento,
    bairro: linha.bairro,
    cidade: linha.cidade,
    uf: linha.uf,
    principal: linha.principal === 1,
  };
}

export function listarEnderecos(usuarioId, db = obterBanco()) {
  return db
    .prepare('SELECT * FROM enderecos WHERE usuario_id = ? ORDER BY principal DESC, id ASC')
    .all(usuarioId)
    .map(serializarEndereco);
}

/**
 * Busca sempre filtrando por usuario_id: sem isso, trocar o id na URL deixaria
 * qualquer cliente ler o endereco de outro.
 */
export function buscarEndereco(usuarioId, id, db = obterBanco()) {
  return db
    .prepare('SELECT * FROM enderecos WHERE id = ? AND usuario_id = ?')
    .get(id, usuarioId) ?? null;
}

function exigirEndereco(usuarioId, id, db) {
  const linha = buscarEndereco(usuarioId, id, db);
  if (!linha) throw ApiError.naoEncontrado('Endereco nao encontrado.');
  return linha;
}

/** Garante que exista no maximo um principal por usuario. */
function desmarcarOutrosPrincipais(usuarioId, exceto, db) {
  db.prepare('UPDATE enderecos SET principal = 0 WHERE usuario_id = ? AND id != ?')
    .run(usuarioId, exceto ?? -1);
}

export function criarEndereco(usuarioId, dados, db = obterBanco()) {
  const agora = agoraISO();

  const transacao = db.transaction(() => {
    const total = db
      .prepare('SELECT COUNT(*) AS total FROM enderecos WHERE usuario_id = ?')
      .get(usuarioId).total;

    // O primeiro endereco cadastrado vira principal automaticamente.
    const principal = total === 0 ? 1 : (dados.principal ? 1 : 0);

    const resultado = db
      .prepare(`
        INSERT INTO enderecos (
          usuario_id, apelido, cep, logradouro, numero, complemento,
          bairro, cidade, uf, principal, criado_em, atualizado_em
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        usuarioId, dados.apelido, dados.cep, dados.logradouro, dados.numero,
        dados.complemento, dados.bairro, dados.cidade, dados.uf, principal, agora, agora,
      );

    const id = Number(resultado.lastInsertRowid);
    if (principal === 1) desmarcarOutrosPrincipais(usuarioId, id, db);

    return id;
  });

  return serializarEndereco(buscarEndereco(usuarioId, transacao(), db));
}

export function atualizarEndereco(usuarioId, id, dados, db = obterBanco()) {
  const atual = exigirEndereco(usuarioId, id, db);

  const transacao = db.transaction(() => {
    const principal = dados.principal === undefined
      ? atual.principal
      : (dados.principal ? 1 : 0);

    db.prepare(`
      UPDATE enderecos
         SET apelido = ?, cep = ?, logradouro = ?, numero = ?, complemento = ?,
             bairro = ?, cidade = ?, uf = ?, principal = ?, atualizado_em = ?
       WHERE id = ? AND usuario_id = ?
    `).run(
      dados.apelido ?? atual.apelido,
      dados.cep ?? atual.cep,
      dados.logradouro ?? atual.logradouro,
      dados.numero ?? atual.numero,
      dados.complemento !== undefined ? dados.complemento : atual.complemento,
      dados.bairro ?? atual.bairro,
      dados.cidade ?? atual.cidade,
      dados.uf ?? atual.uf,
      principal,
      agoraISO(),
      id,
      usuarioId,
    );

    if (principal === 1) desmarcarOutrosPrincipais(usuarioId, id, db);
  });

  transacao();
  return serializarEndereco(buscarEndereco(usuarioId, id, db));
}

export function removerEndereco(usuarioId, id, db = obterBanco()) {
  const alvo = exigirEndereco(usuarioId, id, db);

  const transacao = db.transaction(() => {
    db.prepare('DELETE FROM enderecos WHERE id = ? AND usuario_id = ?').run(id, usuarioId);

    // Apagou o principal: promove o mais antigo que sobrou, para o checkout
    // nunca ficar sem endereco padrao.
    if (alvo.principal === 1) {
      const proximo = db
        .prepare('SELECT id FROM enderecos WHERE usuario_id = ? ORDER BY id ASC LIMIT 1')
        .get(usuarioId);

      if (proximo) {
        db.prepare('UPDATE enderecos SET principal = 1 WHERE id = ?').run(proximo.id);
      }
    }
  });

  transacao();
}
