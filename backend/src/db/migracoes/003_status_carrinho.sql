-- Versao 3. Trava do checkout. ADD COLUMN com DEFAULT nao reconstroi a tabela.
-- O prazo para reassumir uma trava velha fica no service.

ALTER TABLE carrinhos
  ADD COLUMN status TEXT NOT NULL DEFAULT 'ABERTO'
  CHECK (status IN ('ABERTO', 'FECHANDO'));

ALTER TABLE carrinhos
  ADD COLUMN fechando_em TEXT;
