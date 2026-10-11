import { Router } from 'express';
import { autenticar } from '../middleware/autenticacao.js';
import {
  atualizarEndereco,
  criarEndereco,
  listarEnderecos,
  removerEndereco,
} from '../services/enderecoService.js';
import {
  cep,
  ColetorDeErros,
  exigirObjeto,
  lerBooleano,
  textoObrigatorio,
  textoOpcional,
  uf,
} from '../lib/validacao.js';

export const rotasEnderecos = Router();

rotasEnderecos.use(autenticar);

function validarEndereco(corpo) {
  const erros = new ColetorDeErros();

  const dados = {
    apelido: textoObrigatorio(corpo.apelido, 'apelido', erros, { min: 2, max: 40 }),
    cep: cep(corpo.cep, 'cep', erros),
    logradouro: textoObrigatorio(corpo.logradouro, 'logradouro', erros, { min: 3, max: 160 }),
    numero: textoObrigatorio(corpo.numero, 'numero', erros, { min: 1, max: 20 }),
    complemento: textoOpcional(corpo.complemento, 'complemento', erros, { max: 80 }),
    bairro: textoObrigatorio(corpo.bairro, 'bairro', erros, { min: 2, max: 80 }),
    cidade: textoObrigatorio(corpo.cidade, 'cidade', erros, { min: 2, max: 80 }),
    uf: uf(corpo.uf, 'uf', erros),
    principal: lerBooleano(corpo.principal) ?? false,
  };

  erros.lancarSeInvalido('Nao foi possivel salvar o endereco.');
  return dados;
}

rotasEnderecos.get('/', (req, res) => {
  res.json({ dados: listarEnderecos(req.usuario.id) });
});

rotasEnderecos.post('/', (req, res) => {
  const dados = validarEndereco(exigirObjeto(req.body));
  res.status(201).json({ dados: criarEndereco(req.usuario.id, dados) });
});

rotasEnderecos.put('/:id', (req, res) => {
  const dados = validarEndereco(exigirObjeto(req.body));
  res.json({ dados: atualizarEndereco(req.usuario.id, Number(req.params.id), dados) });
});

rotasEnderecos.delete('/:id', (req, res) => {
  removerEndereco(req.usuario.id, Number(req.params.id));
  res.status(204).end();
});
