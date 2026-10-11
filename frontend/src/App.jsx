import { Link, Route, Routes } from 'react-router-dom';
import { Cabecalho } from './componentes/Cabecalho.jsx';
import { RotaProtegida } from './componentes/RotaProtegida.jsx';
import { Botao, EstadoVazio } from './componentes/ui.jsx';
import { Cadastro } from './paginas/Cadastro.jsx';
import { Carrinho } from './paginas/Carrinho.jsx';
import { Catalogo } from './paginas/Catalogo.jsx';
import { Checkout } from './paginas/Checkout.jsx';
import { Entrar } from './paginas/Entrar.jsx';
import { PedidoDetalhe } from './paginas/PedidoDetalhe.jsx';
import { Pedidos } from './paginas/Pedidos.jsx';
import { Perfil } from './paginas/Perfil.jsx';
import { Produto } from './paginas/Produto.jsx';

function NaoEncontrada() {
  return (
    <EstadoVazio
      titulo="Página não encontrada"
      descricao="O endereço que você abriu não existe na loja."
      acao={<Link to="/"><Botao>Ir para o catálogo</Botao></Link>}
    />
  );
}

export function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50
          focus:rounded-lg focus:bg-tinta-900 focus:px-4 focus:py-2 focus:text-white"
      >
        Pular para o conteúdo
      </a>

      <Cabecalho />

      <main id="conteudo" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Routes>
          {/* Publicas: da para navegar sem conta. */}
          <Route path="/" element={<Catalogo />} />
          <Route path="/produto/:codigo" element={<Produto />} />
          <Route path="/entrar" element={<Entrar />} />
          <Route path="/cadastro" element={<Cadastro />} />

          {/* Exigem sessao. O backend valida de novo em cada chamada. */}
          <Route path="/carrinho" element={<RotaProtegida><Carrinho /></RotaProtegida>} />
          <Route path="/checkout" element={<RotaProtegida><Checkout /></RotaProtegida>} />
          <Route path="/pedidos" element={<RotaProtegida><Pedidos /></RotaProtegida>} />
          <Route path="/pedidos/:numero" element={<RotaProtegida><PedidoDetalhe /></RotaProtegida>} />
          <Route path="/perfil" element={<RotaProtegida><Perfil /></RotaProtegida>} />

          <Route path="*" element={<NaoEncontrada />} />
        </Routes>
      </main>

      <footer className="border-t border-tinta-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-tinta-500">
          <p className="font-semibold text-tinta-700">Kaizen Autopeças</p>
          <p className="mt-1">
            Projeto de teste técnico. Catálogo e pedidos vêm da API do Kaizen ERP.
          </p>
        </div>
      </footer>
    </div>
  );
}
