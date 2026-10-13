import assert from 'node:assert/strict';
import test from 'node:test';
import { paraCentavos } from '../src/lib/dinheiro.js';

test('paraCentavos arredonda 19.99 para 1999 e 4.35 para 435', () => {
  assert.equal(paraCentavos(19.99), 1999);
  assert.equal(paraCentavos(4.35), 435);
});
