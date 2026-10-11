import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contextos/AuthContext.jsx';
import { Botao, Campo, ErroGeral } from '../componentes/ui.jsx';

const CAMPOS = ['email', 'senha'];

export function Entrar() {
  const { entrar } = useAuth();
  const navegar = useNavigate();
  const localizacao = useLocation();

  const [formulario, setFormulario] = useState({ email: '', senha: '' });
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  // Volta para a pagina que exigiu login, ou para a home.
  const destino = localizacao.state?.de ?? '/';

  function mudar(evento) {
    const { name, value } = evento.target;
    setFormulario((atual) => ({ ...atual, [name]: value }));
  }

  async function enviar(evento) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);

    try {
      await entrar(formulario);
      navegar(destino, { replace: true });
    } catch (falha) {
      setErro(falha);
    } finally {
      setEnviando(false);
    }
  }

  const porCampo = erro?.porCampo ?? {};

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-xl border border-tinta-200 bg-white p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-tinta-900">Entrar</h1>
        <p className="mt-1 text-sm text-tinta-500">Acesse sua conta para comprar.</p>

        <form onSubmit={enviar} className="mt-6 space-y-4" noValidate>
          <ErroGeral erro={erro} camposConhecidos={CAMPOS} />

          <Campo
            rotulo="E-mail"
            name="email"
            type="email"
            autoComplete="email"
            value={formulario.email}
            onChange={mudar}
            erro={porCampo.email}
            placeholder="voce@email.com"
          />

          <Campo
            rotulo="Senha"
            name="senha"
            type="password"
            autoComplete="current-password"
            value={formulario.senha}
            onChange={mudar}
            erro={porCampo.senha}
            placeholder="••••••••"
          />

          <Botao type="submit" tamanho="grande" className="w-full" carregando={enviando}>
            Entrar
          </Botao>
        </form>

        <p className="mt-6 text-center text-sm text-tinta-600">
          Não tem conta?{' '}
          <Link to="/cadastro" className="font-semibold text-marca-700 hover:underline">
            Criar agora
          </Link>
        </p>
      </div>
    </div>
  );
}
