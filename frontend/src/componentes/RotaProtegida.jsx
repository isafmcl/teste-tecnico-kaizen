import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contextos/AuthContext.jsx';
import { Carregando } from './ui.jsx';

/**
 * Guarda de rota do lado do cliente - conveniencia de navegacao, NAO seguranca.
 * Quem protege os dados e o backend, que exige a sessao em toda rota privada.
 *
 * O `state` guarda de onde a pessoa veio para o login devolver ela ao lugar
 * certo depois de entrar.
 */
export function RotaProtegida({ children }) {
  const { autenticado, carregando } = useAuth();
  const localizacao = useLocation();

  if (carregando) return <Carregando texto="Verificando sua sessão..." />;

  if (!autenticado) {
    return <Navigate to="/entrar" replace state={{ de: localizacao.pathname }} />;
  }

  return children;
}
