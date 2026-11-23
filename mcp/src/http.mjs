#!/usr/bin/env node
// Remote MCP server over Streamable HTTP (stateless) for claude.ai custom connectors.
// PORT (default 8787), optional ICON_STUDIO_MCP_TOKEN to require "Authorization: Bearer <token>"
// or ?token=<token> in the connector URL.
import http from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer } from './server.mjs';

const PORT = Number(process.env.PORT || 8787);
const TOKEN = process.env.ICON_STUDIO_MCP_TOKEN || '';

function authorized(req, url) {
  if (!TOKEN) return true;
  const h = req.headers.authorization || '';
  return h === `Bearer ${TOKEN}` || url.searchParams.get('token') === TOKEN;
}

const httpServer = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Mcp-Session-Id, Mcp-Protocol-Version');
  res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id');
  if (req.method === 'OPTIONS') return res.writeHead(204).end();
  if (url.pathname === '/health') return res.writeHead(200, { 'Content-Type': 'application/json' }).end('{"ok":true}');
  if (url.pathname !== '/mcp') return res.writeHead(404).end('Not found. MCP endpoint: /mcp');
  if (!authorized(req, url)) return res.writeHead(401, { 'Content-Type': 'application/json' }).end('{"error":"unauthorized"}');
  if (req.method !== 'POST') return res.writeHead(405, { Allow: 'POST' }).end();

  let body = '';
  for await (const chunk of req) body += chunk;
  let parsed;
  try { parsed = body ? JSON.parse(body) : undefined; } catch { return res.writeHead(400).end('Invalid JSON'); }

  const server = await createServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  res.on('close', () => { transport.close(); server.close(); });
  await server.connect(transport);
  await transport.handleRequest(req, res, parsed);
});

httpServer.listen(PORT, () => console.log(`Icon Studio MCP: http://localhost:${PORT}/mcp`));
