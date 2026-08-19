// Minimal MCP (Model Context Protocol) JSON-RPC 2.0 types — the subset this
// server needs to speak the Streamable HTTP transport for tool calls.
// Spec: https://modelcontextprotocol.io

export interface JsonRpcRequest {
  jsonrpc: '2.0'
  id?: string | number | null
  method: string
  params?: Record<string, unknown>
}

export interface JsonRpcSuccess {
  jsonrpc: '2.0'
  id: string | number | null
  result: unknown
}

export interface JsonRpcError {
  jsonrpc: '2.0'
  id: string | number | null
  error: { code: number; message: string; data?: unknown }
}

export const JsonRpcErrorCode = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  // MCP-specific range
  UNAUTHORIZED: -32001,
  // Distinct from INTERNAL_ERROR so a client can tell "back off and retry"
  // apart from "something broke" — the two want opposite handling.
  RATE_LIMITED: -32002,
} as const

/**
 * JSON-RPC 2.0 requires `id` to be a string, number, or null. Anything else
 * (an object, an array) must not be echoed back into the response envelope —
 * a caller could otherwise reflect arbitrary JSON of its own choosing through
 * the server.
 */
export function normalizeRpcId(value: unknown): string | number | null {
  return typeof value === 'string' || typeof value === 'number' ? value : null
}

export function rpcError(id: string | number | null, code: number, message: string, data?: unknown): JsonRpcError {
  return { jsonrpc: '2.0', id, error: { code, message, data } }
}

export function rpcResult(id: string | number | null, result: unknown): JsonRpcSuccess {
  return { jsonrpc: '2.0', id, result }
}

export interface McpToolDefinition {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

export interface McpToolResult {
  content: { type: 'text'; text: string }[]
  isError?: boolean
}
