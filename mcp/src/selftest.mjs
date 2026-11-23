// Smoke test: starts the stdio server through the SDK client and calls each tool.
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const client = new Client({ name: 'selftest', version: '1.0.0' });
await client.connect(new StdioClientTransport({ command: process.execPath, args: [new URL('./stdio.mjs', import.meta.url).pathname] }));
const tools = (await client.listTools()).tools.map((t) => t.name);
console.log('tools:', tools.join(', '));
const s = await client.callTool({ name: 'search_icons', arguments: { query: 'суд', limit: 3 } });
console.log('search:', s.content[0].text.split('\n').join(' | '));
const g = await client.callTool({ name: 'get_icon', arguments: { icon: 'LAW-001', color: '#1E4FD8', size: 128, background: '#EFEAFF', format: 'png' } });
console.log('get_icon:', g.content[0].text.slice(0, 80) + '…', g.content[1]?.mimeType, (g.content[1]?.data?.length ?? 0) + ' b64 chars');
const m = await client.callTool({ name: 'get_icons', arguments: { icons: ['gavel', 'contract', 'nope'] } });
console.log('get_icons missing:', m.structuredContent.missing);
const c = await client.callTool({ name: 'list_categories', arguments: {} });
console.log('categories:', c.structuredContent.categories.length);
await client.close();
