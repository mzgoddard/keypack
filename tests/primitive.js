#!/usr/bin/env node

const t = require('tap');

const {load, dump} = require('../src');

t.test('null', t => {
  t.equal(load(dump(null)), null, 'output equals input');
  t.end();
});

t.test('false', t => {
  t.equal(load(dump(false)), false, 'output equals input');
  t.end();
});

t.test('true', t => {
  t.equal(load(dump(true)), true, 'output equals input');
  t.end();
});

t.test('""', t => {
  t.equal(load(dump('')), '', 'output equals input');
  t.end();
});
