#!/usr/bin/env node

const t = require('tap');

const {load, dump} = require('../src');

t.test('array subbyte', t => {
  let a = [];
  for (let i = 0; i < 0x0d; i++) {
    t.equal(dump(a).length, i + 1, 'output takes n + 1 bytes');
    t.equal(load(dump(a)).length, a.length, 'output length equals input length');
    t.same(load(dump(a)), a, 'output equals input');
    a.push(i);
  }
  t.end();
});

// t.test('array byte', t => {
//   let a = [];
//   for (let i = 0x0f; i < 0x100; i++) {
//     while (a.length < i) {
//       a.push(i);
//     }
//
//     t.equal(dump(a).length, i + 2, 'output takes n + 2 bytes');
//     t.equal(load(dump(a)).length, a.length, 'output length equals input length');
//     t.equal(load(dump(a)), a, 'output equals input');
//   }
//   t.end();
// });
