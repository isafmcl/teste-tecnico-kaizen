# Teste Técnico — Kaizen Autopeças

Bem-vindo. Este repositório é a loja virtual da Kaizen Autopeças: um e-commerce
de peças (React + Node) que consome a API do **SIAC**, o ERP interno da empresa.

A aplicação está no ar e **tem problemas**. Sua tarefa é corrigi-los e entregar
uma funcionalidade nova que o time comercial pediu.

---

## O cenário

A Kaizen vende autopeças para oficinas e consumidor final. O SIAC é o sistema
que a empresa usa há anos: ele é dono do catálogo, do estoque e dos pedidos.
A loja **não tem cópia** desses dados — consulta o SIAC por HTTP a cada
operação.

```
   navegador                 loja (este repo)              SIAC / ERP
  ┌──────────┐             ┌────────────────┐            ┌───────────┐
  │  React   │ ──────────► │  backend Node  │ ─────────► │  fora do  │
  │          │ ◄────────── │                │ ◄───────── │ seu alcance│
  └──────────┘             └───────┬────────┘            └───────────┘
                                   │
                            banco da loja
                    usuários · endereços · carrinho
```

**O SIAC você não controla.** Ele roda numa EC2 e você apenas consome a API
dele. Se um problema parecer estar no ERP, a correção tem que acontecer **deste
lado** — é assim na vida real quando o sistema legado não é seu. O estoque é atualizado 
de 30 em 30 minutos

A documentação técnica (arquitetura, contrato da API, decisões, paleta) está em
**[ARQUITETURA.md](ARQUITETURA.md)**. Vale ler antes de começar.

`SIAC_URL` é a **base** da API — os caminhos (`/produtos`, `/pedidos`) são
montados em cima dela. Para conferir se você tem acesso, o ERP responde em
`/health` sem exigir token.

> **Colocar a aplicação no ar faz parte do teste.** Não documentamos o passo a
> passo de propósito: queremos ver como você se vira com um projeto que não
> conhece. O código, os arquivos de dependência e os exemplos de configuração
> têm o que é preciso.
> Versão do node: LTS

---

## O que precisa ser feito

Três frentes. Leia todas antes de escolher por onde começar — algumas se cruzam.

### 1. Corrigir os chamados abertos

Estes quatro chegaram pelo suporte. São relatos de quem usa, não diagnósticos:
ninguém olhou o código ainda, e a descrição pode não bater exatamente com a
causa.

---

**KZN-312 — Total do carrinho vem maior que a soma das peças**
_Aberto por: Atendimento · Prioridade: alta_

> "Cliente ligou reclamando que o carrinho mostrava R$ 684,00 a mais do que a
> soma do que ele tinha escolhido. Conferi aqui e acontece mesmo. Ele tinha um
> radiador na lista que estava sem estoque no momento."

---

**KZN-318 — Número no ícone do carrinho está errado**
_Aberto por: Loja · Prioridade: média_

> "O contador no ícone do carrinho mostra 2, mas eu tenho 7 peças lá dentro.
> Parece que conta errado quando tem mais de uma unidade da mesma peça."

---

**KZN-325 — Busca diz que não encontrou peça que existe**
_Aberto por: Atendimento · Prioridade: alta_

> "O cliente estava passeando pelo catálogo, foi avançando as páginas, aí
> pesquisou 'amortecedor' e apareceu 'Nenhuma peça encontrada'. Mas tem
> amortecedor no catálogo, eu mesmo achei depois. Se ele pesquisa assim que
> entra no site, funciona."

---

**KZN-331 — Pedido saiu com o endereço errado**
_Aberto por: Logística · Prioridade: alta_

> "Cliente tem dois endereços cadastrados, casa e oficina. Fechou o pedido
> escolhendo a oficina e o pedido chegou aqui com o endereço de casa. Já
> aconteceu duas vezes essa semana."

---

### 2. Os bugs que ninguém reportou

Os quatro chamados acima **não são todos os problemas da aplicação**.

Existem outros. Alguns você provavelmente vai esbarrar investigando os
chamados; outros só aparecem em situações específicas. E **nem todo problema se
manifesta como erro na tela** — parte do que está errado aqui nenhum cliente
vai conseguir reportar.

Não vamos dizer quantos são nem onde estão. O que esperamos:

- Que você **olhe além do sintoma** ao corrigir um chamado. Bug raramente mora
  sozinho.
- Que **leia o projeto como um todo**, não só os arquivos que os chamados
  apontam.
- Que **relate o que encontrar**, mesmo que decida não corrigir. Achar e
  documentar vale mais do que passar por cima.
- Que, ao corrigir, confirme que **não quebrou outra coisa**.

Se encontrar algo que parece errado mas pode ser decisão de produto, anote como
dúvida em vez de mudar por conta própria.

---

### 3. Nova funcionalidade: múltiplos carrinhos

Pedido do comercial:

> "Nossos clientes maiores são oficinas. O cara está montando o orçamento do
> Gol de um cliente, aí chega o Civic de outro e ele precisa de outra lista de
> peças. Hoje ele tem que fechar o pedido do Gol antes, ou anotar no papel e
> montar tudo de novo depois. E toda hora ele precisa sair da tela de peças pra
> conferir o que já colocou, aí perde onde estava na busca."

São duas coisas:

**a) Múltiplos carrinhos por cliente.** A pessoa deve conseguir manter mais de
um carrinho ao mesmo tempo, dar nome a cada um ("Gol do João", "Civic prata"),
trocar entre eles e remover os que não quer mais. O que está num carrinho não
pode vazar para outro.

**b) Carrinho visível na vitrine.** Deve dar para ver e mexer no carrinho ativo
**sem sair da página de peças** — adicionar, mudar quantidade, remover e trocar
de carrinho continuando de onde parou na navegação e na busca.

O checkout continua fechando **um** carrinho por vez: o que estiver ativo.

#### Decisões que são suas

O enunciado para aqui de propósito. Estas perguntas não têm resposta certa
única — queremos ver seu critério, e **esperamos que registre a escolha e o
motivo**:

- Quantos carrinhos uma pessoa pode ter? Existe limite?
- O que acontece quando ela apaga o carrinho que está ativo?
- Como o carrinho aparece na vitrine sem atrapalhar quem está escolhendo peça?
- E no celular, onde não sobra espaço na tela?
- Ao entrar na loja, qual carrinho vem selecionado?
- O que acontece com os carrinhos depois que um pedido é fechado?

---

## Como avaliamos

Em ordem de peso:

**Corretude.** Os chamados foram realmente resolvidos — não só o sintoma na
tela, a causa. E a correção não quebrou outra parte da aplicação.

**Investigação.** Quantos dos problemas não reportados você encontrou, e se o
que relatou é de fato um problema. Relatar algo real que você escolheu não
corrigir, explicando o porquê, conta a favor.

**Causa raiz.** Diante de um bug dá para remendar na borda ou arrumar onde
nasce. Queremos ver você reconhecer a diferença e justificar quando escolher o
remendo.

**Segurança e configuração.** Como o projeto trata segredo, acesso e separação
entre ambientes. Um e-commerce lida com conta de cliente e com a credencial de
um sistema interno — olhe esse lado com o mesmo cuidado que olha a tela.

**Modelagem.** Múltiplos carrinhos mexe no banco, na API e no front. Como você
modelou, o que fez para não vazar dado entre carrinhos e entre usuários, e se o
contrato da API ficou coerente com o que já existe.

**Consistência com o projeto.** O código tem padrões: separação entre rota e
serviço, validação que acumula erros, formato único de resposta de erro,
tratamento das falhas do ERP, regra de contraste na paleta. Seguir o que está
lá vale mais do que trazer seu estilo preferido. Se discordar de um padrão,
diga por quê em vez de ignorá-lo.

**Produto.** As decisões que o enunciado deixou abertas. Não existe resposta
única; existe decisão pensada e decisão no automático.

**Comunicação.** O [RELATORIO.md](RELATORIO.md) preenchido: problemas
encontrados e como chegou neles, o que corrigiu, o que decidiu não mexer, as
escolhas da funcionalidade nova e o que faria com mais tempo. Texto direto vale
mais que texto bonito.

Ele é lido **antes** do código e é a base da conversa de devolutiva. Um bug bem
explicado ali vale mais do que um bug corrigido em silêncio.

### Sobre uso de IA

Pode usar. Não vamos pedir que você finja o contrário — é ferramenta de
trabalho, e a gente também usa.

O que muda é a conversa depois. Na devolutiva você vai ser perguntado sobre as
decisões do **seu** código: por que aquele bug acontecia, por que a correção
está ali e não na borda, o que acontece se dois pedidos disputarem a última
peça do estoque, por que você modelou os carrinhos daquele jeito. Quem entendeu
o que entregou responde com naturalidade. Quem colou, trava na primeira.

Entregar menos sabendo explicar vale mais do que entregar tudo sem saber.

### O que não estamos avaliando

- Redesenhar a interface. A identidade visual está definida e documentada.
- Cobertura de testes. Se escrever, ótimo e conta ponto — mas não esperamos uma
  suíte completa.
- Pagamento, frete ou emissão de nota. Fora do escopo de propósito.
- Velocidade. Preferimos entrega pensada a entrega rápida.

---

## Antes de começar

- Preencha o **[RELATORIO.md](RELATORIO.md)** conforme for trabalhando, não no
  final. É mais fácil lembrar como chegou num bug no dia em que chegou.
- Trabalhe em **branches** e faça commits que contem a história do que você fez.
  Um commit por chamado resolvido é mais fácil de ler que um commit gigante.
- Se travar por falta de informação, **assuma e escreva a suposição** — não
  fique parado esperando resposta.
- Você deve clonar esse repositório em sua máquina, deletar a pasta .git e subir a solução no seu github.
- A entrega da solução é o link do repositório, commits realizados após o prazo não serão considerados

Boa sorte.
