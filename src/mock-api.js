import { frames } from './data.js';

const stateNames = { Raw: 'Eligible', Selected: 'Reserved', Labeled: 'Labeled', Excluded: 'Excluded' };
const PAGE_SIZE = 12;

/**
 * Cursor-based preview API adapter.
 * Returns the same 36 registered preview records across sources. Source membership
 * is not asserted: the real service must query the selected snapshot or dataset.
 */
export async function listSamplePreviews({
  cursor = null, sourceType = 'pool', sourceId = null,
  state = 'All', domain = 'All', weather = 'All', quality = 'All',
  minObjects = '', maxUncertainty = '', search = ''
} = {}) {
  await new Promise(resolve => setTimeout(resolve, 120));
  const filtered = frames.filter(f =>
    (state === 'All' || stateNames[f.state] === state) &&
    (domain === 'All' || f.domain === domain) &&
    (weather === 'All' || f.weather === weather) &&
    (quality === 'All' || f.quality === quality) &&
    (minObjects === '' || f.objects >= Number(minObjects)) &&
    (maxUncertainty === '' || f.uncertainty <= Number(maxUncertainty)) &&
    `${f.id} ${f.domain} ${f.video}`.toLowerCase().includes(search.toLowerCase())
  );
  const offset = cursor == null ? 0 : Number(cursor);
  if (!Number.isInteger(offset) || offset < 0 || offset > filtered.length)
    throw new Error('Invalid preview cursor');
  const items = filtered.slice(offset, offset + PAGE_SIZE);
  const after = offset + items.length;
  return {
    items,
    nextCursor: after < filtered.length ? String(after) : null,
    totalPreview: filtered.length,
    pageSize: PAGE_SIZE,
    scope: { sourceType, sourceId, membershipVerified: false }
  };
}
