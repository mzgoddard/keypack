#!/usr/bin/env node

const t = require('tap');

const {load, dump} = require('../src');

const lorem = 'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.';

const words = (lorem + lorem).split(/(.{4})/g).filter(Boolean)
.concat((lorem + lorem).split(/(.{5})/g).filter(Boolean))
.concat((lorem + lorem).split(/(.{6})/g).filter(Boolean))
.concat((lorem + lorem).split(/(.{7})/g).filter(Boolean))
.concat((lorem + lorem).split(/(.{8})/g).filter(Boolean))
.reduce((carry, word, index, array) => (
  array.slice(0, index).indexOf(word) < 0 ? carry.concat(word) : carry
), []);

const w = words;

t.test('dictionary partial byte', t => {
  for (let i = 1; i < 5; i++) {
    const a = [];
    for (let j = 0; j < i; j++) {
      a.push(w[j]);
    }
    for (let j = 0; j < i; j++) {
      a.push(w[j]);
    }

    t.equal(dump(a).length, i * 5 + i + 1, 'output takes n + 1 bytes');
    t.equal(load(dump(a)).length, i * 2, 'output length equals input length');
    t.same(load(dump(a)), a, 'output equals input');
  }
  t.end();
});

t.test('dictionary byte', t => {
  for (let i = 0x80; i < 0x100; i++) {
    const a = [];
    for (let j = 0; j < i; j++) {
      a.push(w[j]);
    }
    for (let j = 0; j < i; j++) {
      a.push(w[j]);
    }

    // t.equal(dump(a).length, i * 5 + i + 1, 'output takes n + 1 bytes');
    t.equal(load(dump(a)).length, i * 2, 'output length equals input length');
    t.same(load(dump(a)), a, 'output equals input');
  }
  t.end();
});

t.test('dictionary short', t => {
  for (let i = 0x100; i < 0x200; i++) {
    const a = [];
    for (let j = 0; j < i; j++) {
      a.push(w[j]);
    }
    for (let j = 0; j < i; j++) {
      a.push(w[j]);
    }

    // t.equal(dump(a).length, i * 5 + i + 1, 'output takes n + 1 bytes');
    t.equal(load(dump(a)).length, i * 2, 'output length equals input length');
    t.same(load(dump(a)), a, 'output equals input');
  }
  t.end();
});
