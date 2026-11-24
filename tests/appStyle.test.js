import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as uiStyles from '../src/utils/uiStyles.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const collectFiles = (directory, extensions) => {
  const files = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath, extensions));
    } else if (extensions.some((extension) => entry.name.endsWith(extension))) {
      files.push(fullPath);
    }
  }

  return files;
};

const sourceFiles = collectFiles(path.join(root, 'src'), ['.jsx', '.css']);
const sourceText = sourceFiles
  .map((file) => readFileSync(file, 'utf8'))
  .join('\n');

const bannedPatterns = [
  { name: 'gradients', pattern: /linear-gradient|radial-gradient|bg-gradient-to-|from-transparent|via-emerald|hover:from-/i },
  { name: 'glassmorphism', pattern: /backdrop-blur|backdropFilter|glass-dark|glass-orange/i },
  { name: 'entry or float animations', pattern: /animate-(slide-up|slide-in|pulse|ping|float|glow-pulse)|@keyframes\s|scanner-ring/i },
  { name: 'hover motion', pattern: /hover:-?translate|hover:scale|group-hover:scale|hover:shadow-(md|lg|xl|2xl)/i },
  { name: 'large radii', pattern: /rounded-(xl|2xl|3xl)/i },
  {
    name: 'off-palette colors',
    pattern: /\b(text|bg|border|from|to|via)-(blue|emerald|green|rose|red|amber|yellow|indigo|violet|purple|fuchsia|teal|cyan|sky)-\d/i,
  },
  { name: 'decorative glyphs', pattern: /—|✓|✕|→|•/ },
  { name: 'colored glow shadows', pattern: /rgba\(249,\s*115,\s*22/i },
  { name: 'non-functional transitions', pattern: /transition-(all|colors|transform|shadow)|duration-(200|300|700)/i },
];

test('application source follows the restrained design system', () => {
  for (const { name, pattern } of bannedPatterns) {
    assert.doesNotMatch(sourceText, pattern, `${name} found in application source`);
  }
});

test('only functional spinner animation remains', () => {
  const animationMatches = sourceText.match(/animate-[a-z-]+/g) || [];
  const unique = [...new Set(animationMatches)];

  assert.deepEqual(unique.sort(), ['animate-spin']);
});

test('print support is preserved', () => {
  const css = readFileSync(path.join(root, 'src/index.css'), 'utf8');
  const reports = readFileSync(path.join(root, 'src/pages/admin/ReportsPage.jsx'), 'utf8');
  const passDetails = readFileSync(path.join(root, 'src/pages/student/PassDetailsPage.jsx'), 'utf8');

  assert.match(css, /@media print/);
  assert.match(css, /#printable-gate-pass/);
  assert.match(css, /\.no-print/);
  assert.match(reports, /id="printable-gate-pass"|printable-gate-pass/);
  assert.match(passDetails, /printable-gate-pass/);
  assert.match(reports, /no-print/);
});

test('shared style primitives expose the required classes', () => {
  for (const name of ['focusRing', 'buttonPrimary', 'buttonSecondary', 'buttonDark', 'card', 'input', 'badge', 'badgeAccent']) {
    assert.equal(typeof uiStyles[name], 'string', `missing style primitive: ${name}`);
    assert.match(uiStyles[name], /rounded-md|focus-visible/);
  }
});

test('fabricated metrics and demo results are removed', () => {
  const guardDashboard = readFileSync(path.join(root, 'src/pages/guard/GuardDashboard.jsx'), 'utf8');
  const verificationResult = readFileSync(path.join(root, 'src/pages/guard/VerificationResultPage.jsx'), 'utf8');
  const reports = readFileSync(path.join(root, 'src/pages/admin/ReportsPage.jsx'), 'utf8');
  const profile = readFileSync(path.join(root, 'src/pages/student/StudentProfilePage.jsx'), 'utf8');

  assert.doesNotMatch(guardDashboard, /validScansCount\s*>\s*0\s*\?\s*validScansCount\s*:\s*2/);
  assert.doesNotMatch(verificationResult, /defaultValidPass/);
  assert.doesNotMatch(reports, /item\.count\s*\/\s*50/);
  assert.doesNotMatch(profile, /approvalRate[^;]*:\s*100/);
});

test('active filters use a solid background', () => {
  const files = [
    'src/pages/student/MyRequestsPage.jsx',
    'src/pages/guard/ScanHistoryPage.jsx',
    'src/pages/admin/AllPassesPage.jsx',
  ];

  for (const file of files) {
    const source = readFileSync(path.join(root, file), 'utf8');
    assert.match(source, /bg-orange-700 text-white/, `${file} active filter needs a solid background`);
  }
});
