export interface Env {
  DB: any;
  API_KEY?: string;
}

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-api-key, Authorization',
  'Access-Control-Max-Age': '86400',
};

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export const onRequest = async (context: { request: Request; env: Env }) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '');

  if (path === '/api/health' || path === '/health') {
    return jsonResponse({
      status: 'ok',
      engine: 'cloudflare-d1-edge',
      colo: (request as any).cf?.colo || 'edge',
      timestamp: new Date().toISOString(),
    });
  }

  // Optional API key check
  const apiKey = request.headers.get('x-api-key');
  if (env.API_KEY && apiKey && apiKey !== env.API_KEY) {
    return jsonResponse({ error: 'Unauthorized API Key' }, 401);
  }

  try {
    // 1. Batch Upsert Documents: POST /api/_batch/:collection
    const batchMatch = path.match(/^\/api\/_batch\/([^/]+)$/);
    if (batchMatch && request.method === 'POST') {
      const collection = decodeURIComponent(batchMatch[1]);
      const body: any = await request.json();
      const docs = Array.isArray(body?.docs) ? body.docs : [];
      if (docs.length === 0) return jsonResponse({ ok: true, count: 0 });

      const now = new Date().toISOString();
      const stmt = env.DB.prepare(
        'INSERT INTO d1_kv_docs (collection, id, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?) ' +
          'ON CONFLICT(collection, id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at'
      );

      // D1 batch limit is 100 statements per batch call
      const BATCH_LIMIT = 80;
      for (let i = 0; i < docs.length; i += BATCH_LIMIT) {
        const slice = docs.slice(i, i + BATCH_LIMIT);
        const batch = slice.map((d: any) =>
          stmt.bind(
            collection,
            String(d.id),
            typeof d.data === 'string' ? d.data : JSON.stringify(d.data),
            now,
            now
          )
        );
        await env.DB.batch(batch);
      }

      return jsonResponse({ ok: true, collection, count: docs.length });
    }

    // 2. Single Document Route: /api/:collection/:id
    const docMatch = path.match(/^\/api\/([^/]+)\/([^/]+)$/);
    if (docMatch) {
      const collection = decodeURIComponent(docMatch[1]);
      const id = decodeURIComponent(docMatch[2]);

      if (request.method === 'GET') {
        const row = await env.DB.prepare(
          'SELECT id, data, created_at, updated_at FROM d1_kv_docs WHERE collection = ? AND id = ?'
        )
          .bind(collection, id)
          .first();

        if (!row) return jsonResponse({ error: 'Not found' }, 404);
        return new Response(
          `{"id":${JSON.stringify(row.id)},"data":${row.data},"created_at":${JSON.stringify(row.created_at)},"updated_at":${JSON.stringify(row.updated_at)}}`,
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (request.method === 'POST' || request.method === 'PUT') {
        const rawBody = await request.text();
        const now = new Date().toISOString();
        await env.DB.prepare(
          'INSERT INTO d1_kv_docs (collection, id, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?) ' +
            'ON CONFLICT(collection, id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at'
        )
          .bind(collection, id, rawBody, now, now)
          .run();
        return jsonResponse({ ok: true, collection, id });
      }

      if (request.method === 'DELETE') {
        await env.DB.prepare('DELETE FROM d1_kv_docs WHERE collection = ? AND id = ?')
          .bind(collection, id)
          .run();
        return jsonResponse({ ok: true, collection, id });
      }
    }

    // 3. Collection Route: /api/:collection
    const colMatch = path.match(/^\/api\/([^/]+)$/);
    if (colMatch) {
      const collection = decodeURIComponent(colMatch[1]);

      if (request.method === 'GET') {
        const limit = Math.min(500, Math.max(1, Number(url.searchParams.get('limit')) || 100));
        const offset = Math.max(0, Number(url.searchParams.get('offset')) || 0);

        const countRow = await env.DB.prepare(
          'SELECT COUNT(*) as total FROM d1_kv_docs WHERE collection = ?'
        )
          .bind(collection)
          .first();
        const rows = await env.DB.prepare(
          'SELECT id, data, updated_at FROM d1_kv_docs WHERE collection = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?'
        )
          .bind(collection, limit, offset)
          .all();

        const results = (rows.results || []).map((r: any) => ({
          id: r.id,
          data: JSON.parse(r.data),
          updated_at: r.updated_at,
        }));

        return jsonResponse({
          collection,
          count: countRow?.total || 0,
          results,
        });
      }

      if (request.method === 'DELETE') {
        await env.DB.prepare('DELETE FROM d1_kv_docs WHERE collection = ?')
          .bind(collection)
          .run();
        return jsonResponse({ ok: true, collection });
      }
    }

    return jsonResponse({ error: 'Route not found', path }, 404);
  } catch (err: any) {
    return jsonResponse({ error: err.message || String(err) }, 500);
  }
};
