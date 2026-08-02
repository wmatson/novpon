export type Route = { kind: 'home' } | { kind: 'daily' } | { kind: 'random' } | { kind: 'custom'; encoded: string };
export function routeFromHash(hash = location.hash): Route { const path = hash.replace(/^#\/?/, ''); if (path === 'daily') return { kind: 'daily' }; if (path === 'random') return { kind: 'random' }; if (path.startsWith('p/')) return { kind: 'custom', encoded: path.slice(2) }; return { kind: 'home' }; }
export function go(path: string): void { location.hash = path; }
