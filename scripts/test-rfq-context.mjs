import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const html = readFileSync(new URL('../padel-court-rfq-checklist.html', import.meta.url), 'utf8');
const script = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)]
  .map(match => match[1]).find(source => source.includes("document.getElementById('rfq-builder')"));
assert.ok(script, 'Actual RFQ builder script must be present');

function setup(search = '', saved = null, storageBlocked = false) {
  const storage = new Map(saved ? [['sportenvo_rfq_builder', JSON.stringify(saved)]] : []);
  const events = [];
  function element(attrs = {}) {
    return {
      attrs, handlers: {}, value: '', textContent: '',
      getAttribute(key) { return this.attrs[key]; },
      setAttribute(key, value) { this.attrs[key] = value; },
      addEventListener(key, callback) { this.handlers[key] = callback; },
    };
  }
  const groups = [...html.matchAll(/<div class="rfq-field" data-choice="([^"]+)">([\s\S]*?)<\/div><\/div>/g)]
    .map(match => {
      const group = element({ 'data-choice': match[1] });
      group.buttons = [...match[2].matchAll(/data-value="([^"]+)"/g)]
        .map(button => element({ 'data-value': button[1] }));
      group.querySelectorAll = () => group.buttons;
      return group;
    });
  assert.equal(groups.length, 7);
  const fields = [...html.matchAll(/data-rfq="([^"]+)"/g)]
    .map(match => element({ 'data-rfq': match[1] }));
  const output = element();
  const copy = element();
  const next = element();
  const root = {
    querySelector(selector) {
      return { '[data-rfq-output]': output, '[data-copy-rfq]': copy, '[data-continue-rfq]': next }[selector];
    },
    querySelectorAll(selector) { return selector === '[data-choice]' ? groups : fields; },
  };
  vm.runInNewContext(script, {
    document: { getElementById: () => root },
    window: { location: { search }, gtag: (...args) => events.push(args) },
    localStorage: {
      getItem(key) { if (storageBlocked) throw new Error('Blocked'); return storage.get(key) ?? null; },
      setItem(key, value) { if (storageBlocked) throw new Error('Blocked'); storage.set(key, value); },
    },
    URLSearchParams, navigator: {}, setTimeout() {},
  });
  const button = (key, value) => groups.find(group => group.attrs['data-choice'] === key)
    .buttons.find(item => item.attrs['data-value'] === value);
  return { storage, events, output, next, button };
}

test('ordinary entry retains the existing undecided court default', () => {
  const view = setup();
  assert.match(view.output.textContent, /Court preference: Not Sure/);
  assert.equal(view.events.length, 0);
});

test('product links apply court preference without assuming weather or foundation', () => {
  for (const [preset, title] of [['super-panoramic', 'Super Panoramic Padel Court'], ['roof', 'Padel Court with Roof']]) {
    const view = setup('?rfq_court=' + preset);
    assert.ok(view.output.textContent.includes('Court preference: ' + title));
    assert.equal(view.button('court', title).attrs['aria-pressed'], 'true');
    assert.match(view.output.textContent, /Weather protection: Not selected/);
    assert.match(view.output.textContent, /Foundation: Not selected/);
    assert.equal(view.events.length, 0, 'Page prefill is not a buyer selection or conversion');
  }
});

test('foundation entry preserves saved buyer inputs and court preference', () => {
  const view = setup('?rfq_foundation=modular', { court: 'Classic Padel Court', foundation: 'Existing Concrete', location: 'Spain', quantity: '1', notes: 'Existing project' });
  assert.match(view.output.textContent, /Foundation: Modular Foundation/);
  assert.match(view.output.textContent, /Court preference: Classic Padel Court/);
  assert.match(view.output.textContent, /Project location: Spain/);
  assert.match(view.output.textContent, /Project notes: Existing project/);
  assert.equal(view.button('foundation', 'Modular Foundation').attrs['aria-pressed'], 'true');
});

test('unknown and inherited property names cannot become product preferences', () => {
  for (const preset of ['unknown', 'constructor', '__proto__', '<script>alert(1)</script>']) {
    const view = setup('?rfq_court=' + encodeURIComponent(preset) + '&rfq_foundation=unknown');
    assert.match(view.output.textContent, /Court preference: Not Sure/);
    assert.match(view.output.textContent, /Foundation: Not selected/);
  }
});

test('buyer can change a prefilled choice and continue with that actual preference', () => {
  const view = setup('?rfq_court=roof');
  view.button('court', 'Classic Padel Court').handlers.click();
  assert.equal(view.button('court', 'Padel Court with Roof').attrs['aria-pressed'], 'false');
  assert.match(view.output.textContent, /Court preference: Classic Padel Court/);
  view.next.handlers.click();
  assert.equal(JSON.parse(view.storage.get('sportenvo_project_configurator')).court, 'Classic Padel Court');
  assert.deepEqual(view.events.map(event => event[1]), ['rfq_builder_select', 'rfq_builder_continue']);
});

test('prefill and editable brief still work when local storage is unavailable', () => {
  const view = setup('?rfq_court=super-panoramic', null, true);
  assert.match(view.output.textContent, /Court preference: Super Panoramic Padel Court/);
  view.button('foundation', 'Modular Foundation').handlers.click();
  assert.match(view.output.textContent, /Foundation: Modular Foundation/);
  assert.doesNotThrow(() => view.next.handlers.click());
});

test('all three product pages link to the builder with the intended context', () => {
  for (const [file, key, value] of [
    ['super-panoramic.html', 'rfq_court', 'super-panoramic'],
    ['roof.html', 'rfq_court', 'roof'],
    ['modular-foundation.html', 'rfq_foundation', 'modular'],
  ]) {
    const page = readFileSync(new URL('../' + file, import.meta.url), 'utf8');
    const links = [...page.matchAll(/href="(padel-court-rfq-checklist\.html[^"]*)"/g)]
      .map(match => new URL(match[1].replaceAll('&amp;', '&'), 'https://sportenvo.com/'));
    assert.ok(links.length >= 2, file);
    for (const link of links) {
      assert.equal(link.searchParams.get(key), value, file);
      assert.equal(link.hash, '#rfq-builder', file);
      assert.equal(link.searchParams.has('utm_source'), false);
    }
  }
});
