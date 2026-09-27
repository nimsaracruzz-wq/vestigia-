import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Compile only the reveal modules in memory; no test framework or generated files.
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith('.') && context.parentURL?.includes('/src/animation/')) {
      for (const suffix of ['', '.ts', '.tsx']) {
        const url = new URL(specifier + suffix, context.parentURL);
        if (existsSync(fileURLToPath(url))) return { url: url.href, shortCircuit: true };
      }
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.includes('/src/animation/') && /\.(tsx?|css)$/.test(url)) {
      const source = url.endsWith('.css') ? 'export {};' : ts.transpileModule(readFileSync(fileURLToPath(url), 'utf8'), {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
        fileName: fileURLToPath(url),
      }).outputText;
      return { format: 'module', source, shortCircuit: true };
    }
    return next(url, context);
  },
});

const { animationConfig, revealPreset, staggerDelay } = await import('../src/animation/config.ts');
const { Reveal, RevealText, RevealGroup, RevealItem, RevealModal, RevealProvider, useReveal } = await import('../src/animation/Reveal.tsx');
const h = React.createElement;
const variants = ['fade', 'fadeUp', 'fadeDown', 'fadeLeft', 'fadeRight', 'scale', 'blur', 'imageReveal', 'textReveal'];

test('every preset ends visible and reduced motion removes all movement and delay', () => {
  for (const variant of variants) {
    const normal = revealPreset({ variant });
    assert.equal(normal.visible.opacity, 1);
    const reduced = revealPreset({ variant, reduced: true, delay: 0.2 });
    assert.deepEqual(reduced.hidden, reduced.visible, variant);
    assert.equal(reduced.transition.duration, 0);
    assert.equal(reduced.transition.delay, 0);
  }
});

test('mobile and admin movement is smaller and faster than storefront desktop', () => {
  const desktop = revealPreset(), mobile = revealPreset({ mobile: true }), admin = revealPreset({ tone: 'admin' });
  assert.ok(mobile.hidden.y < desktop.hidden.y);
  assert.equal(admin.hidden.y, mobile.hidden.y);
  assert.ok(mobile.transition.duration < desktop.transition.duration);
  assert.ok(admin.transition.duration < mobile.transition.duration);
});

test('long catalogs have bounded delays, and the first four cards are staggered', () => {
  assert.deepEqual([0, 1, 2, 3].map(i => staggerDelay(i)), [0, 0.04, 0.08, 0.12]);
  for (let index = 0; index < 1000; index++) assert.ok(staggerDelay(index) <= animationConfig.maxDelay);
  assert.equal(revealPreset({ delay: 10 }).transition.delay, animationConfig.maxDelay);
  assert.equal(staggerDelay(-3), 0);
});

test('reveals never animate layout properties, and hero media remains painted', () => {
  for (const variant of variants) {
    const { hidden, visible } = revealPreset({ variant });
    for (const key of ['height', 'width', 'top', 'left', 'margin', 'padding']) {
      assert.ok(!(key in hidden) && !(key in visible), `${variant}: ${key}`);
    }
  }
  assert.equal(revealPreset({ variant: 'imageReveal' }).hidden.opacity, 1);
});

test('viewport defaults reveal once and handle content taller than the viewport', () => {
  let props;
  function Probe({ once }) { props = useReveal({ once }); return null; }
  renderToStaticMarkup(h(Probe, {}));
  assert.equal(props.viewport.once, true);
  assert.equal(props.viewport.amount, 'some');
  renderToStaticMarkup(h(Probe, { once: false }));
  assert.equal(props.viewport.once, false);
});

test('server-rendered and reduced-motion content remains visible and interactive', () => {
  const markup = renderToStaticMarkup(h(Reveal, { as: 'section', className: 'panel' }, h('button', { type: 'button' }, 'Continue')));
  assert.match(markup, /^<section/);
  assert.match(markup, /opacity:1/);
  assert.match(markup, /<button type="button">Continue/);
  assert.doesNotMatch(markup, /pointer-events:none|aria-hidden="true"/);
});

test('grid groups keep semantic direct children and do not animate the grid container', () => {
  const markup = renderToStaticMarkup(h(RevealGroup, { as: 'ul', className: 'grid' },
    h(RevealItem, { as: 'li', key: 'a' }, 'First'), h(RevealItem, { as: 'li', key: 'b' }, 'Second')));
  assert.match(markup, /^<ul class="grid" data-reveal-group="true"><li/);
  assert.equal((markup.match(/<li /g) || []).length, 2);
  assert.doesNotMatch(markup, /<div/);
});

test('word headings expose one accessible phrase with decorative animated words', () => {
  const markup = renderToStaticMarkup(h(RevealText, { as: 'h1', split: 'words' }, 'Leave your mark.'));
  assert.match(markup, /<h1 aria-label="Leave your mark\."/);
  assert.equal((markup.match(/aria-hidden="true"/g) || []).length, 3);
});

test('form and modal semantics survive animation wrappers', () => {
  const form = renderToStaticMarkup(h(Reveal, { as: 'form', onSubmit: () => {} }, h('input', { name: 'email', type: 'email', required: true })));
  assert.match(form, /^<form/);
  assert.match(form, /name="email"/);
  const dialog = renderToStaticMarkup(h(RevealProvider, { tone: 'admin' }, h(RevealModal, { role: 'dialog', 'aria-modal': true, 'aria-label': 'Edit product' }, 'Editor')));
  assert.match(dialog, /role="dialog"/);
  assert.match(dialog, /aria-modal="true"/);
});
