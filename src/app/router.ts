export type Route = { kind: 'home' } | { kind: 'notes' } | { kind: 'daily' } | { kind: 'random'; id?: string } | { kind: 'custom'; encoded: string; hintEncoded?: string };
export function routeFromHash(hash = location.hash): Route {
  const path = hash.replace(/^#\/?/, '');
  if (path === 'daily') return { kind: 'daily' };
  if (path === 'notes') return { kind: 'notes' };
  if (path === 'random') return { kind: 'random' };
  if (path.startsWith('random/')) {
    try { return { kind: 'random', id: decodeURIComponent(path.slice('random/'.length)) }; }
    catch { return { kind: 'random', id: '' }; }
  }
  if (path.startsWith('p/')) { const [encoded, query] = path.slice(2).split('?h='); return { kind: 'custom', encoded, hintEncoded: query || undefined }; }
  return { kind: 'home' };
}
export function go(path: string): void { location.hash = path; }
