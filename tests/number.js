#!/usr/bin/env node

const t = require('tap');

const {load, dump} = require('../src');

t.test('uint6', t => {
  for (let i = 0; i < 50; i++) {
    t.equal(dump(i).length, 1, 'output takes 1 byte');
    t.equal(load(dump(i)), i, 'output equals input');
  }
  t.end();
});

t.test('uint8+', t => {
  for (let i = 50; i < 0xff + 50; i++) {
    t.equal(dump(i).length, 2, 'output takes 2 bytes');
    t.equal(load(dump(i)), i, 'output equals input');
  }
  t.end();
});

t.test('uint16', t => {
  for (let i = 0x1ff; i < 0xffff; i += 0xff) {
    t.equal(dump(i).length, 3, 'output takes 3 bytes');
    t.equal(load(dump(i)), i, 'output equals input');
  }
  t.end();
});

t.test('uint32', t => {
  for (let i = 0xffffff; i < 0x7fffffff; i += 0xffffff) {
    t.equal(dump(i).length, 5, 'output takes 5 bytes');
    t.equal(load(dump(i)), i, 'output equals input');
  }
  t.end();
});

t.test('int32', t => {
  for (let i = -0xffffff; i > -0x80000000; i -= 0xffffff) {
    t.equal(dump(i).length, 5, 'output takes 5 bytes');
    t.equal(load(dump(i)), i, 'output equals input');
  }
  t.end();
});

t.test('float64', t => {
  for (let i = 1.1; i < 50; i *= 1.1) {
    t.equal(dump(i).length, 9, 'output takes 9 bytes');
    t.equal(load(dump(i)), i, 'output equals input');
  }
  t.end();
});
