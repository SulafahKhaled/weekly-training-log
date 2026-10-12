import crypto from 'node:crypto';
import express from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { buildMcpServer } from './server.js';

export const hashToken = (t) => crypto.createHash('sha256').update(t).digest('hex');
export const newToken = () => `wtl_${crypto.randomBytes(32).toString('base64url')}`;

const rpcError = (res, status, message) => res.status(status).json({ jsonrpc: '2.0', error: { code: -32001, message }, id: null });

/**
 * Remote MCP endpoint (Streamable HTTP, stateless — one fresh server per request, so it runs on Vercel).
 *   POST /mcp              with  Authorization: Bearer <token>
 *   POST /mcp/<token>      for clients that can't set headers (claude.ai's connector form takes a URL only)
 * Only a SHA-256 hash of the token is stored; a wrong/missing token gets 401 and touches nothing.
 */
export function createMcpRouter(db) {
  const router = express.Router();

  async function handle(req, res) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : req.params.token;
    if (!token) return rpcError(res, 401, 'Missing connector token.');
    const rows = await db.query(
      `UPDATE mcp_tokens SET last_used_at = now() WHERE token_hash = $1
       RETURNING user_id, (SELECT username FROM users WHERE id = mcp_tokens.user_id) AS username`,
      [hashToken(token)]
    );
    if (!rows[0]) return rpcError(res, 401, 'Invalid or revoked connector token.');

    const server = buildMcpServer(db, { id: rows[0].user_id, username: rows[0].username });
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => {
      transport.close();
      server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  }

  const notAllowed = (_req, res) => rpcError(res, 405, 'Method not allowed. This connector is stateless: use POST.');
  router.post('/', handle);
  router.post('/:token', handle);
  router.get('/', notAllowed);
  router.get('/:token', notAllowed);
  router.delete('/', notAllowed);
  router.delete('/:token', notAllowed);
  return router;
}
