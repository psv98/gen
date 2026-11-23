#!/usr/bin/env node
// Local MCP server over stdio (Claude Desktop, Claude Code).
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.mjs';

const server = await createServer();
await server.connect(new StdioServerTransport());
