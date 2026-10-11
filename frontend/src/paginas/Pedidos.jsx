import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, dinheiro, formatarData } from '../api/cliente.js';
import { Alerta, Botao, Carregando, EstadoVazio, Paginacao, SeloSituacao } from '../componentes/ui.jsx';

export function Pedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [paginacao, setPaginacao] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);

    api.pedidos
      .listar({ pagina })
      .then((resposta) => {
        if (!ativo) return;
        setPedidos(resposta.dados);
        setPaginacao(resposta.paginacao);
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
  }, [pagina]);

  if (carregando) return <Carregando texto="Carregando seus pedidos..." />;

  if (erro) {
    return <Alerta tipo="erro" titulo="Não foi possível carregar os pedidos">{erro.message}</Alerta>;
  }

  if (pedidos.length === 0) {
    return (
      <EstadoVazio
        titulo="Você ainda não fez pedidos"
        descricao="Quando fizer, eles aparecem aqui com o status de cada um."
        acao={<Link to="/"><Botao>Ver catálogo</Botao></Link>}
      />
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-tinta-900">Meus pedidos</h1>

      <ul className="space-y-3">
        {pedidos.map((pedido) => (
          <li key={pedido.numero}>
            <Link
              to={`/pedidos/${pedido.numero}`}
              className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border
                border-tinta-200 bg-white p-5 transition-shadow hover:shadow-md"
            >
              <div className="min-w-[160px]">
                <p className="font-bold text-tinta-900">{pedido.numero}</p>
                <p className="text-xs text-tinta-500">{formatarData(pedido.criado_em)}</p>
              </div>

              <SeloSituacao situacao={pedido.situacao} />

              <p className="text-sm text-tinta-600">
                {pedido.quantidade_itens === null
                  ? '—'
                  : `${pedido.quantidade_itens} ${pedido.quantidade_itens === 1 ? 'item' : 'itens'}`}
              </p>

              <p className="text-sm text-tinta-500">
                {pedido.endereco_entrega.cidade}/{pedido.endereco_entrega.uf}
              </p>

              <p className="ml-auto text-lg font-bold text-tinta-900">
                {dinheiro.format(pedido.valor_total)}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      <Paginacao paginacao={paginacao} aoMudar={setPagina} />
    </div>
  );
}
