/** Browser-safe validation shared by the configuration page and tool entry. */
export interface EndpointConfig {
  name: string
  description: string
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
}

export interface ApiConfig {
  baseUrl: string
  tokenEnv?: string
  timeoutMs: number
  maxResponseChars: number
  endpoints: EndpointConfig[]
}

const methods = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])

function parseBaseUrl(baseUrl: string): URL {
  let base: URL
  try { base = new URL(baseUrl) }
  catch { throw new Error('服务地址必须是完整的 HTTP(S) 地址。') }
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.pathname !== '/' || base.search || base.hash) {
    throw new Error('服务地址只能包含协议、域名和端口。')
  }
  return base
}

/** Resolve one fixed API path after applying the shared URL restrictions. */
export function resolveEndpointUrl(baseUrl: string, path: string): URL {
  const base = parseBaseUrl(baseUrl)
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('?') || path.includes('#')) {
    throw new Error('接口路径必须以单个 / 开头，且不含查询或片段。')
  }
  const url = new URL(path, base)
  if (url.origin !== base.origin) throw new Error('接口路径不能离开配置的服务地址。')
  return url
}

/** Return the first actionable configuration problem, if any. */
export function validateConfig(config: ApiConfig): string | undefined {
  try { parseBaseUrl(config.baseUrl) }
  catch (error) { return error instanceof Error ? error.message : '服务地址无效。' }
  if (config.tokenEnv && !/^DSH_API_[A-Z0-9_]+$/.test(config.tokenEnv)) return 'Token 环境变量名必须以 DSH_API_ 开头。'
  if (!Number.isSafeInteger(config.timeoutMs) || config.timeoutMs < 1 || !Number.isSafeInteger(config.maxResponseChars) || config.maxResponseChars < 1) {
    return '超时和响应上限必须是正整数。'
  }
  if (!Array.isArray(config.endpoints) || config.endpoints.length === 0) return '至少添加一个 API。'
  const names = new Set<string>()
  for (const endpoint of config.endpoints) {
    if (!/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(endpoint.name)) return `工具名 ${endpoint.name || '未命名'} 无效。`
    if (names.has(endpoint.name)) return `工具名 ${endpoint.name} 重复。`
    names.add(endpoint.name)
    if (!endpoint.description?.trim()) return `请填写 ${endpoint.name} 的用途说明。`
    if (!methods.has(endpoint.method)) return `${endpoint.name} 的 HTTP 方法无效。`
    try { resolveEndpointUrl(config.baseUrl, endpoint.path) }
    catch { return `${endpoint.name} 的路径必须是同一服务内的绝对路径，查询参数由 Agent 调用时提供。` }
  }
}
