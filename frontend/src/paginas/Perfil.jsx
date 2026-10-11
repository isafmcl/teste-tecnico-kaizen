import { useEffect, useState } from 'react';
import { api } from '../api/cliente.js';
import { useAuth } from '../contextos/AuthContext.jsx';
import { FormularioEndereco } from '../componentes/FormularioEndereco.jsx';
import { Alerta, Botao, Campo, Carregando, ErroGeral } from '../componentes/ui.jsx';

const CAMPOS_DADOS = ['nome', 'documento', 'telefone'];
const CAMPOS_SENHA = ['senha_atual', 'nova_senha'];

function DadosPessoais() {
  const { usuario, setUsuario } = useAuth();

  const [formulario, setFormulario] = useState({
    nome: usuario.nome,
    documento: usuario.documento,
    telefone: usuario.telefone ?? '',
  });
  const [erro, setErro] = useState(null);
  const [salvo, setSalvo] = useState(false);
  const [enviando, setEnviando] = useState(false);

  function mudar(evento) {
    const { name, value } = evento.target;
    setFormulario((atual) => ({ ...atual, [name]: value }));
    setSalvo(false);
  }

  async function enviar(evento) {
    evento.preventDefault();
    setErro(null);
    setSalvo(false);
    setEnviando(true);

    try {
      const resposta = await api.perfil.salvar(formulario);
      setUsuario(resposta.dados);
      setSalvo(true);
    } catch (falha) {
      setErro(falha);
    } finally {
      setEnviando(false);
    }
  }

  const porCampo = erro?.porCampo ?? {};

  return (
    <section className="rounded-xl border border-tinta-200 bg-white p-5 sm:p-6">
      <h2 className="font-semibold text-tinta-900">Dados pessoais</h2>

      <form onSubmit={enviar} className="mt-4 space-y-4" noValidate>
        <ErroGeral erro={erro} camposConhecidos={CAMPOS_DADOS} />
        {salvo && <Alerta tipo="sucesso">Dados atualizados.</Alerta>}

        <Campo
          rotulo="E-mail"
          name="email"
          value={usuario.email}
          disabled
          readOnly
          dica="O e-mail de acesso não pode ser alterado por aqui."
          className="opacity-70"
        />

        <Campo
          rotulo="Nome completo"
          name="nome"
          value={formulario.nome}
          onChange={mudar}
          erro={porCampo.nome}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            rotulo="CPF ou CNPJ"
            name="documento"
            value={formulario.documento}
            onChange={mudar}
            erro={porCampo.documento}
          />

          <Campo
            rotulo="Telefone"
            name="telefone"
            type="tel"
            value={formulario.telefone}
            onChange={mudar}
            erro={porCampo.telefone}
            placeholder="(11) 98765-4321"
          />
        </div>

        <Botao type="submit" carregando={enviando}>Salvar dados</Botao>
      </form>
    </section>
  );
}

function TrocarSenha() {
  const [formulario, setFormulario] = useState({ senha_atual: '', nova_senha: '' });
  const [erro, setErro] = useState(null);
  const [salvo, setSalvo] = useState(false);
  const [enviando, setEnviando] = useState(false);

  function mudar(evento) {
    const { name, value } = evento.target;
    setFormulario((atual) => ({ ...atual, [name]: value }));
    setSalvo(false);
  }

  async function enviar(evento) {
    evento.preventDefault();
    setErro(null);
    setSalvo(false);
    setEnviando(true);

    try {
      await api.perfil.trocarSenha(formulario);
      setFormulario({ senha_atual: '', nova_senha: '' });
      setSalvo(true);
    } catch (falha) {
      setErro(falha);
    } finally {
      setEnviando(false);
    }
  }

  const porCampo = erro?.porCampo ?? {};

  return (
    <section className="rounded-xl border border-tinta-200 bg-white p-5 sm:p-6">
      <h2 className="font-semibold text-tinta-900">Trocar senha</h2>

      <form onSubmit={enviar} className="mt-4 space-y-4" noValidate>
        <ErroGeral erro={erro} camposConhecidos={CAMPOS_SENHA} />
        {salvo && <Alerta tipo="sucesso">Senha alterada.</Alerta>}

        <Campo
          rotulo="Senha atual"
          name="senha_atual"
          type="password"
          autoComplete="current-password"
          value={formulario.senha_atual}
          onChange={mudar}
          erro={porCampo.senha_atual}
        />

        <Campo
          rotulo="Nova senha"
          name="nova_senha"
          type="password"
          autoComplete="new-password"
          value={formulario.nova_senha}
          onChange={mudar}
          erro={porCampo.nova_senha}
          dica="Mínimo 8 caracteres, com ao menos uma letra e um número."
        />

        <Botao type="submit" carregando={enviando}>Trocar senha</Botao>
      </form>
    </section>
  );
}

function Enderecos() {
  const [enderecos, setEnderecos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [editando, setEditando] = useState(null);
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState(null);

  async function recarregar() {
    setCarregando(true);
    try {
      const resposta = await api.enderecos.listar();
      setEnderecos(resposta.dados);
    } catch (falha) {
      setErro(falha);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    recarregar();
  }, []);

  async function remover(id) {
    setErro(null);
    try {
      await api.enderecos.remover(id);
      await recarregar();
    } catch (falha) {
      setErro(falha);
    }
  }

  async function salvo() {
    setEditando(null);
    setCriando(false);
    await recarregar();
  }

  return (
    <section className="rounded-xl border border-tinta-200 bg-white p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-tinta-900">Endereços</h2>

        {!criando && !editando && (
          <Botao variante="contorno" tamanho="pequeno" onClick={() => setCriando(true)}>
            Adicionar
          </Botao>
        )}
      </div>

      {erro && <Alerta tipo="erro" className="mt-4">{erro.message}</Alerta>}

      {criando && (
        <div className="mt-4 rounded-lg border border-tinta-200 bg-tinta-50 p-4">
          <FormularioEndereco aoSalvar={salvo} aoCancelar={() => setCriando(false)} />
        </div>
      )}

      {carregando ? (
        <Carregando texto="Carregando endereços..." />
      ) : enderecos.length === 0 && !criando ? (
        <p className="mt-4 text-sm text-tinta-500">Nenhum endereço cadastrado ainda.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {enderecos.map((endereco) =>
            editando === endereco.id ? (
              <li key={endereco.id} className="rounded-lg border border-tinta-200 bg-tinta-50 p-4">
                <FormularioEndereco
                  endereco={endereco}
                  aoSalvar={salvo}
                  aoCancelar={() => setEditando(null)}
                />
              </li>
            ) : (
              <li
                key={endereco.id}
                className="flex flex-wrap items-start gap-3 rounded-lg border border-tinta-200 p-4"
              >
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-semibold text-tinta-900">
                    {endereco.apelido}
                    {endereco.principal && (
                      <span className="ml-2 rounded bg-marca-100 px-1.5 py-0.5 text-xs font-medium text-marca-800">
                        principal
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-tinta-600">
                    {endereco.logradouro}, {endereco.numero}
                    {endereco.complemento ? `, ${endereco.complemento}` : ''} — {endereco.bairro}
                    <br />
                    {endereco.cidade}/{endereco.uf} — CEP {endereco.cep}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Botao
                    variante="contorno"
                    tamanho="pequeno"
                    onClick={() => setEditando(endereco.id)}
                  >
                    Editar
                  </Botao>
                  <Botao variante="perigo" tamanho="pequeno" onClick={() => remover(endereco.id)}>
                    Excluir
                  </Botao>
                </div>
              </li>
            ),
          )}
        </ul>
      )}
    </section>
  );
}

export function Perfil() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-tinta-900">Minha conta</h1>

      <DadosPessoais />
      <Enderecos />
      <TrocarSenha />
    </div>
  );
}
