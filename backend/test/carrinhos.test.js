import assert from 'node:assert/strict';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import Database from 'better-sqlite3';

const erp = await subirErp();

process.env.ERP_URL = erp.url;
process.env.ERP_TOKEN = 'token-de-teste';
process.env.ERP_TIMEOUT_MS = '3000';
process.env.DB_PATH = path.join(os.tmpdir(), `kaizen-testes-nao-usar-${process.pid}.db`);

const carrinho = await import('../src/services/carrinhoService.js');
const pedido = await import('../src/services/pedidoService.js');
const { aplicarSchema } = await import('../src/db/index.js');

test.after(async () => {
  await erp.fechar();
});

test.beforeEach(() => {
  erp.estado.produtos.clear();
  erp.estado.chamadas = 0;
  erp.estado.espera = null;
  erp.estado.avisarChegada = null;
  erp.estado.erro = null;
  erp.estado.numeroFixo = null;
  erp.estado.atrasoMs = 0;
});

function publicar(codigo, opcoes = {}) {
  const produto = {
    codigo: String(codigo).toUpperCase(),
    descricao: String(codigo),
    marca: 'Kaizen',
    categoria: 'Motor',
    aplicacao: 'Geral',
    preco_unitario: opcoes.preco ?? 10,
    estoque: opcoes.estoque ?? 20,
    ativo: opcoes.ativo ?? true,
  };
  erp.estado.produtos.set(produto.codigo, produto);
  return produto;
}

function abrirBanco() {
  const db = new Database(':memory:');
  assert.equal(db.name, ':memory:');
  aplicarSchema(db);
  return db;
}

function criarUsuario(db, email) {
  const agora = '2026-01-01T00:00:00.000Z';
  const id = Number(db.prepare(`
    INSERT INTO usuarios (nome, email, senha_hash, documento, telefone, criado_em, atualizado_em)
    VALUES ('Cliente', ?, 'x', '12345678901', null, ?, ?)
  `).run(email, agora, agora).lastInsertRowid);
  const enderecoId = Number(db.prepare(`
    INSERT INTO enderecos (
      usuario_id, apelido, cep, logradouro, numero, complemento, bairro, cidade, uf, principal, criado_em, atualizado_em
    ) VALUES (?, 'Casa', '01310-100', 'Paulista', '100', null, 'Bela Vista', 'Sao Paulo', 'SP', 1, ?, ?)
  `).run(id, agora, agora).lastInsertRowid);
  return { id, nome: 'Cliente', documento: '12345678901', enderecoId };
}

function colocarItem(db, carrinhoId, codigo, quantidade = 1) {
  db.prepare(`
    INSERT INTO carrinho_itens (carrinho_id, codigo_produto, quantidade, adicionado_em)
    VALUES (?, ?, ?, '2026-01-01T00:00:00.000Z')
  `).run(carrinhoId, codigo, quantidade);
}

async function capturar(valor) {
  try {
    const resultado = typeof valor === 'function' ? valor() : valor;
    return { ok: await resultado };
  } catch (erro) {
    return { erro };
  }
}

test('KZN-312: o total do carrinho ignora item indisponivel', async () => {
  const db = abrirBanco();
  try {
    const pessoa = criarUsuario(db, 'total@email.com');
    const alvo = carrinho.criarCarrinho(pessoa.id, 'Compras', db);
    publicar('FILTRO', { preco: 10, estoque: 10 });
    publicar('RADIADOR', { preco: 684, estoque: 0 });
    colocarItem(db, alvo.id, 'FILTRO', 1);
    colocarItem(db, alvo.id, 'RADIADOR', 1);

    const leitura = await carrinho.lerItens(pessoa.id, alvo.id, db);
    const radiador = leitura.itens.find((item) => item.codigo_produto === 'RADIADOR');

    assert.equal(radiador.disponivel, false);
    assert.equal(leitura.valor_total, 10);
  } finally {
    db.close();
  }
});

test('KZN-318: quantidade_pecas soma as quantidades', async () => {
  const db = abrirBanco();
  try {
    const pessoa = criarUsuario(db, 'pecas@email.com');
    const alvo = carrinho.criarCarrinho(pessoa.id, 'Compras', db);
    publicar('FILTRO', { estoque: 10 });
    publicar('VELA', { estoque: 10 });
    colocarItem(db, alvo.id, 'FILTRO', 3);
    colocarItem(db, alvo.id, 'VELA', 4);

    const leitura = await carrinho.lerCarrinho(pessoa.id, db);

    assert.equal(leitura.quantidade_itens, 2);
    assert.equal(leitura.quantidade_pecas, 7);
  } finally {
    db.close();
  }
});

test('usuario A recebe 404 ao ler, alterar, renomear, apagar e ativar o carrinho do B', async () => {
  const db = abrirBanco();
  try {
    const a = criarUsuario(db, 'a@email.com');
    const b = criarUsuario(db, 'b@email.com');
    const doB = carrinho.criarCarrinho(b.id, 'Do B', db);
    publicar('DISCO', { estoque: 10 });
    colocarItem(db, doB.id, 'DISCO', 2);
    const antes = {
      carrinho: db.prepare('SELECT id, nome, atualizado_em FROM carrinhos WHERE id = ?').get(doB.id),
      quantidade: db.prepare('SELECT quantidade FROM carrinho_itens WHERE carrinho_id = ?').get(doB.id).quantidade,
      ativoA: db.prepare('SELECT carrinho_ativo_id FROM usuarios WHERE id = ?').get(a.id).carrinho_ativo_id,
      ativoB: db.prepare('SELECT carrinho_ativo_id FROM usuarios WHERE id = ?').get(b.id).carrinho_ativo_id,
    };

    const operacoes = [
      () => carrinho.lerItens(a.id, doB.id, db),
      () => carrinho.alterarQuantidadeNoCarrinho(a.id, doB.id, 'DISCO', 9, db),
      () => carrinho.renomearCarrinho(a.id, doB.id, 'Invadido', db),
      () => carrinho.apagarCarrinho(a.id, doB.id, db),
      () => carrinho.ativarCarrinho(a.id, doB.id, db),
    ];

    for (const operacao of operacoes) {
      const resultado = await capturar(operacao);
      assert.equal(resultado.erro?.status, 404);
      assert.equal(resultado.erro?.codigo, 'NAO_ENCONTRADO');
      assert.equal(resultado.erro?.mensagem, 'Carrinho nao encontrado.');
    }

    assert.deepEqual(
      db.prepare('SELECT id, nome, atualizado_em FROM carrinhos WHERE id = ?').get(doB.id),
      antes.carrinho,
    );
    assert.equal(
      db.prepare('SELECT quantidade FROM carrinho_itens WHERE carrinho_id = ?').get(doB.id).quantidade,
      antes.quantidade,
    );
    assert.equal(db.prepare('SELECT carrinho_ativo_id FROM usuarios WHERE id = ?').get(a.id).carrinho_ativo_id, antes.ativoA);
    assert.equal(db.prepare('SELECT carrinho_ativo_id FROM usuarios WHERE id = ?').get(b.id).carrinho_ativo_id, antes.ativoB);
  } finally {
    db.close();
  }
});

test('um usuario nao passa de 10 carrinhos', () => {
  const db = abrirBanco();
  try {
    const pessoa = criarUsuario(db, 'limite@email.com');
    for (let n = 1; n <= 10; n += 1) carrinho.criarCarrinho(pessoa.id, `Lista ${n}`, db);

    assert.throws(
      () => carrinho.criarCarrinho(pessoa.id, 'Lista 11', db),
      (erro) => erro.status === 409 && erro.codigo === 'LIMITE_CARRINHOS',
    );
    assert.equal(db.prepare('SELECT COUNT(*) AS total FROM carrinhos WHERE usuario_id = ?').get(pessoa.id).total, 10);
  } finally {
    db.close();
  }
});

test('o nome do carrinho e unico: Gol/gol e Sao/sao', () => {
  const db = abrirBanco();
  try {
    const pessoa = criarUsuario(db, 'nome@email.com');
    carrinho.criarCarrinho(pessoa.id, 'Gol', db);
    carrinho.criarCarrinho(pessoa.id, 'São', db);

    assert.throws(
      () => carrinho.criarCarrinho(pessoa.id, 'gol', db),
      (erro) => erro.status === 409 && erro.codigo === 'NOME_EM_USO',
    );
    assert.throws(
      () => carrinho.criarCarrinho(pessoa.id, 'são', db),
      (erro) => erro.status === 409 && erro.codigo === 'NOME_EM_USO',
    );
    assert.deepEqual(
      db.prepare('SELECT nome FROM carrinhos WHERE usuario_id = ? ORDER BY id').all(pessoa.id),
      [{ nome: 'Gol' }, { nome: 'São' }],
    );
  } finally {
    db.close();
  }
});

test('apagar o ativo ativa o usado por ultimo e apagar o ultimo cria Meu carrinho', async () => {
  const db = abrirBanco();
  try {
    const pessoa = criarUsuario(db, 'ativo@email.com');
    const a = carrinho.criarCarrinho(pessoa.id, 'A', db);
    const b = carrinho.criarCarrinho(pessoa.id, 'B', db);
    const c = carrinho.criarCarrinho(pessoa.id, 'C', db);
    db.prepare('UPDATE carrinhos SET atualizado_em = ? WHERE id = ?').run('2020-01-01T00:00:00.000Z', b.id);
    db.prepare('UPDATE carrinhos SET atualizado_em = ? WHERE id = ?').run('2020-01-02T00:00:00.000Z', a.id);
    publicar('PECA', { estoque: 5 });
    await carrinho.adicionarItemNoCarrinho(pessoa.id, a.id, 'PECA', 1, db);

    const depoisDeC = carrinho.apagarCarrinho(pessoa.id, c.id, db);
    assert.equal(depoisDeC.id, a.id);

    carrinho.apagarCarrinho(pessoa.id, a.id, db);
    const ultimo = carrinho.apagarCarrinho(pessoa.id, b.id, db);

    assert.equal(ultimo.nome, 'Meu carrinho');
    assert.deepEqual(
      db.prepare('SELECT nome FROM carrinhos WHERE usuario_id = ?').all(pessoa.id),
      [{ nome: 'Meu carrinho' }],
    );
    assert.equal(
      db.prepare('SELECT carrinho_ativo_id FROM usuarios WHERE id = ?').get(pessoa.id).carrinho_ativo_id,
      ultimo.id,
    );
    assert.equal(db.prepare('SELECT COUNT(*) AS total FROM carrinho_itens').get().total, 0);
  } finally {
    db.close();
  }
});

test('adicionar a mesma peca soma a quantidade e trava em 99', async () => {
  const db = abrirBanco();
  try {
    const pessoa = criarUsuario(db, 'soma@email.com');
    const alvo = carrinho.criarCarrinho(pessoa.id, 'Pecas', db);
    publicar('DISCO', { estoque: 200 });

    let leitura = await carrinho.adicionarItemNoCarrinho(pessoa.id, alvo.id, 'DISCO', 40, db);
    leitura = await carrinho.adicionarItemNoCarrinho(pessoa.id, alvo.id, 'DISCO', 40, db);
    assert.equal(leitura.itens.length, 1);
    assert.equal(leitura.itens[0].quantidade, 80);

    leitura = await carrinho.adicionarItemNoCarrinho(pessoa.id, alvo.id, 'DISCO', 30, db);
    assert.equal(leitura.itens.length, 1);
    assert.equal(leitura.itens[0].quantidade, 99);
  } finally {
    db.close();
  }
});

test('checkout com sucesso apaga so aquele carrinho e mantem os outros', async () => {
  const db = abrirBanco();
  try {
    const pessoa = criarUsuario(db, 'checkout@email.com');
    const outro = carrinho.criarCarrinho(pessoa.id, 'Outro', db);
    const alvo = carrinho.criarCarrinho(pessoa.id, 'Alvo', db);
    publicar('FILTRO', { estoque: 5, preco: 10 });
    colocarItem(db, outro.id, 'DISCO', 1);
    colocarItem(db, alvo.id, 'FILTRO', 1);

    const resultado = await pedido.finalizarPedido(pessoa, pessoa.enderecoId, null, alvo.id, db);

    assert.equal(resultado.numero, db.prepare('SELECT numero_erp FROM pedidos_usuario').get().numero_erp);
    assert.deepEqual(
      db.prepare('SELECT id, nome FROM carrinhos WHERE usuario_id = ?').all(pessoa.id),
      [{ id: outro.id, nome: 'Outro' }],
    );
    assert.deepEqual(
      db.prepare('SELECT codigo_produto, quantidade FROM carrinho_itens').all(),
      [{ codigo_produto: 'DISCO', quantidade: 1 }],
    );
    assert.equal(
      db.prepare('SELECT carrinho_ativo_id FROM usuarios WHERE id = ?').get(pessoa.id).carrinho_ativo_id,
      outro.id,
    );
  } finally {
    db.close();
  }
});

test('duas finalizacoes simultaneas: uma conclui, a outra responde 409 e o ERP e chamado uma vez', { timeout: 5000 }, async () => {
  const db = abrirBanco();
  try {
    const pessoa = criarUsuario(db, 'corrida@email.com');
    const alvo = carrinho.criarCarrinho(pessoa.id, 'Corrida', db);
    publicar('VELA', { estoque: 5 });
    colocarItem(db, alvo.id, 'VELA', 1);

    let soltar;
    erp.estado.espera = new Promise((resolve) => {
      soltar = resolve;
    });
    erp.estado.chegada = new Promise((resolve) => {
      erp.estado.avisarChegada = resolve;
    });

    const primeira = pedido.finalizarPedido(pessoa, pessoa.enderecoId, null, alvo.id, db);
    const segunda = pedido.finalizarPedido(pessoa, pessoa.enderecoId, null, alvo.id, db);
    const rejeitada = await capturar(segunda);

    assert.equal(rejeitada.erro?.status, 409);
    assert.equal(rejeitada.erro?.codigo, 'CARRINHO_EM_FECHAMENTO');
    await erp.estado.chegada;
    assert.equal(erp.estado.chamadas, 1);
    soltar();

    const concluida = await primeira;
    assert.ok(concluida.numero);
    assert.equal(erp.estado.chamadas, 1);
    assert.equal(db.prepare('SELECT COUNT(*) AS total FROM pedidos_usuario').get().total, 1);
  } finally {
    db.close();
  }
});

test('se o ERP falha no checkout, o carrinho volta a ABERTO com os itens', async (t) => {
  t.mock.method(console, 'error', () => {});
  const db = abrirBanco();
  try {
    const pessoa = criarUsuario(db, 'falha@email.com');
    const alvo = carrinho.criarCarrinho(pessoa.id, 'Falha', db);
    publicar('PASTILHA', { estoque: 5 });
    colocarItem(db, alvo.id, 'PASTILHA', 1);
    erp.estado.erro = 500;

    const resultado = await capturar(pedido.finalizarPedido(pessoa, pessoa.enderecoId, null, alvo.id, db));
    const linha = db.prepare('SELECT status, fechando_em FROM carrinhos WHERE id = ?').get(alvo.id);

    assert.equal(resultado.erro?.status, 502);
    assert.equal(linha.status, 'ABERTO');
    assert.equal(linha.fechando_em, null);
    assert.deepEqual(
      db.prepare('SELECT codigo_produto, quantidade FROM carrinho_itens WHERE carrinho_id = ?').all(alvo.id),
      [{ codigo_produto: 'PASTILHA', quantidade: 1 }],
    );
    assert.equal(db.prepare('SELECT COUNT(*) AS total FROM pedidos_usuario').get().total, 0);
  } finally {
    db.close();
  }
});

test('se o ERP aceita e a gravacao local falha, a trava fica permanente e nova tentativa responde 409', async (t) => {
  const erros = t.mock.method(console, 'error', () => {});
  const db = abrirBanco();
  try {
    const pessoa = criarUsuario(db, 'local@email.com');
    const alvo = carrinho.criarCarrinho(pessoa.id, 'Local', db);
    publicar('BOMBA', { estoque: 5 });
    colocarItem(db, alvo.id, 'BOMBA', 1);
    erp.estado.numeroFixo = 'PED-DUP';
    db.prepare(`
      INSERT INTO pedidos_usuario (usuario_id, numero_erp, endereco_entrega, valor_total_centavos, criado_em)
      VALUES (?, 'PED-DUP', '{}', 100, '2026-01-01T00:00:00.000Z')
    `).run(pessoa.id);

    const primeira = await capturar(pedido.finalizarPedido(pessoa, pessoa.enderecoId, null, alvo.id, db));
    const linha = db.prepare('SELECT status, fechando_em FROM carrinhos WHERE id = ?').get(alvo.id);

    assert.equal(primeira.erro?.code, 'SQLITE_CONSTRAINT_UNIQUE');
    const reconciliacao = erros.mock.calls.map((chamada) => chamada.arguments.map(String).join(' '));
    assert.ok(
      reconciliacao.some((texto) => texto.includes('PED-DUP') && texto.includes('Reconciliar manualmente')),
    );
    assert.equal(linha.status, 'FECHANDO');
    assert.equal(linha.fechando_em, null);

    const segunda = await capturar(pedido.finalizarPedido(pessoa, pessoa.enderecoId, null, alvo.id, db));
    const depois = db.prepare('SELECT status, fechando_em FROM carrinhos WHERE id = ?').get(alvo.id);

    assert.equal(segunda.erro?.status, 409);
    assert.equal(segunda.erro?.codigo, 'CARRINHO_EM_FECHAMENTO');
    assert.equal(erp.estado.chamadas, 1);
    assert.equal(depois.status, 'FECHANDO');
    assert.equal(depois.fechando_em, null);
    assert.deepEqual(
      db.prepare('SELECT codigo_produto, quantidade FROM carrinho_itens WHERE carrinho_id = ?').all(alvo.id),
      [{ codigo_produto: 'BOMBA', quantidade: 1 }],
    );
  } finally {
    db.close();
  }
});

test('carrinho FECHANDO recusa adicionar, alterar, remover, limpar, renomear e apagar com 409', async () => {
  const db = abrirBanco();
  try {
    const pessoa = criarUsuario(db, 'trava@email.com');
    const alvo = carrinho.criarCarrinho(pessoa.id, 'Travado', db);
    publicar('CORREIA', { estoque: 10 });
    publicar('NOVA', { estoque: 10 });
    colocarItem(db, alvo.id, 'CORREIA', 1);
    db.prepare(`UPDATE carrinhos SET status = 'FECHANDO', fechando_em = ? WHERE id = ?`)
      .run('2026-10-13T03:00:00.000Z', alvo.id);

    const antes = {
      usuario: db.prepare('SELECT carrinho_ativo_id FROM usuarios WHERE id = ?').get(pessoa.id),
      carrinho: db.prepare('SELECT id, nome, status, fechando_em, criado_em, atualizado_em FROM carrinhos WHERE id = ?').get(alvo.id),
      itens: db.prepare('SELECT id, codigo_produto, quantidade FROM carrinho_itens WHERE carrinho_id = ?').all(alvo.id),
      total: db.prepare('SELECT COUNT(*) AS total FROM carrinhos WHERE usuario_id = ?').get(pessoa.id).total,
    };

    const operacoes = [
      () => carrinho.adicionarItemNoCarrinho(pessoa.id, alvo.id, 'NOVA', 1, db),
      () => carrinho.alterarQuantidadeNoCarrinho(pessoa.id, alvo.id, 'CORREIA', 2, db),
      () => carrinho.removerItemNoCarrinho(pessoa.id, alvo.id, 'CORREIA', db),
      () => carrinho.limparItens(pessoa.id, alvo.id, db),
      () => carrinho.renomearCarrinho(pessoa.id, alvo.id, 'Outro nome', db),
      () => carrinho.apagarCarrinho(pessoa.id, alvo.id, db),
    ];

    for (const operacao of operacoes) {
      const resultado = await capturar(operacao);
      assert.equal(resultado.erro?.status, 409);
      assert.equal(resultado.erro?.codigo, 'CARRINHO_EM_FECHAMENTO');
    }

    assert.deepEqual(db.prepare('SELECT carrinho_ativo_id FROM usuarios WHERE id = ?').get(pessoa.id), antes.usuario);
    assert.deepEqual(
      db.prepare('SELECT id, nome, status, fechando_em, criado_em, atualizado_em FROM carrinhos WHERE id = ?').get(alvo.id),
      antes.carrinho,
    );
    assert.deepEqual(
      db.prepare('SELECT id, codigo_produto, quantidade FROM carrinho_itens WHERE carrinho_id = ?').all(alvo.id),
      antes.itens,
    );
    assert.equal(db.prepare('SELECT COUNT(*) AS total FROM carrinhos WHERE usuario_id = ?').get(pessoa.id).total, antes.total);
  } finally {
    db.close();
  }
});

function subirErp() {
  const estado = {
    produtos: new Map(),
    chamadas: 0,
    espera: null,
    avisarChegada: null,
    erro: null,
    numeroFixo: null,
    atrasoMs: 0,
  };

  const servidor = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');

    if (req.method === 'GET' && url.pathname.startsWith('/produtos/')) {
      const codigo = decodeURIComponent(url.pathname.slice('/produtos/'.length)).toUpperCase();
      const produto = estado.produtos.get(codigo);
      if (!produto) {
        res.writeHead(404, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ erro: { codigo: 'NAO_ENCONTRADO', mensagem: 'Produto nao encontrado.' } }));
        return;
      }
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ dados: produto }));
      return;
    }

    if (req.method === 'POST' && url.pathname === '/pedidos') {
      const pedacos = [];
      for await (const pedaco of req) pedacos.push(pedaco);
      void pedacos;
      estado.chamadas += 1;
      estado.avisarChegada?.();
      if (estado.atrasoMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, estado.atrasoMs));
      }
      if (estado.espera) await estado.espera;
      if (estado.erro) {
        res.writeHead(estado.erro, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ erro: { codigo: 'FALHA', mensagem: 'erp recusou' } }));
        return;
      }
      const numero = estado.numeroFixo ?? `PED-${Date.now()}-${estado.chamadas}`;
      res.writeHead(201, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ dados: { numero, valor_total: 10, situacao: 'ABERTO' } }));
      return;
    }

    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ erro: { codigo: 'NAO_ENCONTRADO', mensagem: 'rota inexistente' } }));
  });

  return new Promise((resolve) => {
    servidor.listen(0, '127.0.0.1', () => {
      const porta = servidor.address().port;
      resolve({
        estado,
        url: `http://127.0.0.1:${porta}`,
        fechar: () => new Promise((fechar) => servidor.close(fechar)),
      });
    });
  });
}
