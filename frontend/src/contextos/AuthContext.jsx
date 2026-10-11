import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/cliente.js';

const AuthContext = createContext(null);

/**
 * Nao existe token no JavaScript: a sessao vive num cookie httpOnly.
 * Para saber quem esta logado o front pergunta ao servidor (GET /auth/eu) uma
 * vez no boot. E so o servidor pode responder - que e exatamente a intencao.
 */
export function ProvedorAuth({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;

    api.auth
      .eu()
      .then((resposta) => {
        if (ativo) setUsuario(resposta.dados);
      })
      .catch(() => {
        // 401 aqui e o caso normal de visitante sem sessao.
        if (ativo) setUsuario(null);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, []);

  const entrar = useCallback(async (credenciais) => {
    const resposta = await api.auth.entrar(credenciais);
    setUsuario(resposta.dados);
    return resposta.dados;
  }, []);

  const cadastrar = useCallback(async (dados) => {
    const resposta = await api.auth.cadastrar(dados);
    setUsuario(resposta.dados);
    return resposta.dados;
  }, []);

  const sair = useCallback(async () => {
    try {
      await api.auth.sair();
    } finally {
      // Mesmo se a chamada falhar, o estado local tem que sair do ar logado.
      setUsuario(null);
    }
  }, []);

  const valor = useMemo(
    () => ({ usuario, carregando, autenticado: usuario !== null, entrar, cadastrar, sair, setUsuario }),
    [usuario, carregando, entrar, cadastrar, sair],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error('useAuth precisa estar dentro de <ProvedorAuth>.');
  return contexto;
}
