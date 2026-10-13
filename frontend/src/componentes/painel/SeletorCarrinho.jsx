import { useId, useState } from 'react';
import { useCarrinho } from '../../contextos/CarrinhoContext.jsx';
import { Alerta, Botao } from '../ui.jsx';
import { metaDoAtivo } from './metaCarrinho.js';

const CAMPO = `w-full rounded-lg border border-tinta-300 px-3 py-2 text-sm text-tinta-900
  focus:border-marca-500 focus:outline-none focus:ring-2 focus:ring-marca-100`;

export function SeletorCarrinho() {
  const { carrinho, carrinhos, criar, renomear, apagar, ativar } = useCarrinho();
  const meta = metaDoAtivo(carrinhos, carrinho);
  const fechando = meta?.status === 'FECHANDO';
  const pecas = meta?.quantidade_pecas ?? carrinho.quantidade_pecas ?? 0;

  const idSeletor = useId();
  const idNome = useId();
  const [modo, setModo] = useState(null);
  const [nome, setNome] = useState('');
  const [erro, setErro] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  function abrir(proximo) {
    setErro(null);
    setModo(proximo);
    setNome(proximo === 'renomear' ? (carrinho.nome ?? '') : '');
  }

  async function executar(acao) {
    setOcupado(true);
    setErro(null);
    try {
      await acao();
      setModo(null);
      setNome('');
    } catch (falha) {
      setErro(falha.message ?? 'Não foi possível atualizar o carrinho.');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor={idSeletor} className="mb-1.5 block text-sm font-medium text-tinta-700">
          Carrinho
        </label>
        <select
          id={idSeletor}
          value={carrinho.id == null ? '' : String(carrinho.id)}
          disabled={ocupado || carrinhos.length === 0}
          onChange={(evento) => {
            const id = Number(evento.target.value);
            if (id === carrinho.id) return;
            executar(() => ativar(id));
          }}
          className={CAMPO}
        >
          {carrinhos.map((item) => (
            <option key={item.id} value={String(item.id)}>
              {item.nome}{item.status === 'FECHANDO' ? ' (em fechamento)' : ''}
            </option>
          ))}
        </select>
        {fechando && (
          <p className="mt-1.5 text-sm font-medium text-amber-700">em fechamento</p>
        )}
      </div>

      {erro && <Alerta tipo="erro">{erro}</Alerta>}

      {modo === 'apagar' ? (
        <div className="space-y-2">
          <p className="text-sm text-tinta-700">
            Apagar este carrinho descarta {pecas} {pecas === 1 ? 'peça' : 'peças'}.
          </p>
          <div className="flex gap-2">
            <Botao
              type="button"
              variante="perigo"
              tamanho="pequeno"
              disabled={ocupado}
              onClick={() => executar(() => apagar(carrinho.id))}
            >
              Apagar
            </Botao>
            <Botao type="button" variante="contorno" tamanho="pequeno" disabled={ocupado} onClick={() => setModo(null)}>
              Cancelar
            </Botao>
          </div>
        </div>
      ) : modo === 'criar' || modo === 'renomear' ? (
        <form
          className="space-y-2"
          onSubmit={(evento) => {
            evento.preventDefault();
            if (modo === 'criar') executar(() => criar(nome.trim() || undefined));
            else executar(() => renomear(carrinho.id, nome.trim()));
          }}
        >
          <label htmlFor={idNome} className="sr-only">
            {modo === 'criar' ? 'Nome do novo carrinho' : 'Novo nome do carrinho'}
          </label>
          <input
            id={idNome}
            value={nome}
            maxLength={40}
            autoFocus
            onChange={(evento) => setNome(evento.target.value)}
            placeholder={modo === 'criar' ? 'Nome (opcional)' : 'Novo nome'}
            className={CAMPO}
          />
          <div className="flex gap-2">
            <Botao type="submit" tamanho="pequeno" disabled={ocupado || (modo === 'renomear' && nome.trim() === '')}>
              {modo === 'criar' ? 'Criar' : 'Salvar'}
            </Botao>
            <Botao type="button" variante="contorno" tamanho="pequeno" disabled={ocupado} onClick={() => setModo(null)}>
              Cancelar
            </Botao>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Botao type="button" variante="contorno" tamanho="pequeno" disabled={ocupado} onClick={() => abrir('criar')}>
            Novo
          </Botao>
          {!fechando && carrinho.id != null && (
            <>
              <Botao type="button" variante="contorno" tamanho="pequeno" disabled={ocupado} onClick={() => abrir('renomear')}>
                Renomear
              </Botao>
              <Botao type="button" variante="perigo" tamanho="pequeno" disabled={ocupado} onClick={() => abrir('apagar')}>
                Apagar
              </Botao>
            </>
          )}
        </div>
      )}
    </div>
  );
}
