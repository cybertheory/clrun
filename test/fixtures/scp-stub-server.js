/**
 * Minimal SCP stub server for CLRUN integration tests.
 * Single transition: INIT --start--> DONE. Serves GET /runs/:id/cli.
 * Usage: node test/fixtures/scp-stub-server.js
 * Listens on port from env SCP_STUB_PORT or 19799.
 */
const http = require('http');

const PORT = parseInt(process.env.SCP_STUB_PORT || '19799', 10);
const BASE = `http://127.0.0.1:${PORT}`;

const runs = new Map();

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let buf = '';
    req.on('data', (c) => { buf += c; });
    req.on('end', () => {
      try { resolve(buf ? JSON.parse(buf) : {}); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', BASE);
  const path = url.pathname;
  const method = req.method;

  // POST /runs
  if (method === 'POST' && path === '/runs') {
    const body = await parseBody(req);
    const runId = 'run-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    const record = {
      run_id: runId,
      workflow_id: 'stub-wf',
      state: 'INIT',
      status: 'active',
      hint: 'Start the flow.',
      next_states: [
        { action: 'start', method: 'POST', href: `${BASE}/runs/${runId}/transitions/start` },
      ],
    };
    runs.set(runId, record);
    return send(res, 201, record);
  }

  // GET /runs/:id
  if (method === 'GET' && path.startsWith('/runs/') && !path.endsWith('/cli')) {
    const id = path.replace(/^\/runs\//, '').replace(/\/.*$/, '');
    const r = runs.get(id);
    if (!r) return send(res, 404, { hint: 'Run not found' });
    return send(res, 200, r);
  }

  // GET /runs/:id/cli
  if (method === 'GET' && path.endsWith('/cli')) {
    const id = path.replace(/^\/runs\//, '').replace(/\/cli$/, '');
    const r = runs.get(id);
    if (!r) return send(res, 404, { hint: 'Run not found' });
    const cli = {
      prompt: 'Choose an action',
      hint: r.hint,
      options: (r.next_states || []).map((ns) => ({ action: ns.action, label: ns.action })),
    };
    return send(res, 200, cli);
  }

  // POST /runs/:id/transitions/:action
  const match = path.match(/^\/runs\/([^/]+)\/transitions\/([^/]+)$/);
  if (method === 'POST' && match) {
    const [, id, action] = match;
    const r = runs.get(id);
    if (!r) return send(res, 404, { hint: 'Run not found' });
    const ns = (r.next_states || []).find((x) => x.action === action);
    if (!ns) return send(res, 403, { hint: 'Invalid action' });
    r.state = 'DONE';
    r.status = 'completed';
    r.hint = 'Done.';
    r.next_states = [];
    return send(res, 200, r);
  }

  send(res, 404, { hint: 'Not found' });
});

server.listen(PORT, '127.0.0.1', () => {
  process.stderr.write(`SCP stub server at http://127.0.0.1:${PORT}\n`);
});
