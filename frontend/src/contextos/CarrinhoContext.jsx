import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/cliente.js';
import { useAuth } from './AuthContext.jsx';

const CarrinhoContext = createContext(null);

const VAZIO = {
  id: null,
  nome: null,
  itens: [],
  quantidade_itens: 0,
  quantidade_pecas: 0,
  valor_total: 0,
  pronto_para_checkout: false,
};

/**
 * O carrinho mora no servidor, nao no localStorage: trocar de navegador ou de
 * celular mantem o que a pessoa escolheu, e o estoque e sempre conferido
 * contra o ERP na hora de ler.
 */
export function ProvedorCarrinho({ children }) {
  const { usuario, carregando: verificandoSessao } = useAuth();
  const [carrinhos, setCarrinhos] = useState([]);
  const [carrinhoAtivo, setCarrinhoAtivo] = useState(VAZIO);
  const [carregando, setCarregando] = useState(false);
  const usuarioId = usuario?.id ?? null;
  const idAtivo = useRef(null);

  // Selo da sessao: a resposta so entra no estado se o usuario de agora
  // for o mesmo de quando a requisicao saiu. Trocar de conta no meio
  // nao pode pintar o carrinho de quem saiu.
  const sessao = useRef(usuarioId);
  sessao.current = usuarioId;

  const comSelo = useCallback(async (trabalho, aplicar) => {
    const selo = sessao.current;
    const resposta = await trabalho();
    if (sessao.current === selo) aplicar(resposta);
    return resposta;
  }, []);

  const aplicarAtivo = useCallback((dados) => {
    const proximo = dados?.id != null ? dados : VAZIO;
    idAtivo.current = proximo.id ?? null;
    setCarrinhoAtivo(proximo);
    if (proximo.id == null) return;

    setCarrinhos((lista) => lista.map((item) => (
      item.id === proximo.id
        ? {
            ...item,
            nome: proximo.nome ?? item.nome,
            quantidade_pecas: proximo.quantidade_pecas ?? item.quantidade_pecas,
          }
        : item
    )));
  }, []);

  const setCarrinho = useCallback((valor) => {
    setCarrinhoAtivo((atual) => {
      const proximo = typeof valor === 'function' ? valor(atual) : valor;
      idAtivo.current = proximo?.id ?? null;
      return proximo ?? VAZIO;
    });
  }, []);

  const carregar = useCallback(async (ainda = () => true) => {
    const selo = sessao.current;
    const segue = () => ainda() && sessao.current === selo;
    setCarregando(true);

    try {
      const [lista, leitura] = await Promise.all([
        api.carrinhos.listar(),
        api.carrinho.ler(),
      ]);
      if (!segue()) return;

      setCarrinhos(lista.dados);
      setCarrinhoAtivo(leitura.dados);
      idAtivo.current = leitura.dados.id ?? null;
    } catch {
      // 401 quando nao ha sessao: segue com o carrinho vazio.
      if (segue()) {
        idAtivo.current = null;
        setCarrinhos([]);
        setCarrinhoAtivo(VAZIO);
      }
    } finally {
      if (segue()) setCarregando(false);
    }
  }, []);

  const recarregar = useCallback(() => carregar(), [carregar]);

  // Sem sessao o carrinho some; com usuario, busca o dele. Depende do id
  // para nao disparar de novo a cada render do objeto usuario.
  useEffect(() => {
    if (verificandoSessao) return;

    if (usuarioId == null) {
      idAtivo.current = null;
      setCarrinhos([]);
      setCarrinhoAtivo(VAZIO);
      setCarregando(false);
      return;
    }

    let ativo = true;
    carregar(() => ativo);

    return () => {
      ativo = false;
    };
  }, [verificandoSessao, usuarioId, carregar]);

  const adicionar = useCallback((codigo, quantidade = 1) => comSelo(
    () => (idAtivo.current == null
      ? api.carrinho.adicionar(codigo, quantidade)
      : api.carrinhos.adicionar(idAtivo.current, codigo, quantidade)),
    (resposta) => aplicarAtivo(resposta.dados),
  ), [comSelo, aplicarAtivo]);

  const alterar = useCallback((codigo, quantidade) => comSelo(
    () => (idAtivo.current == null
      ? api.carrinho.alterar(codigo, quantidade)
      : api.carrinhos.alterar(idAtivo.current, codigo, quantidade)),
    (resposta) => aplicarAtivo(resposta.dados),
  ), [comSelo, aplicarAtivo]);

  const remover = useCallback((codigo) => comSelo(
    () => (idAtivo.current == null
      ? api.carrinho.remover(codigo)
      : api.carrinhos.remover(idAtivo.current, codigo)),
    (resposta) => aplicarAtivo(resposta.dados),
  ), [comSelo, aplicarAtivo]);

  const limpar = useCallback(() => comSelo(
    () => (idAtivo.current == null
      ? api.carrinho.limpar()
      : api.carrinhos.limpar(idAtivo.current)),
    (resposta) => aplicarAtivo(resposta.dados),
  ), [comSelo, aplicarAtivo]);

  const criar = useCallback((nome) => comSelo(async () => {
    const criado = await api.carrinhos.criar(nome);
    const [lista, leitura] = await Promise.all([
      api.carrinhos.listar(),
      api.carrinhos.ler(criado.dados.id),
    ]);
    return { criado, lista, leitura };
  }, ({ lista, leitura }) => {
    setCarrinhos(lista.dados);
    aplicarAtivo(leitura.dados);
  }).then((pacote) => pacote.criado), [comSelo, aplicarAtivo]);

  const renomear = useCallback((id, nome) => comSelo(
    () => api.carrinhos.renomear(id, nome),
    (resposta) => {
      const nomeNovo = resposta.dados.nome;
      setCarrinhos((lista) => lista.map((item) => (
        item.id === id ? { ...item, nome: nomeNovo } : item
      )));
      setCarrinhoAtivo((atual) => (
        atual.id === id ? { ...atual, nome: nomeNovo } : atual
      ));
    },
  ), [comSelo]);

  const apagar = useCallback((id) => comSelo(async () => {
    const lista = await api.carrinhos.apagar(id);
    const escolhido = lista.dados.find((item) => item.ativo);
    const leitura = escolhido ? await api.carrinhos.ler(escolhido.id) : null;
    return { lista, leitura };
  }, ({ lista, leitura }) => {
    setCarrinhos(lista.dados);
    aplicarAtivo(leitura?.dados);
  }), [comSelo, aplicarAtivo]);

  const ativar = useCallback((id) => comSelo(async () => {
    const lista = await api.carrinhos.ativar(id);
    const leitura = await api.carrinhos.ler(id);
    return { lista, leitura };
  }, ({ lista, leitura }) => {
    setCarrinhos(lista.dados);
    aplicarAtivo(leitura.dados);
  }), [comSelo, aplicarAtivo]);

  const valor = useMemo(
    () => ({
      carrinho: carrinhoAtivo,
      carrinhoAtivo,
      carrinhos,
      carregando,
      recarregar,
      adicionar,
      alterar,
      remover,
      limpar,
      criar,
      renomear,
      apagar,
      ativar,
      setCarrinho,
    }),
    [
      carrinhoAtivo,
      carrinhos,
      carregando,
      recarregar,
      adicionar,
      alterar,
      remover,
      limpar,
      criar,
      renomear,
      apagar,
      ativar,
      setCarrinho,
    ],
  );

  return <CarrinhoContext.Provider value={valor}>{children}</CarrinhoContext.Provider>;
}

export function useCarrinho() {
  const contexto = useContext(CarrinhoContext);
  if (!contexto) throw new Error('useCarrinho precisa estar dentro de <ProvedorCarrinho>.');
  return contexto;
}
