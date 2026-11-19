/**
 * Multi-step SCP demo server for CLRUN demos.
 * Flow: INIT → [Quick start | Step through] → (if Step through) STEP1 → STEP2 → [Finish | Back] → DONE.
 * Usage: node test/fixtures/scp-demo-server.js
 * Listens on port from env SCP_DEMO_PORT or 19800.
 */
const http = require('http');

const PORT = parseInt(process.env.SCP_DEMO_PORT || '19800', 10);
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

function makeTransition(runId, action, href) {
  return { action, method: 'POST', href: `${BASE}/runs/${runId}/transitions/${action}` };
}

function nextStatesFor(runId, state) {
  switch (state) {
    case 'INIT':
      return [
        makeTransition(runId, 'quick_start', 'quick_start'),
        makeTransition(runId, 'step_through', 'step_through'),
      ];
    case 'STEP1':
      return [makeTransition(runId, 'next', 'next')];
    case 'STEP2':
      return [
        makeTransition(runId, 'finish', 'finish'),
        makeTransition(runId, 'back', 'back'),
      ];
    default:
      return [];
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', BASE);
  const path = url.pathname;
  const method = req.method;

  // POST /runs
  if (method === 'POST' && path === '/runs') {
    await parseBody(req);
    const runId = 'run-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    const record = {
      run_id: runId,
      workflow_id: 'demo-wf',
      state: 'INIT',
      status: 'active',
      hint: 'Choose how to run the demo.',
      next_states: nextStatesFor(runId, 'INIT'),
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
      options: (r.next_states || []).map((ns) => ({
        action: ns.action,
        label: ns.action.replace(/_/g, ' '),
      })),
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

    const { state } = r;
    if (action === 'quick_start' || action === 'finish') {
      r.state = 'DONE';
      r.status = 'completed';
      r.hint = 'Demo complete.';
      r.next_states = [];
    } else if (action === 'step_through') {
      r.state = 'STEP1';
      r.status = 'active';
      r.hint = 'Step 1 of 2: Configure. Choose Next to continue.';
      r.next_states = nextStatesFor(id, 'STEP1');
    } else if (action === 'next' && state === 'STEP1') {
      r.state = 'STEP2';
      r.status = 'active';
      r.hint = 'Step 2 of 2: Confirm. Finish to complete or Back to change.';
      r.next_states = nextStatesFor(id, 'STEP2');
    } else if (action === 'back' && state === 'STEP2') {
      r.state = 'STEP1';
      r.status = 'active';
      r.hint = 'Step 1 of 2: Configure. Choose Next to continue.';
      r.next_states = nextStatesFor(id, 'STEP1');
    } else {
      return send(res, 403, { hint: 'Invalid transition' });
    }

    return send(res, 200, r);
  }

  send(res, 404, { hint: 'Not found' });
});

server.listen(PORT, '127.0.0.1', () => {
  process.stderr.write(`SCP demo server at http://127.0.0.1:${PORT}\n`);
  process.stderr.write('Flow: INIT → [Quick start | Step through] → STEP1 → STEP2 → [Finish | Back] → DONE\n');
});
