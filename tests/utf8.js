#!/usr/bin/env node

const t = require('tap');

const {load, dump} = require('../src');

t.test('utf8 empty', t => {
  t.equal(dump('').length, 1, 'output takes 1 byte');
  t.equal(load(dump('')), '', 'output equals input');
  t.end();
});

t.test('utf8 partial byte length', t => {
  let s = '';
  let si = 0;
  for (let i = 1; i < (0xda & 0x1f); i++) {
    while (s.length < i) {
      s += (si++ % 10).toString();
    }

    t.equal(dump(s).length, i + 1, 'output takes n + 1 bytes');
    t.equal(load(dump(s)).length, i, 'output length equals input length');
    t.equal(load(dump(s)), s, 'output equals input');
  }
  t.end();
});

t.test('utf8 byte length', t => {
  let s = '';
  let si = 0;
  for (let i = 0xda & 0x1f; i < 0xff + (0xda & 0x1f); i++) {
    while (s.length < i) {
      s += (si++ % 10).toString();
    }

    t.equal(dump(s).length, i + 2, 'output takes n + 1 bytes');
    t.equal(load(dump(s)).length, i, 'output length equals input length');
    t.equal(load(dump(s)), s, 'output equals input');
  }
  t.end();
});

t.test('utf8 short length', t => {
  let s = '';
  let si = 0;
  let i = 0xff + (0xda & 0x1f);
  while (s.length < i) {
    s += (si++ % 10).toString();
  }

  t.equal(dump(s).length, i + 3, 'output takes n + 1 bytes');
  t.equal(load(dump(s)).length, i, 'output length equals input length');
  t.equal(load(dump(s)), s, 'output equals input');

  i = 0xffff;
  while (s.length < i) {
    s += (si++ % 10).toString();
  }

  t.equal(dump(s).length, i + 3, 'output takes n + 1 bytes');
  t.equal(load(dump(s)).length, i, 'output length equals input length');
  t.equal(load(dump(s)), s, 'output equals input');

  t.end();
});

t.test('utf8 word length', t => {
  let s = '';
  let si = 0;
  let i = 0x10000;
  while (s.length < i) {
    s += (si++ % 10).toString();
  }

  t.equal(dump(s).length, i + 5, 'output takes n + 1 bytes');
  t.equal(load(dump(s)).length, i, 'output length equals input length');
  t.equal(load(dump(s)), s, 'output equals input');

  t.end();
});
