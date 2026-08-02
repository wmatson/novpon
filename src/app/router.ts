export type Route = { kind: 'home' } | { kind: 'daily' } | { kind: 'random' } | { kind: 'custom'; encoded: string; hintEncoded?: string };
export function routeFromHash(hash = location.hash): Route { const path = hash.replace(/^#\/?/, ''); if (path === 'daily') return { kind: 'daily' }; if (path === 'random') return { kind: 'random' }; if (path.startsWith('p/')) { const [encoded, query] = path.slice(2).split('?h='); return { kind: 'custom', encoded, hintEncoded: query || undefined }; } return { kind: 'home' }; }
export function go(path: string): void { location.hash = path; }
