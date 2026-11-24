import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AUDIT_ROWS,
  FOOTER_LINKS,
  GATE_CHECKS,
  GATE_PREVIEW,
  HERO_COPY,
  LEGAL_PAGES,
  NAV_LINKS,
  REQUEST_PREVIEW,
  ROLE_CARDS,
  WORKFLOW_STEPS,
} from '../src/pages/public/landingContent.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readProjectFile = (relativePath) => readFileSync(path.join(root, relativePath), 'utf8');

test('hero copy is specific to campus gate passes', () => {
  assert.match(HERO_COPY.headline, /gate pass/i);
  assert.match(HERO_COPY.headline, /QR/i);
  assert.match(HERO_COPY.description, /clerk/i);
  assert.match(HERO_COPY.description, /guard/i);
  assert.equal(HERO_COPY.primaryCta.to, '/login');
  assert.match(HERO_COPY.secondaryCta.href, /^#/);
});

test('landing copy contains no fabricated proof or filler metrics', () => {
  const content = JSON.stringify({
    HERO_COPY,
    REQUEST_PREVIEW,
    GATE_PREVIEW,
    GATE_CHECKS,
    ROLE_CARDS,
    WORKFLOW_STEPS,
    AUDIT_ROWS,
  });

  const bannedPatterns = [
    /viewing now/i,
    /trusted by/i,
    /testimonial/i,
    /customer reviews?/i,
    /five.star/i,
    /\b\d{1,3}(,\d{3})+\b/,
    /\b\d+%\b/,
    /unlock your potential/i,
    /—/,
  ];

  for (const pattern of bannedPatterns) {
    assert.doesNotMatch(content, pattern, `banned pattern found: ${pattern}`);
  }
});

test('preview cards describe real workflow states', () => {
  assert.equal(REQUEST_PREVIEW.status, 'Pending review');
  assert.equal(GATE_PREVIEW.result, 'Pass valid');
  assert.equal(REQUEST_PREVIEW.reference, GATE_PREVIEW.reference);
  assert.deepEqual(
    REQUEST_PREVIEW.timeline.map((item) => item.state),
    ['done', 'current', 'upcoming'],
  );
  assert.equal(REQUEST_PREVIEW.fields.length, 4);
  assert.equal(GATE_PREVIEW.rows.length, 3);
});

test('navigation and footer links point to real routes or sections', () => {
  const links = [...NAV_LINKS, ...FOOTER_LINKS];

  for (const link of links) {
    const target = link.href ?? link.to;
    assert.match(target, /^(#\/|[/#])/, `invalid link target: ${target}`);
  }

  assert.deepEqual(
    FOOTER_LINKS.map((link) => link.label),
    ['Privacy Policy', 'Terms & Conditions'],
  );
  assert.deepEqual(
    FOOTER_LINKS.map((link) => link.to),
    ['/privacy', '/terms'],
  );
});

test('legal pages have substantive content', () => {
  for (const key of ['privacy', 'terms']) {
    const page = LEGAL_PAGES[key];
    assert.ok(page.title.length > 0);
    assert.ok(page.intro.length > 40);
    assert.ok(page.sections.length >= 3);

    for (const section of page.sections) {
      assert.ok(section.heading.length > 0);
      assert.ok(section.body.length > 40);
    }
  }
});

test('favicon is a custom mark without gradients or purple branding', () => {
  const favicon = readProjectFile('public/favicon.svg');
  const html = readProjectFile('index.html');

  assert.match(favicon, /^<svg[\s\S]*<\/svg>\s*$/);
  assert.match(html, /href="\/favicon\.svg"/);
  assert.doesNotMatch(favicon, /#863bff|#7e14ff|linearGradient|radialGradient/i);
});

test('landing page source avoids gimmicky visual patterns', () => {
  const source = readProjectFile('src/pages/public/LandingPage.jsx');

  assert.doesNotMatch(source, /bg-gradient-to|linear-gradient|radial-gradient/i);
  assert.doesNotMatch(source, /animate-|hover:-translate|cursor:/i);
  assert.doesNotMatch(source, /—/);
  assert.match(source, /rounded-md bg-orange-700/);
});
