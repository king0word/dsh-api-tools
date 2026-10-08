import { useState } from 'react'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from 'dsh-better-sidebar'
import { validateConfig } from '../validation.js'

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
const methods: Method[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
interface Endpoint { id: string; name: string; description: string; method: Method; path: string }
interface Draft { baseUrl: string; tokenEnv: string; timeoutMs: number; maxResponseChars: number; endpoints: Endpoint[] }

const key = 'dsh-api-tools:config-draft:v1'
const empty: Draft = { baseUrl: '', tokenEnv: '', timeoutMs: 15000, maxResponseChars: 20000, endpoints: [] }
let nextId = 0
const newId = () => `api-endpoint-${Date.now()}-${++nextId}`
const blankEndpoint = (): Endpoint => ({ id: newId(), name: '', description: '', method: 'GET', path: '/' })

function initialDraft(): Draft {
  try {
    const saved = localStorage.getItem(key)
    if (saved) {
      const parsed: unknown = JSON.parse(saved)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const value = parsed as Partial<Draft>
        if (typeof value.baseUrl === 'string' && typeof value.tokenEnv === 'string' &&
            typeof value.timeoutMs === 'number' && typeof value.maxResponseChars === 'number' &&
            Array.isArray(value.endpoints) && value.endpoints.every(item => item &&
              typeof item.name === 'string' && typeof item.description === 'string' &&
              typeof item.path === 'string' && typeof item.method === 'string')) {
          return { ...value, endpoints: value.endpoints.map(item => ({ ...item, id: typeof item.id === 'string' ? item.id : newId() })) } as Draft
        }
      }
    }
  } catch { /* Browser storage may be unavailable. */ }
  return empty
}

function ApiConfigPanel() {
  const [draft, setDraft] = useState<Draft>(initialDraft)
  const [message, setMessage] = useState('')
  // Preserve a structurally readable older draft so its fields can be repaired in the UI.
  // Invalid values are displayed here and cannot be saved or exported.
  const [error, setError] = useState(() => draft.baseUrl ? validateConfig(draft) ?? '' : '')
  const [timeoutText, setTimeoutText] = useState(String(draft.timeoutMs))
  const [responseText, setResponseText] = useState(String(draft.maxResponseChars))
  const update = (field: 'baseUrl' | 'tokenEnv', value: string) => {
    setDraft(current => ({ ...current, [field]: value }))
  }
  const updateNumber = (field: 'timeoutMs' | 'maxResponseChars', value: string) => {
    if (field === 'timeoutMs') setTimeoutText(value)
    else setResponseText(value)
    const number = Number(value)
    if (value !== '' && Number.isSafeInteger(number) && number >= 1) setDraft(current => ({ ...current, [field]: number }))
  }
  const problem = () => {
    const timeout = Number(timeoutText)
    const response = Number(responseText)
    if (!timeoutText || !responseText || !Number.isSafeInteger(timeout) || timeout < 1 || !Number.isSafeInteger(response) || response < 1) {
      return '超时和响应上限必须是正整数。'
    }
    return validateConfig(draft)
  }
  const updateEndpoint = (index: number, field: keyof Endpoint, value: string) => {
    setDraft(current => ({ ...current, endpoints: current.endpoints.map((item, i) => i === index ? { ...item, [field]: value } : item) }))
  }
  const save = () => {
    const issue = problem()
    if (issue) { setError(issue); setMessage(''); return }
    try {
      localStorage.setItem(key, JSON.stringify(draft))
      setError(''); setMessage('草稿已保存在当前浏览器。导出并装载到 DSH 后才会生效。')
    } catch { setError('浏览器无法保存草稿，请直接导出配置。') }
  }
  const exportConfig = () => {
    const issue = problem()
    if (issue) { setError(issue); setMessage(''); return }
    const config = { ...draft, tokenEnv: draft.tokenEnv || undefined, endpoints: draft.endpoints.map(({ id: _id, ...endpoint }) => endpoint) }
    const blob = new Blob([JSON.stringify(config, null, 2) + '\n'], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url; link.download = 'dsh-api-tools.config.json'
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
    setError(''); setMessage('配置文件已导出；尚未装载到 DSH。')
  }

  return <div className="api-config">
    <style>{styles}</style>
    <header><h2>API 工具配置</h2><p>把已授权接口逐个映射为 Agent 工具。密钥只在 DSH 运行环境中设置。</p></header>
    <section aria-label="服务配置">
      <label>服务地址<input value={draft.baseUrl} onChange={event => update('baseUrl', event.target.value)} placeholder="https://api.example.com" /></label>
      <label>Bearer Token 环境变量名<input value={draft.tokenEnv} onChange={event => update('tokenEnv', event.target.value)} placeholder="例如 DSH_API_ORDER_TOKEN；不填表示无鉴权" /></label>
      <div className="api-grid"><label>超时（毫秒）<input type="number" min="1" value={timeoutText} onChange={event => updateNumber('timeoutMs', event.target.value)} /></label><label>响应上限（字符）<input type="number" min="1" value={responseText} onChange={event => updateNumber('maxResponseChars', event.target.value)} /></label></div>
    </section>
    <section aria-label="接口清单"><div className="api-heading"><h3>接口清单</h3><button type="button" onClick={() => setDraft(current => ({ ...current, endpoints: [...current.endpoints, blankEndpoint()] }))}>添加接口</button></div>
      {draft.endpoints.length === 0 && <p className="api-empty">尚无接口。添加后填写工具名、用途、方法和固定路径。</p>}
      {draft.endpoints.map((endpoint, index) => <div className="api-row" key={endpoint.id}>
        <div className="api-row-title"><strong>接口 {index + 1}</strong><button type="button" className="api-text-button" onClick={() => setDraft(current => ({ ...current, endpoints: current.endpoints.filter((_, i) => i !== index) }))}>删除</button></div>
        <label>工具名<input value={endpoint.name} onChange={event => updateEndpoint(index, 'name', event.target.value)} placeholder="get_order" /></label>
        <label>用途说明<input value={endpoint.description} onChange={event => updateEndpoint(index, 'description', event.target.value)} placeholder="给 Agent 看的功能说明" /></label>
        <div className="api-grid"><label>方法<select value={endpoint.method} onChange={event => updateEndpoint(index, 'method', event.target.value)}>{methods.map(method => <option key={method}>{method}</option>)}</select></label><label>固定路径<input value={endpoint.path} onChange={event => updateEndpoint(index, 'path', event.target.value)} placeholder="/orders" /></label></div>
      </div>)}
    </section>
    {error && <p role="alert" className="api-error">{error}</p>}{message && <p role="status" className="api-success">{message}</p>}
    <footer><button type="button" onClick={save}>保存草稿</button><button type="button" className="api-primary" onClick={exportConfig}>导出配置 JSON</button></footer>
  </div>
}

const styles = `.api-config{font:14px/1.5 system-ui,sans-serif;color:var(--text-primary,#202a33);padding:18px;max-width:720px;margin:auto}.api-config h2{font-size:22px;margin:0 0 6px}.api-config h3{font-size:16px;margin:0}.api-config p{margin:0}.api-config header{margin-bottom:24px}.api-config header p{color:var(--text-secondary,#52616b)}.api-config section{border-top:1px solid #c8d0d5;padding:18px 0}.api-config label{display:grid;gap:6px;font-weight:600;margin:0 0 14px}.api-config input,.api-config select{box-sizing:border-box;width:100%;padding:9px 10px;border:1px solid #a7b5c0;border-radius:6px;background:var(--surface,#fff);color:inherit;font:inherit}.api-config :is(input,select,button):focus-visible{outline:2px solid #1769aa;outline-offset:2px}.api-config .api-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.api-config .api-heading,.api-config .api-row-title,.api-config footer{display:flex;align-items:center;justify-content:space-between;gap:12px}.api-config .api-row{padding:16px 0;border-bottom:1px solid #dde3e8}.api-config .api-row-title{margin-bottom:10px}.api-config button{padding:8px 12px;border:1px solid #8398a8;border-radius:6px;background:transparent;color:inherit;cursor:pointer;font:inherit}.api-config button:hover{background:#e8f2f8}.api-config .api-primary{background:#1769aa;border-color:#1769aa;color:white}.api-config .api-primary:hover{background:#0e578f}.api-config .api-text-button{border:0!important;color:#9a2830!important}.api-config .api-empty{padding:24px 4px;color:var(--text-secondary,#52616b)}.api-config .api-error{color:#9a2830;margin:12px 0!important}.api-config .api-success{color:#1d6841;margin:12px 0!important}.api-config footer{justify-content:flex-end;padding-top:14px}@media(max-width:520px){.api-config .api-grid{grid-template-columns:1fr}.api-config{padding:14px}}`

export const inject = ['betterSidebar']
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.betterSidebar.registerTab({
    id: 'api-tools-config', title: 'API 工具', order: 70, single: true,
    icon: (size: number) => <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M5 4H3v8h2m6-8h2v8h-2M6 8h4M8 6v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>,
    component: () => <ApiConfigPanel />,
  }), 'api-tools: config tab')
}
