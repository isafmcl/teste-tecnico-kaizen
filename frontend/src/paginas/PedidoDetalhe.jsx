import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { api, dinheiro, formatarData } from '../api/cliente.js';
import { Alerta, Botao, Carregando, EstadoVazio, SeloSituacao } from '../componentes/ui.jsx';

export function PedidoDetalhe() {
  const { numero } = useParams();
  const localizacao = useLocation();

  const [pedido, setPedido] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  // Vindo do checkout, mostra a confirmacao no topo.
  const recemCriado = localizacao.state?.novo === true;

  useEffect(() => {
    let ativo = true;
    setCarregando(true);

    api.pedidos
      .detalhe(numero)
      .then((resposta) => {
        if (ativo) setPedido(resposta.dados);
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
  }, [numero]);

  if (carregando) return <Carregando texto="Carregando pedido..." />;

  if (erro) {
    return (
      <EstadoVazio
        titulo="Pedido não encontrado"
        descricao={erro.message}
        acao={<Link to="/pedidos"><Botao variante="contorno">Ver meus pedidos</Botao></Link>}
      />
    );
  }

  const endereco = pedido.endereco_entrega;

  return (
    <div className="space-y-6">
      {recemCriado && (
        <Alerta tipo="sucesso" titulo="Pedido confirmado!">
          Recebemos seu pedido e as peças já foram reservadas no estoque.
        </Alerta>
      )}

      <nav className="text-sm text-tinta-500">
        <Link to="/pedidos" className="hover:text-marca-700 hover:underline">Meus pedidos</Link>
        <span className="mx-2">/</span>
        <span className="text-tinta-700">{pedido.numero}</span>
      </nav>

      <div className="flex flex-wrap items-center gap-4">
        <h1 className="text-2xl font-bold text-tinta-900">{pedido.numero}</h1>
        <SeloSituacao situacao={pedido.situacao} />
        <p className="text-sm text-tinta-500">{formatarData(pedido.criado_em)}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="rounded-xl border border-tinta-200 bg-white p-5">
          <h2 className="font-semibold text-tinta-900">Itens</h2>

          <ul className="mt-4 divide-y divide-tinta-200">
            {pedido.itens.map((item) => (
              <li key={item.codigo_produto} className="flex flex-wrap gap-x-4 gap-y-1 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-tinta-900">
                    <Link to={`/produto/${item.codigo_produto}`} className="hover:underline">
                      {item.descricao}
                    </Link>
                  </p>
                  <p className="text-xs text-tinta-500">
                    {item.codigo_produto} · {item.quantidade} x{' '}
                    {dinheiro.format(item.preco_unitario)}
                  </p>
                </div>

                <p className="text-sm font-semibold text-tinta-900">
                  {dinheiro.format(item.valor_total)}
                </p>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex justify-between border-t border-tinta-200 pt-4">
            <span className="font-semibold text-tinta-900">Total</span>
            <span className="text-xl font-bold text-tinta-900">
              {dinheiro.format(pedido.valor_total)}
            </span>
          </div>
        </section>

        <aside className="h-fit space-y-4">
          <section className="rounded-xl border border-tinta-200 bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-tinta-500">
              Entrega
            </h2>

            <address className="mt-3 text-sm not-italic text-tinta-700">
              <strong className="block text-tinta-900">{endereco.apelido}</strong>
              {endereco.logradouro}, {endereco.numero}
              {endereco.complemento ? `, ${endereco.complemento}` : ''}
              <br />
              {endereco.bairro}
              <br />
              {endereco.cidade}/{endereco.uf}
              <br />
              CEP {endereco.cep}
            </address>
          </section>

          <section className="rounded-xl border border-tinta-200 bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-tinta-500">
              Cliente
            </h2>
            <p className="mt-3 text-sm text-tinta-700">
              <strong className="block text-tinta-900">{pedido.cliente.nome}</strong>
              {pedido.cliente.documento}
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
