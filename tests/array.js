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

t.test('array byte', t => {
  let a = [];
  let i = 1;
  while (a.length < 0x0f) {
    // Keep the integers under a size to take one byte.
    a.push(i++ % 0x20);
  }
  for (i = 0x0f; i < 0x100; i++) {
    while (a.length < i) {
      // Keep the integers under a size to take one byte.
      a.push(i % 0x20);
    }

    t.equal(dump(a).length, i + 2, 'output takes n + 2 bytes');
    t.equal(load(dump(a)).length, a.length, 'output length equals input length');
    t.same(load(dump(a)), a, 'output equals input');
  }
  t.end();
});

t.test('array short', t => {
  let a = [];
  let i = 1;
  while (a.length < 0x100) {
    // Keep the integers under a size to take one byte.
    a.push(i++ % 0x20);
  }
  for (i = 0x100; i < 0x200; i += 16) {
    while (a.length < i) {
      // Keep the integers under a size to take one byte.
      a.push(i % 0x20);
    }

    t.equal(dump(a).length, i + 3, 'output takes n + 3 bytes');
    t.equal(load(dump(a)).length, a.length, 'output length equals input length');
    t.same(load(dump(a)), a, 'output equals input');
  }
  t.end();
});
