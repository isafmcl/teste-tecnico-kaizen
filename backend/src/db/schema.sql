-- =============================================================================
-- Kaizen Autopecas - e-commerce
--
-- Este banco guarda SOMENTE o que pertence a loja: quem e o cliente, onde ele
-- mora e o que esta no carrinho dele.
--
-- Catalogo e pedidos NAO ficam aqui - sao do ERP, consultados por HTTP.
-- A unica coisa que a loja guarda sobre um pedido e o vinculo
-- "numero do pedido no ERP" <-> "usuario que fez", porque o ERP so conhece
-- nome e documento do cliente, nao a conta do site.
-- =============================================================================

CREATE TABLE IF NOT EXISTS usuarios (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  nome          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  senha_hash    TEXT NOT NULL,
  documento     TEXT NOT NULL,
  telefone      TEXT,
  criado_em     TEXT NOT NULL,
  atualizado_em TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios (email);

CREATE TABLE IF NOT EXISTS enderecos (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id    INTEGER NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  apelido       TEXT    NOT NULL,
  cep           TEXT    NOT NULL,
  logradouro    TEXT    NOT NULL,
  numero        TEXT    NOT NULL,
  complemento   TEXT,
  bairro        TEXT    NOT NULL,
  cidade        TEXT    NOT NULL,
  uf            TEXT    NOT NULL,
  principal     INTEGER NOT NULL DEFAULT 0 CHECK (principal IN (0, 1)),
  criado_em     TEXT    NOT NULL,
  atualizado_em TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_enderecos_usuario ON enderecos (usuario_id);

-- Carrinho persistido: o cliente fecha o navegador e encontra tudo de volta.
-- Guarda so o codigo do produto; preco e descricao vem do ERP na hora de ler,
-- entao o carrinho nunca mostra preco velho.
CREATE TABLE IF NOT EXISTS carrinho_itens (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id     INTEGER NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  codigo_produto TEXT    NOT NULL,
  quantidade     INTEGER NOT NULL CHECK (quantidade > 0),
  adicionado_em  TEXT    NOT NULL,
  UNIQUE (usuario_id, codigo_produto)
);

CREATE INDEX IF NOT EXISTS idx_carrinho_usuario ON carrinho_itens (usuario_id);

-- Vinculo com o pedido que vive no ERP.
-- `endereco_entrega` e um snapshot em JSON: o ERP nao tem esse dado, e se o
-- cliente editar o endereco depois, o historico do pedido nao pode mudar.
CREATE TABLE IF NOT EXISTS pedidos_usuario (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id           INTEGER NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  numero_erp           TEXT    NOT NULL UNIQUE,
  endereco_entrega     TEXT    NOT NULL,
  valor_total_centavos INTEGER NOT NULL DEFAULT 0,
  criado_em            TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pedidos_usuario ON pedidos_usuario (usuario_id);
