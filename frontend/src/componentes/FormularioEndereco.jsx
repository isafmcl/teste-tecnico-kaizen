import { useState } from 'react';
import { api } from '../api/cliente.js';
import { Botao, Campo, ErroGeral } from './ui.jsx';

const CAMPOS = [
  'apelido', 'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf',
];

const INICIAL = {
  apelido: '', cep: '', logradouro: '', numero: '', complemento: '',
  bairro: '', cidade: '', uf: '', principal: false,
};

/**
 * Usado no perfil e no checkout. Serve tanto para criar quanto para editar:
 * com `endereco` preenchido faz PUT, sem ele faz POST.
 */
export function FormularioEndereco({ endereco, aoSalvar, aoCancelar }) {
  const [formulario, setFormulario] = useState(
    endereco ? { ...INICIAL, ...endereco, complemento: endereco.complemento ?? '' } : INICIAL,
  );
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  function mudar(evento) {
    const { name, value, type, checked } = evento.target;
    setFormulario((atual) => ({ ...atual, [name]: type === 'checkbox' ? checked : value }));
  }

  async function enviar(evento) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);

    try {
      const resposta = endereco
        ? await api.enderecos.salvar(endereco.id, formulario)
        : await api.enderecos.criar(formulario);

      aoSalvar(resposta.dados);
    } catch (falha) {
      setErro(falha);
    } finally {
      setEnviando(false);
    }
  }

  const porCampo = erro?.porCampo ?? {};

  return (
    <form onSubmit={enviar} className="space-y-4" noValidate>
      <ErroGeral erro={erro} camposConhecidos={CAMPOS} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          rotulo="Apelido"
          name="apelido"
          value={formulario.apelido}
          onChange={mudar}
          erro={porCampo.apelido}
          placeholder="Casa, Oficina..."
        />

        <Campo
          rotulo="CEP"
          name="cep"
          value={formulario.cep}
          onChange={mudar}
          erro={porCampo.cep}
          placeholder="01310-100"
          inputMode="numeric"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
        <Campo
          rotulo="Logradouro"
          name="logradouro"
          value={formulario.logradouro}
          onChange={mudar}
          erro={porCampo.logradouro}
          placeholder="Av. Paulista"
        />

        <Campo
          rotulo="Número"
          name="numero"
          value={formulario.numero}
          onChange={mudar}
          erro={porCampo.numero}
          placeholder="1578"
        />
      </div>

      <Campo
        rotulo="Complemento (opcional)"
        name="complemento"
        value={formulario.complemento}
        onChange={mudar}
        erro={porCampo.complemento}
        placeholder="Sala 4, fundos..."
      />

      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_90px]">
        <Campo
          rotulo="Bairro"
          name="bairro"
          value={formulario.bairro}
          onChange={mudar}
          erro={porCampo.bairro}
          placeholder="Bela Vista"
        />

        <Campo
          rotulo="Cidade"
          name="cidade"
          value={formulario.cidade}
          onChange={mudar}
          erro={porCampo.cidade}
          placeholder="São Paulo"
        />

        <Campo
          rotulo="UF"
          name="uf"
          value={formulario.uf}
          onChange={mudar}
          erro={porCampo.uf}
          placeholder="SP"
          maxLength={2}
        />
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-tinta-700">
        <input
          type="checkbox"
          name="principal"
          checked={formulario.principal}
          onChange={mudar}
          className="size-4 rounded border-tinta-300 text-marca-700 focus:ring-marca-500"
        />
        Usar como endereço principal
      </label>

      <div className="flex gap-3">
        <Botao type="submit" carregando={enviando}>
          {endereco ? 'Salvar alterações' : 'Adicionar endereço'}
        </Botao>

        {aoCancelar && (
          <Botao type="button" variante="contorno" onClick={aoCancelar} disabled={enviando}>
            Cancelar
          </Botao>
        )}
      </div>
    </form>
  );
}
