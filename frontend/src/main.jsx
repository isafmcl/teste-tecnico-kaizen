import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App.jsx';
import { ProvedorAuth } from './contextos/AuthContext.jsx';
import { ProvedorCarrinho } from './contextos/CarrinhoContext.jsx';
import './index.css';

/**
 * O carrinho fica dentro do Auth porque depende de saber se ha sessao:
 * sem usuario logado ele nem tenta buscar nada no servidor.
 */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ProvedorAuth>
        <ProvedorCarrinho>
          <App />
        </ProvedorCarrinho>
      </ProvedorAuth>
    </BrowserRouter>
  </StrictMode>,
);
