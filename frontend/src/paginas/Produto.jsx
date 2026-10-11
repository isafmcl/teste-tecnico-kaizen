import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, dinheiro } from '../api/cliente.js';
import { useAuth } from '../contextos/AuthContext.jsx';
import { useCarrinho } from '../contextos/CarrinhoContext.jsx';
import { Alerta, Botao, Carregando, EstadoVazio } from '../componentes/ui.jsx';

export function Produto() {
  const { codigo } = useParams();
  const { autenticado } = useAuth();
  const { adicionar } = useCarrinho();
  const navegar = useNavigate();

  const [produto, setProduto] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [quantidade, setQuantidade] = useState(1);
  const [adicionando, setAdicionando] = useState(false);
  const [recado, setRecado] = useState(null);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErro(null);
    setQuantidade(1);

    api.catalogo
      .produto(codigo)
      .then((resposta) => {
        if (ativo) setProduto(resposta.dados);
      })
      .catch((falha) => {
        if (ativo) setErro(falha);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, [codigo]);

  async function adicionarAoCarrinho() {
    if (!autenticado) {
      navegar('/entrar', { state: { de: `/produto/${codigo}` } });
      return;
    }

    setAdicionando(true);
    setRecado(null);

    try {
      await adicionar(produto.codigo, quantidade);
      setRecado({ tipo: 'sucesso', texto: 'Adicionado ao carrinho.' });
    } catch (falha) {
      setRecado({ tipo: 'erro', texto: falha.message });
    } finally {
      setAdicionando(false);
    }
  }

  if (carregando) return <Carregando texto="Carregando peça..." />;

  if (erro) {
    return (
      <EstadoVazio
        titulo="Peça não encontrada"
        descricao={erro.message}
        acao={<Link to="/"><Botao variante="contorno">Voltar ao catálogo</Botao></Link>}
      />
    );
  }

  const semEstoque = produto.estoque === 0;

  return (
    <div className="space-y-6">
      <nav className="text-sm text-tinta-500">
        <Link to="/" className="hover:text-marca-700 hover:underline">Catálogo</Link>
        <span className="mx-2">/</span>
        <Link
          to={`/?categoria=${produto.categoria}`}
          className="capitalize hover:text-marca-700 hover:underline"
        >
          {produto.categoria.toLowerCase()}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-tinta-700">{produto.codigo}</span>
      </nav>

      <div className="grid gap-8 rounded-xl border border-tinta-200 bg-white p-6 md:grid-cols-2 md:p-8">
        <div className="grid place-items-center rounded-xl bg-tinta-100 p-6">
          <img
            src={produto.imagem_url}
            alt={produto.descricao}
            width="320"
            height="320"
            className="aspect-square w-full max-w-xs object-contain"
          />
        </div>

        <div className="flex flex-col">
          <p className="text-sm font-semibold uppercase tracking-wide text-marca-700">
            {produto.marca}
          </p>

          <h1 className="mt-1 text-2xl font-bold text-tinta-900">{produto.descricao}</h1>

          <dl className="mt-4 space-y-1.5 text-sm">
            <div className="flex gap-2">
              <dt className="text-tinta-500">Código:</dt>
              <dd className="font-medium text-tinta-800">{produto.codigo}</dd>
            </div>
            {produto.aplicacao && (
              <div className="flex gap-2">
                <dt className="text-tinta-500">Aplicação:</dt>
                <dd className="font-medium text-tinta-800">{produto.aplicacao}</dd>
              </div>
            )}
            <div className="flex gap-2">
              <dt className="text-tinta-500">Unidade:</dt>
              <dd className="font-medium text-tinta-800">{produto.unidade}</dd>
            </div>
          </dl>

          <p className="mt-6 text-3xl font-bold text-tinta-900">
            {dinheiro.format(produto.preco_unitario)}
          </p>

          <p className="mt-1 text-sm">
            {semEstoque ? (
              <span className="font-medium text-red-600">Sem estoque no momento</span>
            ) : produto.estoque <= 5 ? (
              <span className="font-medium text-amber-700">
                Últimas {produto.estoque} unidades
              </span>
            ) : (
              <span className="text-emerald-700">{produto.estoque} unidades disponíveis</span>
            )}
          </p>

          {recado && <Alerta tipo={recado.tipo} className="mt-4">{recado.texto}</Alerta>}

          <div className="mt-6 flex items-end gap-3">
            <div>
              <label htmlFor="quantidade" className="mb-1.5 block text-sm font-medium text-tinta-700">
                Quantidade
              </label>
              <input
                id="quantidade"
                type="number"
                min="1"
                max={Math.max(1, produto.estoque)}
                value={quantidade}
                disabled={semEstoque}
                onChange={(evento) =>
                  setQuantidade(Math.max(1, Number(evento.target.value) || 1))
                }
                className="w-24 rounded-lg border border-tinta-300 px-3 py-2.5 text-sm
                  focus:border-marca-500 focus:outline-none focus:ring-2 focus:ring-marca-100
                  disabled:bg-tinta-100"
              />
            </div>

            <Botao
              tamanho="grande"
              className="flex-1"
              disabled={semEstoque}
              carregando={adicionando}
              onClick={adicionarAoCarrinho}
            >
              {semEstoque ? 'Indisponível' : 'Adicionar ao carrinho'}
            </Botao>
          </div>

          {!autenticado && !semEstoque && (
            <p className="mt-3 text-xs text-tinta-500">
              Você precisa{' '}
              <Link to="/entrar" className="text-marca-700 underline">entrar na sua conta</Link>{' '}
              para comprar.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
