import { z } from 'zod'

const endpoint = z.object({
  name: z.string(), description: z.string(), method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']), path: z.string(),
})
const config = z.object({
  baseUrl: z.string(), tokenEnv: z.string().optional(), timeoutMs: z.number(), maxResponseChars: z.number(), endpoints: z.array(endpoint),
})
const prefix = 'dsh-api-tools#apiPreset/create'

export const descriptors = [{
  id: prefix,
  service: 'apiPreset',
  namespace: 'apiPreset',
  method: 'create',
  invocation: { kind: 'direct' },
  parameters: [
    { name: 'name', wire: 'name', source: 'json', codec: { mode: 'strict', typeSymbol: `${prefix}:name`, create: () => z.string() } },
    { name: 'config', wire: 'config', source: 'json', codec: { mode: 'strict', typeSymbol: `${prefix}:config`, create: () => config } },
  ],
  result: { mode: 'strict', typeSymbol: `${prefix}:result`, create: () => z.object({ name: z.string(), path: z.string() }) },
}]
