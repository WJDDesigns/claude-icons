import test from 'node:test';
import assert from 'node:assert/strict';
import { suggest, rankIcons, pickColor } from '../src/suggest.js';

const cases = [
  [{ name: 'Northwind Coffee website redesign', description: 'New Shopify site for a local coffee roaster', files: ['homepage-wireframe.fig', 'menu.pdf'] }, ['browser', 'coffee', 'store', 'globe']],
  [{ name: '2026 taxes', files: ['W2.pdf', '1099-INT.pdf', 'receipts.csv'] }, ['taxes']],
  [{ name: 'Q1 board deck' }, ['presentation']],
  [{ name: 'Spanish practice' }, ['translate']],
  [{ name: "Mia's science fair", description: 'Testing which paper towel absorbs the most water' }, ['flask', 'atom', 'microscope']],
  [{ name: 'Kitchen remodel' }, ['hammer', 'paint-roller', 'cooking-pot', 'house']],
  [{ name: 'Customer support bot' }, ['robot']],
  [{ name: 'Marathon training plan' }, ['activity']],
  [{ name: 'Wedding planning' }, ['ring']],
  [{ name: 'Etsy shop for knit hats' }, ['yarn', 'store']],
  [{ name: 'Acme Corp invoices' }, ['invoice']],
  [{ name: 'Untitled', files: ['churn.csv', 'cohorts.csv', 'model.ipynb'] }, ['table', 'scatter']],
  [{ name: 'Podcast season 2' }, ['microphone']],
  [{ name: 'Photography portfolio' }, ['camera']],
  [{ name: 'Family vacation to Japan' }, ['plane', 'suitcase', 'translate']],
  [{ name: 'Mobile app launch' }, ['smartphone', 'rocket']],
  [{ name: 'Dog adoption' }, ['paw']],
  [{ name: 'Budget 2027' }, ['budget']],
];

for (const [project, expected] of cases) {
  test(`suggests ${expected.join(' or ')} for "${project.name}"`, () => {
    const top = suggest(project);
    assert.ok(expected.includes(top.icon), `got ${top.icon}; ranking: ${rankIcons(project).map((r) => r.icon).join(', ')}`);
    assert.ok(top.reasons.length > 0);
  });
}

test('falls back calmly when there is nothing to go on', () => {
  const s = suggest({ name: '' });
  assert.equal(s.confidence, 0);
  assert.ok(s.icon);
});

test('steps to a new color when a sibling already uses the same icon and color', () => {
  const first = pickColor('store');
  const second = pickColor('store', [{ icon: 'store', color: first }]);
  assert.notEqual(first, second);
});
