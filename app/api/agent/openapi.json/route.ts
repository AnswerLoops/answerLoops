/**
 * GET /api/agent/openapi.json
 *
 * Real OpenAPI 3.0 spec for the Agent API — every path below actually
 * exists and works, unlike public/openapi.json (the GEO-era placeholder
 * that only documented /api/health because this surface didn't exist yet).
 * public/.well-known/ai-plugin.json's api.url now points here instead.
 */
export async function GET() {
  const spec = {
    openapi: '3.0.0',
    info: {
      title: 'AnswerLoops Agent API',
      description: 'REST API for AI agents and non-MCP frameworks (LangChain, AutoGen, custom bots) to search a knowledge base, read the latest FAQ, list/create tickets, and generate grounded answers — the same pipeline every other AnswerLoops channel uses. MCP-native clients (Claude Code, Cursor) should use the MCP server at POST /api/mcp instead; this REST surface exists for tooling that speaks HTTP + OpenAPI, not JSON-RPC.',
      version: '1.0.0',
    },
    servers: [{ url: 'https://answerloops.com' }],
    security: [{ bearerAuth: [] }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          description: 'Org-scoped API key generated in Settings → API Keys (al_live_ prefix). Shared with the MCP server — the same key authenticates both surfaces.',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: { message: { type: 'string' } },
              required: ['message'],
            },
          },
          required: ['error'],
        },
        Ticket: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            content: { type: 'string' },
            category: { type: 'string', nullable: true },
            priority: { type: 'string' },
            status: { type: 'string' },
            ai_summary: { type: 'string', nullable: true },
            created_at: { type: 'string' },
          },
        },
      },
    },
    paths: {
      '/api/agent/kb/search': {
        get: {
          operationId: 'searchKb',
          summary: "Semantically search the organization's knowledge base",
          parameters: [
            { name: 'query', in: 'query', required: true, schema: { type: 'string', maxLength: 2000 } },
            { name: 'limit', in: 'query', required: false, schema: { type: 'integer', minimum: 1, maximum: 20, default: 5 } },
          ],
          responses: {
            '200': {
              description: 'Matching KB articles, most relevant first',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      results: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            question: { type: 'string' },
                            answer: { type: 'string' },
                            score: { type: 'number' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing or invalid query', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            '401': { description: 'Missing/invalid/revoked API key', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            '429': { description: 'Rate limit exceeded', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/agent/faq': {
        get: {
          operationId: 'getFaq',
          summary: "Get the organization's most recently generated FAQ digest",
          responses: {
            '200': {
              description: 'Latest FAQ digest, or a message if none has been generated yet',
              content: { 'application/json': { schema: { type: 'object' } } },
            },
            '401': { description: 'Missing/invalid/revoked API key', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/agent/tickets': {
        get: {
          operationId: 'getTickets',
          summary: 'List support tickets for the organization',
          parameters: [
            { name: 'status', in: 'query', required: false, schema: { type: 'string', enum: ['open', 'in_progress', 'resolved', 'closed'] } },
            { name: 'priority', in: 'query', required: false, schema: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] } },
            { name: 'category', in: 'query', required: false, schema: { type: 'string', enum: ['bug', 'feature_request', 'documentation', 'how_to', 'general_question'] } },
            { name: 'limit', in: 'query', required: false, schema: { type: 'integer', minimum: 1, maximum: 20, default: 10 } },
          ],
          responses: {
            '200': {
              description: 'Most recent tickets first',
              content: {
                'application/json': {
                  schema: { type: 'object', properties: { tickets: { type: 'array', items: { $ref: '#/components/schemas/Ticket' } } } },
                },
              },
            },
            '400': { description: 'Invalid filter value', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            '401': { description: 'Missing/invalid/revoked API key', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
        post: {
          operationId: 'createTicket',
          summary: 'Open a new support ticket on behalf of a user',
          description: "Runs through the same AI triage/answer pipeline as every other channel (Discord, Slack, email) — the ticket may get auto-answered if confidence is high, otherwise it queues for human review.",
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    content: { type: 'string', maxLength: 4000, description: "The user's question or issue, verbatim" },
                    authorName: { type: 'string', description: 'Name/identifier of the end user this ticket is on behalf of (optional)' },
                    idempotencyKey: { type: 'string', maxLength: 200, description: 'Optional caller-supplied key — retrying with the same key returns the original ticket instead of opening a duplicate' },
                  },
                  required: ['content'],
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Ticket created (or the original ticket, if idempotencyKey matched a prior call)',
              content: {
                'application/json': {
                  schema: { type: 'object', properties: { ticket_id: { type: 'integer' }, duplicate: { type: 'boolean' } } },
                },
              },
            },
            '400': { description: 'Missing/invalid content', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            '401': { description: 'Missing/invalid/revoked API key', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/agent/answers': {
        post: {
          operationId: 'generateAnswer',
          summary: "Generate a grounded answer using the organization's knowledge base, without opening a ticket",
          description: "Counts against the org's monthly deflection limit — if the limit is reached, returns 429 instead of generating for free. Only high-confidence generations count toward that limit.",
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { type: 'object', properties: { question: { type: 'string', maxLength: 2000 } }, required: ['question'] },
              },
            },
          },
          responses: {
            '200': {
              description: 'Generated answer with confidence score',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      answer: { type: 'string' },
                      confidence: { type: 'integer' },
                      answered_fully: { type: 'boolean' },
                      high_confidence: { type: 'boolean' },
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing/invalid question', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            '401': { description: 'Missing/invalid/revoked API key', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            '429': { description: 'Monthly deflection limit reached, or rate limit exceeded', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
    },
  }

  return Response.json(spec)
}
