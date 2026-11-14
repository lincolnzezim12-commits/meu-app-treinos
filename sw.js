// Service worker do Projeto V — faz o app abrir sem internet (na academia com sinal fraco).
//
// Estratégia:
//  - Na instalação, guarda todos os arquivos do app (app shell) num cache versionado.
//  - Arquivos do próprio app: responde na hora com a cópia do cache e, em segundo plano,
//    busca a versão nova na rede para a próxima abertura (stale-while-revalidate).
//  - Pedidos para outros sites (YouTube, miniaturas) NÃO passam pelo cache: vídeos precisam de internet.
//  - Atualização: a versão nova fica esperando até você tocar em "Atualizar" no aviso do app.
//
// Ao publicar mudanças, aumente VERSAO para todos os arquivos serem baixados juntos.
const VERSAO = 'v8';
const CACHE = `projeto-v-${VERSAO}`;
const ARQUIVOS = [
  './', 'index.html', 'style.css', 'programa.js', 'app.js', 'manifest.json',
  'icons/icone.svg', 'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ARQUIVOS.map((u) => new Request(u, { cache: 'reload' })))),
  );
  // Sem skipWaiting aqui: a primeira instalação já assume sozinha; nas atualizações o app pergunta antes.
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const chaves = await caches.keys();
    await Promise.all(chaves.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => {
  if (e.data && e.data.tipo === 'ATUALIZAR') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // YouTube etc.: direto da rede

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // Navegação (abrir o app): qualquer página do escopo cai no index.html
    const chave = req.mode === 'navigate' ? 'index.html' : req;
    const emCache = await cache.match(chave, { ignoreSearch: true });
    const daRede = fetch(req).then((r) => {
      if (r && r.ok && r.type === 'basic') cache.put(chave, r.clone());
      return r;
    }).catch(() => null);
    if (emCache) {
      e.waitUntil(daRede); // atualiza em segundo plano
      return emCache;
    }
    const r = await daRede;
    return r || new Response('Sem conexão e arquivo ainda não guardado no aparelho.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  })());
});
