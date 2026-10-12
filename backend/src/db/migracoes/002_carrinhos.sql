-- Versao 2. Carrinho passa a ser uma entidade. Sem coluna status:
-- ela entra na migracao 003, na etapa do checkout (ADD COLUMN com DEFAULT).
--
-- UNIQUE (usuario_id, nome) COLLATE NOCASE e so a barreira do banco, e so
-- para ASCII: "Gol" e "gol" conflitam, "Sao" e "são" nao. O service compara
-- com normalize('NFC') + toLocaleLowerCase('pt-BR'); isso fica para a etapa 2.

CREATE TABLE carrinhos (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id    INTEGER NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  nome          TEXT    NOT NULL COLLATE NOCASE
                        CHECK (length(trim(nome)) BETWEEN 1 AND 40),
  criado_em     TEXT    NOT NULL,
  atualizado_em TEXT    NOT NULL,
  UNIQUE (usuario_id, nome)
);

CREATE INDEX idx_carrinhos_usuario ON carrinhos (usuario_id);

ALTER TABLE usuarios
  ADD COLUMN carrinho_ativo_id INTEGER REFERENCES carrinhos (id) ON DELETE SET NULL;

-- Quem ja esta no banco ganha "Meu carrinho", com ou sem item, e ele vira o ativo.
INSERT INTO carrinhos (usuario_id, nome, criado_em, atualizado_em)
SELECT id,
       'Meu carrinho',
       strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
       strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  FROM usuarios;

UPDATE usuarios
   SET carrinho_ativo_id = (
     SELECT id FROM carrinhos
      WHERE carrinhos.usuario_id = usuarios.id
        AND carrinhos.nome = 'Meu carrinho'
   );

-- SQLite nao troca FK nem UNIQUE com ALTER TABLE. Reconstroi carrinho_itens
-- sem usuario_id: a posse passa a ser o JOIN com carrinhos.
CREATE TABLE carrinho_itens_novo (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  carrinho_id    INTEGER NOT NULL REFERENCES carrinhos (id) ON DELETE CASCADE,
  codigo_produto TEXT    NOT NULL,
  quantidade     INTEGER NOT NULL CHECK (quantidade > 0),
  adicionado_em  TEXT    NOT NULL,
  UNIQUE (carrinho_id, codigo_produto)
);

INSERT INTO carrinho_itens_novo (id, carrinho_id, codigo_produto, quantidade, adicionado_em)
SELECT itens.id, carrinhos.id, itens.codigo_produto, itens.quantidade, itens.adicionado_em
  FROM carrinho_itens AS itens
  JOIN carrinhos ON carrinhos.usuario_id = itens.usuario_id;

DROP TABLE carrinho_itens;

ALTER TABLE carrinho_itens_novo RENAME TO carrinho_itens;

CREATE INDEX idx_carrinho_itens_carrinho ON carrinho_itens (carrinho_id);

-- Ultima barreira: o service confere o dono antes de gravar o ativo.
-- Se um update invalido chegar aqui, o SQLite aborta e a API responde 500.
CREATE TRIGGER trg_carrinho_ativo_do_usuario
BEFORE UPDATE OF carrinho_ativo_id ON usuarios
WHEN NEW.carrinho_ativo_id IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'carrinho ativo de outro usuario')
   WHERE (
     SELECT usuario_id FROM carrinhos WHERE id = NEW.carrinho_ativo_id
   ) IS NOT NEW.id;
END;
