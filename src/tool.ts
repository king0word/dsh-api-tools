/** Register a configured HTTP API collection as DSH agent tools. */
import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import z from 'schemastery'
import { resolveEndpointUrl, validateConfig, type ApiConfig, type EndpointConfig } from './validation.js'

export const name = 'api-tools'
export const inject = ['tools']
const MAX_ARGUMENT_CHARS = 65_536

export type Endpoint = EndpointConfig

export type Config = ApiConfig

export const Config: z<Config> = z.object({
  baseUrl: z.string().required(),
  tokenEnv: z.string(),
  timeoutMs: z.number().step(1).min(1).default(15_000),
  maxResponseChars: z.number().step(1).min(1).default(20_000),
  endpoints: z.array(z.object({
    name: z.string().required(),
    description: z.string().required(),
    method: z.union(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).required(),
    path: z.string().required(),
  })).required(),
})

/** Read no more than the configured number of Unicode characters from the response. */
async function readResponse(response: Response, limit: number): Promise<{ body: string; truncated: boolean }> {
  if (!response.body) return { body: '', truncated: false }
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let body = ''
  let count = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      const chunk = decoder.decode(value, { stream: !done })
      const characters = Array.from(chunk)
      const remaining = limit - count
      body += characters.slice(0, remaining).join('')
      count += Math.min(characters.length, remaining)
      if (characters.length > remaining) {
        await reader.cancel()
        return { body, truncated: true }
      }
      if (done) return { body, truncated: false }
    }
  } finally {
    reader.releaseLock()
  }
}

/** Mount one DSH tool for each configured endpoint. */
export function apply(ctx: Context, config: Config): void {
  const problem = validateConfig(config)
  if (problem) throw new Error(`api-tools: ${problem}`)
  const entries = config.endpoints.map(endpoint => ({ endpoint, url: resolveEndpointUrl(config.baseUrl, endpoint.path) }))
  for (const { endpoint } of entries) {
    if (ctx.tools.get(endpoint.name)) throw new Error(`api-tools: tool name already registered: ${endpoint.name}`)
  }

  const disposers: Array<() => void> = []
  try {
    for (const { endpoint, url } of entries) {
      disposers.push(ctx.tools.register(defineTool({
      name: endpoint.name,
      description: endpoint.description,
      parameters: {
        query: { type: 'string', description: 'JSON object of query parameters; optional' },
        body: { type: 'string', description: 'JSON request body; optional' },
      },
      output: {
        schema: {
          type: 'object',
          properties: {
            status: { type: 'integer', required: true },
            body: { type: 'string', required: true },
            truncated: { type: 'boolean', required: true },
          },
          additionalProperties: false,
        },
        render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
      },
      async execute(args, exec) {
        const target = new URL(url)
        if ((args.query?.length ?? 0) > MAX_ARGUMENT_CHARS || (args.body?.length ?? 0) > MAX_ARGUMENT_CHARS) {
          throw new Error(`api-tools: query or body exceeds ${MAX_ARGUMENT_CHARS} characters`)
        }
        if (args.query) {
          let query: unknown
          try { query = JSON.parse(args.query) }
          catch { throw new Error('api-tools: query must be valid JSON') }
          if (!query || typeof query !== 'object' || Array.isArray(query)) throw new Error('api-tools: query must be a JSON object')
          for (const [key, value] of Object.entries(query)) {
            if (value === null || !['string', 'number', 'boolean'].includes(typeof value)) {
              throw new Error(`query parameter ${key} must be a string, number, or boolean`)
            }
            target.searchParams.set(key, String(value))
          }
        }
        if (args.body && endpoint.method === 'GET') throw new Error('GET endpoint does not accept body')
        let body: string | undefined
        if (args.body) {
          try { body = JSON.stringify(JSON.parse(args.body)) }
          catch { throw new Error('api-tools: body must be valid JSON') }
        }
        const token = config.tokenEnv ? process.env[config.tokenEnv] : undefined
        if (config.tokenEnv && !token) throw new Error(`api-tools: missing token environment variable ${config.tokenEnv}`)
        const timeoutSignal = AbortSignal.timeout(config.timeoutMs)
        try {
          const response = await fetch(target, {
            method: endpoint.method,
            headers: {
              accept: 'application/json',
              ...(args.body ? { 'content-type': 'application/json' } : {}),
              ...(token ? { authorization: `Bearer ${token}` } : {}),
            },
            body,
            signal: AbortSignal.any([exec.signal, timeoutSignal]),
            redirect: 'error',
          })
          const result = await readResponse(response, config.maxResponseChars)
          if (!response.ok) {
            const detail = Array.from(result.body).slice(0, 500).join('')
            throw new Error(`HTTP ${response.status}${detail ? `: ${detail}` : ''}`)
          }
          return { status: response.status, ...result }
        } catch (error) {
          if (timeoutSignal.aborted) throw new Error(`api-tools: ${endpoint.name} timed out`)
          if (exec.signal.aborted) throw new Error(`api-tools: ${endpoint.name} was cancelled`)
          throw new Error(`api-tools: ${endpoint.name} request failed: ${error instanceof Error ? error.message : String(error)}`)
        }
      },
      })))
    }
  } catch (error) {
    for (const dispose of disposers.reverse()) dispose()
    throw error
  }
}
