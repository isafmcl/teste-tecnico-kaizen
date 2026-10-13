import { Link } from 'react-router-dom';
import { ListaItensCarrinho } from '../componentes/painel/ListaItensCarrinho.jsx';
import { ResumoCarrinho } from '../componentes/painel/ResumoCarrinho.jsx';
import { SeletorCarrinho } from '../componentes/painel/SeletorCarrinho.jsx';
import { Botao, Carregando, EstadoVazio } from '../componentes/ui.jsx';
import { useCarrinho } from '../contextos/CarrinhoContext.jsx';

export function Carrinho() {
  const { carrinho, carregando } = useCarrinho();
  const vazio = carrinho.itens.length === 0;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-tinta-900">Carrinho</h1>

      <SeletorCarrinho />

      {carregando && vazio ? (
        <Carregando texto="Carregando carrinho..." />
      ) : vazio ? (
        <EstadoVazio
          titulo="Seu carrinho está vazio"
          descricao="Procure a peça pelo nome, pela marca ou pelo carro em que ela se aplica."
          acao={<Link to="/"><Botao>Ver catálogo</Botao></Link>}
        />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_320px]">
          <section className="rounded-xl border border-tinta-200 bg-white px-5">
            <ListaItensCarrinho />
          </section>
          <ResumoCarrinho />
        </div>
      )}
    </div>
  );
}
