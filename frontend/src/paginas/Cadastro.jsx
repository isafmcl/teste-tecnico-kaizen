import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contextos/AuthContext.jsx';
import { Botao, Campo, ErroGeral } from '../componentes/ui.jsx';

const CAMPOS = ['nome', 'email', 'senha', 'documento', 'telefone'];

const INICIAL = { nome: '', email: '', senha: '', documento: '', telefone: '' };

export function Cadastro() {
  const { cadastrar } = useAuth();
  const navegar = useNavigate();

  const [formulario, setFormulario] = useState(INICIAL);
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  function mudar(evento) {
    const { name, value } = evento.target;
    setFormulario((atual) => ({ ...atual, [name]: value }));
  }

  async function enviar(evento) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);

    try {
      await cadastrar(formulario);
      navegar('/', { replace: true });
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
        <h1 className="text-2xl font-bold text-tinta-900">Criar conta</h1>
        <p className="mt-1 text-sm text-tinta-500">
          Leva menos de um minuto. O documento vai junto no pedido.
        </p>

        <form onSubmit={enviar} className="mt-6 space-y-4" noValidate>
          <ErroGeral erro={erro} camposConhecidos={CAMPOS} />

          <Campo
            rotulo="Nome completo"
            name="nome"
            autoComplete="name"
            value={formulario.nome}
            onChange={mudar}
            erro={porCampo.nome}
            placeholder="Maria Souza"
          />

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
            rotulo="CPF ou CNPJ"
            name="documento"
            value={formulario.documento}
            onChange={mudar}
            erro={porCampo.documento}
            placeholder="123.456.789-00"
          />

          <Campo
            rotulo="Telefone (opcional)"
            name="telefone"
            type="tel"
            autoComplete="tel"
            value={formulario.telefone}
            onChange={mudar}
            erro={porCampo.telefone}
            placeholder="(11) 98765-4321"
          />

          <Campo
            rotulo="Senha"
            name="senha"
            type="password"
            autoComplete="new-password"
            value={formulario.senha}
            onChange={mudar}
            erro={porCampo.senha}
            dica="Mínimo 8 caracteres, com ao menos uma letra e um número."
            placeholder="••••••••"
          />

          <Botao type="submit" tamanho="grande" className="w-full" carregando={enviando}>
            Criar conta
          </Botao>
        </form>

        <p className="mt-6 text-center text-sm text-tinta-600">
          Já tem conta?{' '}
          <Link to="/entrar" className="font-semibold text-marca-700 hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
