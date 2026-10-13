# Relatório de entrega

**Candidato:** Isabelle Maciel de Oliveira
**Data de entrega:** 13/10/2026
**Tempo aproximado dedicado:** 2 dias

---

## 1. Subindo o projeto

**Localmente:** subi o backend (`npm ci`, `.env`, `npm run db:init`, `npm run dev`) e o frontend (`npm ci`, `npm run dev`). No Windows, os comandos com `rm -rf` e `&&` não funcionam no PowerShell; usei `Remove-Item` e um comando por linha.

**Com Docker:** empacotei a aplicação num container só, porque em produção o backend serve o site pronto, como descreve a ARQUITETURA. Para subir do zero, na raiz do projeto:

    Copy-Item backend\.env.example backend\.env
    notepad backend\.env   (preencher JWT_SEGREDO, ERP_URL e ERP_TOKEN)
    docker compose up --build

A loja abre em `http://localhost:3001`. O `.env` é lido na hora de subir e não entra na imagem; o banco fica num volume e sobrevive a um novo build; as migrações rodam sozinhas ao subir.

**Publicada:** https://kaizen-loja-isabelle.onrender.com (Render, a partir do mesmo Dockerfile). O serviço dorme após 15 minutos sem uso (o primeiro acesso depois disso leva cerca de 1 minuto) e o banco é recriado quando ele reinicia, então contas e carrinhos criados lá não são permanentes. Como a loja usa o token do ERP no servidor, qualquer visitante consegue fechar pedidos no SIAC de teste: é o comportamento esperado de uma loja, mas fica registrado. Em produção o cookie de sessão só é enviado em HTTPS; por isso a publicação precisa de HTTPS, e acesso pelo IP de um servidor sem certificado não mantém o login.

O mais confuso: o README fala em `SIAC_URL`/`SIAC_TOKEN`, mas o código lê `ERP_URL`/`ERP_TOKEN`. Quem segue o README erra o nome e não percebe, porque o código tinha os valores do ERP escritos como padrão e subia mesmo assim (ver Problema 2).


Também empacotei a aplicação em Docker. Para subir do zero, na raiz do projeto:

    Copy-Item backend\.env.example backend\.env
    notepad backend\.env   (preencher JWT_SEGREDO, ERP_URL e ERP_TOKEN)
    docker compose up --build

A loja abre em `http://localhost:3001`. Um container só: em produção o backend serve o site pronto, como descreve a ARQUITETURA. O `.env` é lido na hora de subir e não entra na imagem; o banco fica num volume e sobrevive a um novo build; a migração roda sozinha ao subir. O cookie de sessão sai como seguro em produção: funciona em `localhost`, mas acesso pelo IP da máquina exige HTTPS.


Arquivos que criei:
- `backend/.env` (não vai para o Git).
- `.gitignore`: o projeto não tinha e versionava o banco (`ecommerce.db`) e o build (`dist/`). Tirei os dois do Git.

---

## 2. Chamados reportados

### KZN-312 — Total do carrinho vem maior que a soma das peças

| | |
|---|---|
| **Causa** | O total somava todos os itens, inclusive os que não podem ser comprados (sem estoque, inativo ou estoque parcial). Além disso, a conversão para centavos usava `Math.floor`, que perdia 1 centavo em alguns preços (R$ 19,99 virava 1998 centavos). |
| **Como reproduzi** | A loja não deixa adicionar peça sem estoque, então simulei o caso real: a peça entra com estoque e zera depois (o estoque atualiza a cada 30 min). Coloquei um radiador sem estoque (R$ 684) direto no banco, junto com uma mola (R$ 184,20). O total mostrava R$ 868,20: exatamente os "R$ 684 a mais". |
| **Arquivos alterados** | `carrinhoService.js`, `dinheiro.js`, `Carrinho.jsx`, `Checkout.jsx` |
| **Como validei a correção** | No mesmo cenário, o total passou a mostrar R$ 184,20 no carrinho e no checkout. R$ 19,99 vira 1999 centavos. Os dois casos têm teste automático. |

Decisão: item com estoque parcial também fica fora do total, porque é a mesma regra que já bloqueia o checkout. O valor cobrado não muda, porque vem do ERP. Como as linhas deixaram de bater com o total, adicionei o aviso "Itens com pendência não entram no total." Pedidos antigos podem ter 1 centavo a menos no histórico da loja; não alterei dados antigos, porque o valor oficial é o do ERP.

### KZN-318 — Número no ícone do carrinho está errado

| | |
|---|---|
| **Causa** | O backend preenchia "quantidade de peças" com o número de linhas do carrinho. O frontend já usava o campo certo. |
| **Como reproduzi** | 3 molas + 4 pivôs (7 peças): o ícone mostrava 2. |
| **Arquivos alterados** | `carrinhoService.js`; em outro commit, os textos em `Cabecalho.jsx` e `Carrinho.jsx` |
| **Como validei a correção** | O mesmo cenário mostra 7 no ícone e no resumo. Tem teste automático. |

Corrigi no backend, onde estava o erro. Depois troquei o texto "Itens" por "Peças" no resumo e no leitor de tela, senão a confusão continuaria.

### KZN-325 — Busca diz que não encontrou peça que existe

| | |
|---|---|
| **Causa** | A busca mantinha o número da página na URL. Estando na página 2, buscar "amortecedor" pedia a página 2 de um resultado que só tem uma. Trocar categoria ou "só com estoque" tinha o mesmo problema. |
| **Como reproduzi** | Página 2 → buscar "amortecedor" → "Nenhuma peça encontrada". Da página 1, as peças aparecem. |
| **Arquivos alterados** | `lib/parametrosCatalogo.js` (novo), `Cabecalho.jsx`, `Catalogo.jsx` |
| **Como validei a correção** | Busca, categoria e "só com estoque" a partir das páginas 2 e 3 voltam para a página 1, e a paginação continua funcionando. |

Coloquei a regra num lugar só: qualquer filtro que mude volta para a página 1. Assim, um filtro criado no futuro já funciona certo sem ninguém precisar lembrar. Reproduzindo esse chamado, achei outro bug de paginação (Problema 1).

### KZN-331 — Pedido saiu com o endereço errado

| | |
|---|---|
| **Causa** | O checkout ignorava o endereço escolhido e enviava sempre o principal. |
| **Como reproduzi** | Dois endereços (Casa principal e Oficina). Escolhi Oficina e o pedido saiu para Casa. |
| **Arquivos alterados** | `Checkout.jsx` |
| **Como validei a correção** | Fechei um pedido real escolhendo Oficina, e ele saiu para Oficina. |

O backend já conferia se o endereço era do cliente. Mantive o erro 422 para endereço de outra pessoa: a resposta é igual à de um endereço que não existe, então não revela nada.

---

## 3. Problemas que encontrei por conta própria

### Corrigidos

| # | O que estava errado | Impacto | Arquivos |
|---|---|---|---|
| 1 | O botão "Próxima" travava uma página antes do fim. Achei reproduzindo o KZN-325. | O cliente nunca via a última página do catálogo. | `ui.jsx` |
| 2 | O segredo do login e o token do ERP estavam escritos no código, como padrão. | Com o segredo público, qualquer pessoa consegue entrar na conta de qualquer cliente. O token permite criar pedidos no SIAC. Agora, sem `.env`, a aplicação não sobe. **O token continua no histórico do Git e precisa ser trocado no SIAC**; o código sozinho não resolve isso. | `config.js` |
| 3 | O CORS aceitava qualquer site com o cookie de login. | Outro site poderia ler dados de quem está logado. Como front e API já ficam no mesmo endereço, deixei o CORS só em desenvolvimento e restrito ao endereço configurado. | `app.js` |
| 4 | O carrinho só carregava ao abrir a loja. Depois de sair, o ícone mostrava o carrinho de quem saiu. | Em computador compartilhado na oficina, o próximo funcionário via o carrinho do anterior. | `CarrinhoContext.jsx` |
| 5 | Uma falha no download de imagem do ERP não era tratada. | Se o ERP ficasse lento no meio de uma imagem, o servidor inteiro caía. Agora a falha é tratada e o servidor continua de pé. | `routes/imagens.js` |
| 6 | A observação do pedido (endereço + nota do cliente) era cortada em 500 caracteres sem aviso. O limite é do SIAC. | Com endereço longo, a nota do cliente sumia. Agora o pedido é recusado antes de ir ao ERP, dizendo quantos caracteres cabem. O endereço nunca é cortado. | `pedidoService.js` |
| 7 | Cinco textos de alerta usavam um vermelho mais claro do que a regra de contraste da ARQUITETURA permite. | Leitura de "Sem estoque" e de mensagens de erro. | `CardProduto.jsx`, `Produto.jsx`, `ui.jsx`, `Carrinho.jsx` |
| 8 | Editar um endereço sem informar "principal" desmarcava o principal, e dava para desmarcar o único. | Cliente ficava sem endereço padrão, contra a regra da ARQUITETURA. Agora isso é recusado com uma mensagem explicando o que fazer. | `enderecos.js`, `enderecoService.js` |
| 9 | O checkout chamava o ERP antes de limpar o carrinho, sem nenhuma trava. | Clique duplo ou duas abas criavam dois pedidos. Resolvido na funcionalidade nova (seção 4). | `pedidoService.js` |
| 10 | Item com estoque parcial ficava com a quantidade travada; o campo enviava uma requisição a cada tecla; "Fechar pedido" era um botão dentro de um link. | O cliente não conseguia reduzir a quantidade; havia risco de gravar valor errado; o HTML era inválido. Resolvido no painel novo. | `componentes/painel/*` |

Uma observação técnica: a análise inicial apontou que adicionar a mesma peça em duas abas daria erro. Na prática, não dava, porque o banco usado roda uma operação por vez em um único processo. Mesmo assim, deixei a operação protegida, porque o problema apareceria se a aplicação rodasse em mais de um processo. Já no checkout o risco era real, porque existe uma espera pelo ERP no meio da operação.

### Encontrados e não corrigidos

| O que está errado | Impacto | Por que não corrigi |
|---|---|---|
| Se esquecerem o `NODE_ENV` em produção, o cookie sai sem proteção e o erro 500 mostra detalhes. | Configuração insegura por esquecimento. | É decisão de deploy. No Docker já vai como `production`. |
| Login sem limite de tentativas. | Permite tentar senhas em massa. | Precisa de infraestrutura. |
| A sessão não é invalidada ao trocar a senha ou sair. | Uma sessão roubada vale até expirar (7 dias). | Precisa de controle de sessão no servidor. |
| O IP e o identificador de requisição vêm de cabeçalhos que o cliente pode forjar. | Logs com informação falsa. | Baixo impacto. |
| CPF/CNPJ é salvo do jeito que foi digitado (com ou sem pontos). | Se o SIAC comparar como texto, o mesmo CPF pode virar dois clientes. | Depende de uma regra do SIAC que não conheço. |
| Não dá para apagar o telefone do perfil. | Dado fica preso. | Pode ser decisão de produto. |
| O campo de busca não acompanha a URL ("limpar" deixa o texto). | Confuso, sem perda de dado. | Menor. |
| Se o catálogo falha ao carregar, a lista antiga continua na tela. | Confuso. | Menor. |
| Os links de entrar e criar conta perdem a página onde a pessoa estava. | Volta para o início. | Menor. |
| Peça removida do ERP aparece sem imagem no carrinho. | Visual. | Menor. |
| Mensagens do backend aparecem sem acento ("Ja existe..."). | Texto. | É a convenção do projeto. |
| No celular, o nome da loja aparece cortado, e algumas telas (paginação, produto, checkout, formulário de endereço) estouram a largura. | Layout. | Fiz o necessário para a funcionalidade funcionar no celular. |
| Código sem uso (`autenticarOpcional`) e um comentário em `main.jsx` que não condizia com o código. | Manutenção. | Só registrei. |

---

## 4. Múltiplos carrinhos

### Como ficou

Cada cliente pode ter até 10 carrinhos com nome (por exemplo, um por carro). Na vitrine, o ícone do carrinho abre um painel lateral sem sair da página: a busca e a página continuam onde estavam. No painel dá para trocar de carrinho, criar, renomear, apagar (com confirmação), mudar quantidades e ir para o checkout. No celular, uma barra fixa no rodapé mostra o carrinho, as peças e o total, e abre o mesmo painel de baixo para cima. O checkout fecha só o carrinho escolhido.

### Modelagem

- **Migrações com versão.** O banco não tinha como evoluir: o `schema.sql` só cria tabelas novas e não altera as que já existem. Criei migrações numeradas (`db/migracoes/002`, `003`). Cada uma roda inteira ou não roda nada, e o banco guarda em qual versão está.
- **Tabela `carrinhos` (nova):** dono, nome (1 a 40 caracteres, único por pessoa), situação (`ABERTO` ou `FECHANDO`), datas.
- **Tabela `carrinho_itens`:** cada item passou a pertencer a um carrinho, e não mais direto à pessoa. O dono do item vem do carrinho, então existe uma fonte só para essa informação.
- **`usuarios.carrinho_ativo_id`:** guarda o carrinho aberto no servidor. Uma regra no banco impede que ele aponte para o carrinho de outra pessoa.
- **Quem já tinha carrinho não perdeu nada:** a migração colocou os itens existentes num "Meu carrinho". Testei com banco vazio, com dois usuários, rodando duas vezes, com erro forçado no meio e numa cópia do banco real.

| Método | Rota | O que faz |
|---|---|---|
| GET | `/api/carrinhos` | Lista os carrinhos da pessoa (sem consultar o ERP) |
| POST | `/api/carrinhos` | Cria um carrinho (sem nome vira "Carrinho N") e deixa ele ativo |
| PATCH | `/api/carrinhos/:id` | Renomeia |
| DELETE | `/api/carrinhos/:id` | Apaga |
| POST | `/api/carrinhos/:id/ativar` | Troca o carrinho ativo |
| GET | `/api/carrinhos/:id` | Mostra o carrinho com preço e estoque do ERP |
| POST / PATCH / DELETE | `/api/carrinhos/:id/itens[/:codigo]` | Mexe nas peças de um carrinho |
| POST | `/api/pedidos` | Passa a aceitar `carrinho_id` (sem ele, usa o ativo) |
| — | `/api/carrinho/*` | Continuam iguais, operando no carrinho ativo, para não quebrar quem já usa |

### Decisões que o enunciado deixou abertas

| Pergunta | Sua decisão | Motivo |
|---|---|---|
| Quantos carrinhos por pessoa? Tem limite? | Até 10, com nome único ("Gol" e "gol" contam como iguais, e "São" e "são" também). | Cada carrinho aberto consulta o ERP peça por peça; o limite protege o SIAC. Uma oficina dificilmente tem mais de 10 orçamentos abertos. Nome único evita dois carrinhos com o mesmo nome. |
| O que acontece ao apagar o carrinho ativo? | O carrinho usado por último vira o ativo. Se não sobrar nenhum, nasce um "Meu carrinho" vazio. | A pessoa nunca fica sem carrinho. Essa regra fica numa função só. |
| Como o carrinho aparece na vitrine? | Painel lateral que abre por cima da vitrine. | A pessoa não perde a busca nem a página. O painel funciona só com teclado e com leitor de tela. |
| E no celular? | Barra no rodapé que abre o mesmo painel de baixo para cima. | Ocupa pouco espaço e fica ao alcance do polegar. É o mesmo componente, sem duplicar código. |
| Qual carrinho vem selecionado ao entrar? | O último que estava ativo, salvo no servidor. | A pessoa continua de onde parou, em qualquer aparelho. |
| O que acontece com os carrinhos após fechar um pedido? | Só o carrinho fechado é apagado. Os outros continuam iguais. | O pedido vira o registro da compra, e os outros orçamentos não podem ser afetados. |

**Pedido duplicado:** antes de chamar o ERP, o checkout marca o carrinho como `FECHANDO`, numa operação que só uma requisição consegue fazer por vez. A segunda recebe "esse carrinho já está sendo fechado". Se o ERP recusar, o carrinho volta a ficar aberto. Se o ERP aceitar, o pedido é salvo e o carrinho é apagado. Se o servidor cair no meio, a trava expira em 5 minutos. Se o ERP aceitou mas a loja não conseguiu salvar, a trava fica permanente, para não gerar um segundo pedido, e o log avisa para reconciliar manualmente.

### Isolamento

Toda consulta de carrinho e de item confere o dono. Quem tenta mexer no carrinho de outra pessoa recebe "não encontrado", a mesma resposta de um carrinho que não existe. O banco também impede que o carrinho ativo aponte para outra pessoa. No frontend, uma resposta só é aplicada se a pessoa logada ainda for a mesma de quando a requisição saiu. Testei com duas contas: a segunda não conseguiu ler, renomear, ativar, adicionar, esvaziar nem apagar o carrinho da primeira.

---

## 5. Como testei

**Manual, no navegador, com o SIAC de teste.** Reproduzi os 4 chamados antes de corrigir e testei de novo depois. Na funcionalidade nova: criar, renomear (inclusive com nome repetido), trocar, apagar, mudar quantidade pelo teclado e pelos botões, estoque insuficiente, painel só com teclado, painel aberto na página 2 sem perder a página, e tela de celular. Pedidos reais: entrega na Oficina; dois "Confirmar pedido" ao mesmo tempo (só um pedido foi criado); fechar um carrinho que não era o primeiro (só ele foi apagado).

**Testes automáticos** do backend, sem nenhuma biblioteca nova:

```
cd backend
npm test
```

São 15 testes: conversão de dinheiro, migração do banco, KZN-312, KZN-318, isolamento entre usuários, limite e nome dos carrinhos, apagar o ativo, e o checkout (sucesso, clique duplo, ERP fora do ar, falha ao salvar e carrinho travado). Os testes usam um banco em memória e um ERP falso, então rodam sem internet, sem `.env` e conseguem simular falhas que não dá para provocar no SIAC de verdade.

Um teste extra confere, só lendo, se o SIAC real continua respondendo no formato que o ERP falso imita. Ele não cria pedido:

```
$env:ERP_REAL = '1'; node --test .\test\contrato-erp.test.js; Remove-Item Env:ERP_REAL
```

Os testes automáticos cobrem as regras do backend. As rotas e as telas eu testei manualmente.

---

## 6. Decisões e suposições

- O estoque que a loja mostra pode estar até 30 minutos atrasado. A loja confere antes, mas quem decide no fim é o ERP, e a recusa dele chega ao cliente com uma mensagem clara.
- Mantive as rotas antigas do carrinho funcionando, para não quebrar quem já usa a API.
- Mantive as mensagens do backend sem acento, que é a convenção do projeto.
- Discordo de deixar segredos como padrão no código "para subir sem configurar". É uma conveniência que custava a segurança das contas. Prefiro que a aplicação não suba sem configuração.

---

## 7. O que faria com mais tempo

1. Uma fila de reconciliação (outbox) no checkout, para resolver de vez o caso raro em que o ERP aceita o pedido e a loja não consegue salvar.
2. Trocar o token do ERP e reforçar produção: exigir `NODE_ENV`, limitar tentativas de login e invalidar sessão ao trocar a senha.
3. Testes automáticos das rotas e das telas.
4. Ajustar as telas que ainda quebram no celular.
5. Guardar os produtos por alguns segundos em memória, para o carrinho consultar menos o ERP (o estoque só muda a cada 30 minutos).
6. Os itens menores da seção 3.

---

## 8. Outras observações

- Commits pequenos, um por problema, com a causa e a correção na mensagem. Cada frente teve sua branch e seu PR.
- Usei IA (Cursor) como apoio. Defini o plano e as decisões, revisei cada alteração antes de commitar e validei no navegador e nos testes.
- Risco conhecido: se a pessoa adicionar uma peça no primeiro segundo depois de abrir a loja, o ícone pode mostrar a quantidade antiga até a próxima ação. O carrinho no servidor fica correto.
