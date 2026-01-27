/**
 * Multi-App Frontend Server
 * Routes requests to admin or core app based on Host header
 */

const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const PORT = parseInt(process.env.PORT, 10) || 3000;
const HOSTNAME = process.env.HOSTNAME || '0.0.0.0';

// Domains configuration
const ADMIN_DOMAINS = ['admin.truestack.my', 'admin.localhost'];
const CORE_DOMAINS = ['core.truestack.my', 'core.localhost', 'localhost'];

// App port allocation (internal only)
const ADMIN_PORT = 3001;
const CORE_PORT = 3002;

// App processes
let adminProcess = null;
let coreProcess = null;

// Start the admin app
function startAdmin() {
  console.log('Starting admin app on port', ADMIN_PORT);
  adminProcess = spawn('node', ['admin/apps/admin/server.js'], {
    cwd: __dirname,
    env: {
      ...process.env,
      PORT: String(ADMIN_PORT),
      HOSTNAME: '127.0.0.1',
    },
    stdio: 'inherit',
  });
  
  adminProcess.on('error', (err) => {
    console.error('Admin app error:', err);
  });
}

// Start the core app
function startCore() {
  console.log('Starting core app on port', CORE_PORT);
  coreProcess = spawn('node', ['core/apps/core/server.js'], {
    cwd: __dirname,
    env: {
      ...process.env,
      PORT: String(CORE_PORT),
      HOSTNAME: '127.0.0.1',
    },
    stdio: 'inherit',
  });
  
  coreProcess.on('error', (err) => {
    console.error('Core app error:', err);
  });
}

// Proxy request to the appropriate app
function proxyRequest(req, res, targetPort) {
  const options = {
    hostname: '127.0.0.1',
    port: targetPort,
    path: req.url,
    method: req.method,
    headers: req.headers,
  };

  const proxy = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxy.on('error', (err) => {
    console.error('Proxy error:', err.message);
    res.writeHead(502);
    res.end('Bad Gateway');
  });

  req.pipe(proxy, { end: true });
}

// Determine which app to route to based on Host header
function getTargetPort(host) {
  // Remove port from host if present
  const hostname = (host || '').split(':')[0].toLowerCase();
  
  if (ADMIN_DOMAINS.some(d => hostname.includes(d) || hostname.startsWith('admin'))) {
    return ADMIN_PORT;
  }
  
  // Default to core app
  return CORE_PORT;
}

// Create the main server
const server = http.createServer((req, res) => {
  const host = req.headers.host;
  const targetPort = getTargetPort(host);
  
  // Health check endpoint
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    return;
  }
  
  proxyRequest(req, res, targetPort);
});

// Graceful shutdown
function shutdown() {
  console.log('Shutting down...');
  
  if (adminProcess) {
    adminProcess.kill('SIGTERM');
  }
  if (coreProcess) {
    coreProcess.kill('SIGTERM');
  }
  
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
  
  // Force exit after timeout
  setTimeout(() => {
    console.error('Forced shutdown');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start everything
startAdmin();
startCore();

// Wait a bit for child processes to start
setTimeout(() => {
  server.listen(PORT, HOSTNAME, () => {
    console.log(`Multi-app server running at http://${HOSTNAME}:${PORT}`);
    console.log(`  Admin: admin.* routes to port ${ADMIN_PORT}`);
    console.log(`  Core: *.* routes to port ${CORE_PORT}`);
  });
}, 2000);
