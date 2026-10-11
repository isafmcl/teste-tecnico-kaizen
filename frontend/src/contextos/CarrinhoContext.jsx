import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/cliente.js';

const CarrinhoContext = createContext(null);

const VAZIO = {
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
  const [carrinho, setCarrinho] = useState(VAZIO);
  const [carregando, setCarregando] = useState(false);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    try {
      const resposta = await api.carrinho.ler();
      setCarrinho(resposta.dados);
    } catch {
      // 401 quando nao ha sessao: segue com o carrinho vazio.
      setCarrinho(VAZIO);
    } finally {
      setCarregando(false);
    }
  }, []);

  // Carrega o carrinho na abertura da loja.
  useEffect(() => {
    recarregar();
  }, [recarregar]);

  const adicionar = useCallback(async (codigo, quantidade = 1) => {
    const resposta = await api.carrinho.adicionar(codigo, quantidade);
    setCarrinho(resposta.dados);
  }, []);

  const alterar = useCallback(async (codigo, quantidade) => {
    const resposta = await api.carrinho.alterar(codigo, quantidade);
    setCarrinho(resposta.dados);
  }, []);

  const remover = useCallback(async (codigo) => {
    const resposta = await api.carrinho.remover(codigo);
    setCarrinho(resposta.dados);
  }, []);

  const limpar = useCallback(async () => {
    const resposta = await api.carrinho.limpar();
    setCarrinho(resposta.dados);
  }, []);

  const valor = useMemo(
    () => ({ carrinho, carregando, recarregar, adicionar, alterar, remover, limpar, setCarrinho }),
    [carrinho, carregando, recarregar, adicionar, alterar, remover, limpar],
  );

  return <CarrinhoContext.Provider value={valor}>{children}</CarrinhoContext.Provider>;
}

export function useCarrinho() {
  const contexto = useContext(CarrinhoContext);
  if (!contexto) throw new Error('useCarrinho precisa estar dentro de <ProvedorCarrinho>.');
  return contexto;
}
