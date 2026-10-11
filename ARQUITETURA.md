# Arquitetura — Kaizen Autopeças

> Documentação técnica do projeto. O enunciado do teste está no [README](README.md).

Loja de autopeças (React + Node) que **consome a API do SIAC**, o ERP interno da
Kaizen.

O SIAC é dono do catálogo, do estoque e dos pedidos, e roda fora deste projeto.
Catálogo e pedidos **não existem aqui** — vêm do ERP por HTTP. Este repositório
guarda apenas o que é da loja: contas, endereços e carrinho.

---

## Arquitetura

```
   navegador                  loja (BFF)                    ERP
  ┌──────────┐    cookie    ┌────────────┐   X-API-Token  ┌──────────┐
  │  React   │ ───────────► │  Express   │ ─────────────► │ Express  │
  │  (Vite)  │ ◄─────────── │  :3001     │ ◄───────────── │ :3000    │
  └──────────┘    JSON      └─────┬──────┘     JSON       └────┬─────┘
                                  │                            │
                            ecommerce.db                   kaizen.db
                    usuários · endereços · carrinho    produtos · pedidos
```

Três decisões que seguem desse desenho:

**O token do ERP nunca chega ao navegador.** Ele vive só no processo do backend.
O front fala com a loja, a loja fala com o ERP. Se o token estivesse no React,
qualquer visitante leria o catálogo inteiro — e criaria pedidos.

**O ERP pode ficar numa rede privada.** Até as imagens passam pelo backend
(`/api/imagens/:arquivo`), então o ERP não precisa estar aberto ao navegador.

**O que é do ERP fica no ERP.** A loja não tem cópia de produto nem de pedido.
Preço e estoque são sempre lidos na hora, e não existe sincronização para dar
errado. O único dado de ligação é `pedidos_usuario`: o ERP conhece
"Fulano, CPF X", não a conta `fulano@email.com`.

---

### Por que o front não tem configuração

O front **não sabe onde a API está**, e isso é de propósito: `api/cliente.js`
chama `/api/...`, caminho relativo, sem host. Em desenvolvimento o Vite faz
proxy desse prefixo para o backend; em produção o backend serve o build do
front. Nos dois casos, front e API estão na **mesma origem**.

O que isso compra:

- O cookie `httpOnly` de sessão se comporta igual em desenvolvimento e em
  produção — não há o clássico "funciona local e quebra no servidor".
- Não existe preflight de CORS no caminho normal de uso.
- Não há variável de ambiente no front que alguém possa configurar errado.

O único valor acoplado é o alvo do proxy no `vite.config.js`, que acompanha a
porta do backend.

---

## Autenticação

- Senha com **scrypt** (`node:crypto`), salt por usuário e parâmetros gravados
  junto do hash. Sem dependência nativa para compilar na EC2, e scrypt é
  *memory-hard* — resiste a ataque com hardware dedicado, coisa que bcrypt não faz.
- Sessão em **JWT dentro de cookie `httpOnly`**, não em `localStorage`. Script
  injetado na página não lê o token. `SameSite=Lax` barra POST de outro site, e
  `secure` liga sozinho em produção.
- Login não diz se o e-mail existe: e-mail desconhecido e senha errada devolvem
  a mesma mensagem, e o caso sem usuário ainda gasta o tempo de um hash para não
  responder visivelmente mais rápido.
- O front **não guarda** quem está logado: pergunta ao servidor (`GET /api/auth/eu`)
  no boot. Só o servidor sabe.

---

## Endpoints

Tudo sob `/api`. Erros seguem o mesmo formato do ERP:
`{ erro: { codigo, mensagem, detalhes? }, request_id }`.

| Método | Rota                        | Sessão | O que faz                        |
| ------ | --------------------------- | :----: | -------------------------------- |
| GET    | `/health`                   |   —    | Saúde da loja **e do ERP**       |
| GET    | `/catalogo`                 |   —    | Vitrine, com busca e filtros     |
| GET    | `/catalogo/categorias`      |   —    | Categorias disponíveis           |
| GET    | `/catalogo/:codigo`         |   —    | Uma peça                         |
| GET    | `/imagens/:arquivo`         |   —    | Imagem (proxy do ERP)            |
| POST   | `/auth/cadastro`            |   —    | Cria conta e já abre sessão      |
| POST   | `/auth/login`               |   —    | Entra                            |
| POST   | `/auth/logout`              |   —    | Sai                              |
| GET    | `/auth/eu`                  |   ✓    | Quem está logado                 |
| GET    | `/perfil`                   |   ✓    | Dados da conta                   |
| PATCH  | `/perfil`                   |   ✓    | Edita nome, documento, telefone  |
| PATCH  | `/perfil/senha`             |   ✓    | Troca a senha                    |
| GET    | `/enderecos`                |   ✓    | Lista endereços                  |
| POST   | `/enderecos`                |   ✓    | Cadastra endereço                |
| PUT    | `/enderecos/:id`            |   ✓    | Edita endereço                   |
| DELETE | `/enderecos/:id`            |   ✓    | Remove endereço                  |
| GET    | `/carrinho`                 |   ✓    | Carrinho com preço/estoque atual |
| POST   | `/carrinho/itens`           |   ✓    | Adiciona item                    |
| PATCH  | `/carrinho/itens/:codigo`   |   ✓    | Muda a quantidade                |
| DELETE | `/carrinho/itens/:codigo`   |   ✓    | Remove item                      |
| DELETE | `/carrinho`                 |   ✓    | Esvazia                          |
| POST   | `/pedidos`                  |   ✓    | **Checkout**                     |
| GET    | `/pedidos`                  |   ✓    | Meus pedidos                     |
| GET    | `/pedidos/:numero`          |   ✓    | Detalhe do pedido                |

### Como as falhas do ERP chegam ao cliente

| Situação no ERP              | O que a loja devolve                       |
| ---------------------------- | ------------------------------------------ |
| Rede, timeout ou 5xx         | `502 ERP_INDISPONIVEL`                     |
| 401 (token errado)           | `502 ERP_NAO_AUTORIZADO` + log no servidor |
| 404 / 409 / 422              | Repassado como veio                        |

O 401 do ERP vira 5xx de propósito: token mal configurado é problema nosso, não
de quem está comprando. O 409 de estoque, ao contrário, é informação que a
pessoa precisa ver.

---

## Telas

| Rota                | Sessão | O que tem                                        |
| ------------------- | :----: | ------------------------------------------------ |
| `/`                 |   —    | Vitrine: busca, filtro por categoria, paginação   |
| `/produto/:codigo`  |   —    | Detalhe, escolha de quantidade                   |
| `/entrar`           |   —    | Login                                            |
| `/cadastro`         |   —    | Criar conta                                      |
| `/carrinho`         |   ✓    | Alterar quantidade, remover, esvaziar            |
| `/checkout`         |   ✓    | Escolher endereço (ou criar na hora), observação |
| `/pedidos`          |   ✓    | Histórico com status vindo do ERP                |
| `/pedidos/:numero`  |   ✓    | Itens, endereço e valores                        |
| `/perfil`           |   ✓    | Dados, endereços e troca de senha                |

A busca e os filtros vivem na URL (`/?busca=pastilha&categoria=FREIOS`), não no
estado do componente: o link é compartilhável, o botão voltar funciona e um F5
não perde a pesquisa.

`RotaProtegida` é **conveniência de navegação, não segurança** — quem protege os
dados é o backend, que exige sessão em toda rota privada e sempre filtra por
`usuario_id`. Trocar o id de um endereço ou o número de um pedido na URL devolve
404, não o dado de outra pessoa.

---

## Identidade visual

A cor da marca é **`#00a5ac`** (`marca-500`). A escala foi gerada a partir dela
mantendo o matiz (182°) e variando saturação e luminosidade — está em
`frontend/src/index.css`, no bloco `@theme`.

| Token       | Hex       | Contraste c/ branco | Onde usar                                  |
| ----------- | --------- | ------------------: | ------------------------------------------ |
| `marca-50`  | `#f0fbfc` |              1.05:1 | Fundo de item selecionado                  |
| `marca-100` | `#d9f6f7` |              1.14:1 | Badges                                     |
| `marca-500` | `#00a5ac` |          **3.01:1** | **A marca**: logo, hero, bordas, foco      |
| `marca-600` | `#00898f` |              4.22:1 | Anel de foco, superfícies                  |
| `marca-700` | `#006e73` |              6.04:1 | **Botão primário, links, logotipo**        |
| `marca-800` | `#02565a` |              8.46:1 | Hover de botão                             |
| `marca-900` | `#044144` |             11.38:1 | Fim do gradiente do hero                   |

O hero é um gradiente `marca-700 → marca-900`. Começar no `#00a5ac` puro foi a
primeira tentativa, mas o subtítulo tem 14px e precisa de 4.5:1 — contra o
início do gradiente dava 2.9:1. Hoje o pior ponto entrega 5.31:1.

### A pegadinha do #00a5ac

Teal nessa luminosidade dá **3.01:1 com branco**. O WCAG AA pede **4.5:1** para
texto normal — então a cor da marca, pura, **não pode ser fundo de botão com
texto pequeno** nem texto sobre fundo branco.

A regra que o projeto segue:

> **Superfície** (logo, hero, bordas, anel de foco, estado ativo) usa
> `marca-500`, o `#00a5ac` exato.
> **Qualquer coisa que carregue texto** usa `marca-700` ou mais escuro.

O quadrado do logo leva o `#00a5ac` puro, porque o "K" é grande e bold — aí
3:1 basta. Já a palavra "Autopeças" ao lado, com 18px bold, fica a 0,66px de
contar como "texto grande" no WCAG, então usa `marca-700`.

Onde o `#00a5ac` aparece de fato: o símbolo do logo, os 45 desenhos de peças,
as bordas de seleção e o anel de foco do teclado.

### Verificação

As 11 rotas foram auditadas com o contraste calculado **na página renderizada**
(cor e fundo efetivos, resolvidos via canvas — o Tailwind 4 emite `oklab()`, que
um parser de `rgb()` lê errado), comparando contra o mínimo exigido para o
tamanho e peso de cada texto. Zero falhas.

Botões desabilitados são isentos pelo WCAG 1.4.3, mas aqui seguem a regra assim
mesmo: "isento" não é desculpa para ninguém conseguir ler o rótulo.

Vermelho (sem estoque) e âmbar (últimas unidades) ficaram **fora da paleta de
propósito**: são sinais de alerta e precisam destoar da marca para serem lidos
como alerta. Os dois usam o tom 700, que passa em contraste.

---

## Regras de negócio que valem conhecer

- **Carrinho fica no servidor**, não no `localStorage`: trocar de navegador ou de
  celular mantém o que a pessoa escolheu.
- **Preço nunca congela no carrinho.** Guardamos só código e quantidade; preço,
  estoque e descrição são lidos do ERP a cada leitura. Item que ficou sem estoque
  aparece marcado em vez de quebrar a tela.
- **Checkout bloqueia com pendência.** Se algum item perdeu estoque, o botão
  trava até ajustar.
- **Endereço vai no snapshot do pedido.** O ERP não tem campo de entrega (vai na
  observação, como o SIAC recebe hoje), e a loja guarda uma cópia em JSON: editar
  o endereço depois não reescreve o histórico.
- **Primeiro endereço vira principal** sozinho. Apagar o principal promove o mais
  antigo que sobrou, para o checkout nunca ficar sem padrão.
- **O e-mail não é editável** no perfil: trocar o identificador de login pede
  confirmação por e-mail, que está fora do escopo.

---

## Estrutura

```
backend/
  src/
    server.js            bootstrap, graceful shutdown
    app.js               montagem do Express
    config.js            env + validação fail-fast
    db/                  schema e conexão SQLite
    erp/cliente.js       ÚNICO ponto que fala com o ERP
    middleware/          sessão JWT, request-id, erros
    routes/              HTTP: lê, chama o serviço, devolve JSON
    services/            regra de negócio
    lib/                 erros, validação, senha, dinheiro
frontend/
  src/
    api/cliente.js       fetch + tradução de erro
    contextos/           sessão e carrinho
    componentes/         UI compartilhada
    paginas/             uma por rota
```

Todo acesso ao ERP passa por `erp/cliente.js`. Trocar a URL, o modo de
autenticação ou pôr um cache atinge um arquivo só.

---

## Limitações conhecidas

Decisões de escopo assumidas pelo time, não esquecimentos:

- **Sem pagamento.** O pedido nasce como `ABERTO` no ERP; não há gateway, cálculo
  de frete nem emissão de nota.
- **Sem recuperação de senha.** Precisa de envio de e-mail.
- **Sem confirmação de e-mail** no cadastro, pelo mesmo motivo.
- **Sem testes automatizados.** Uma suíte com `node:test` cobrindo login, posse
  de pedido/endereço e o checkout com estoque insuficiente seria o primeiro passo.
- **Checkout não é transacional entre os dois sistemas.** Se o ERP criar o pedido
  e a gravação local falhar, o pedido existe mas não aparece em "meus pedidos".
  O log registra o número para reconciliar à mão; resolver de verdade pede um
  *outbox* ou um endpoint de cancelamento no ERP.
- **`GET /pedidos` faz N chamadas ao ERP** (uma por pedido da página, em
  paralelo) para trazer o status atual. Com páginas de 10 compensa a
  simplicidade; volume maior pediria cache ou consulta em lote no ERP.
- **CEP não consulta serviço externo.** Validamos só o formato; integrar ViaCEP
  para preencher o endereço seria uma melhoria natural.
- **Sem validação de dígito de CPF/CNPJ** — só o tamanho.
