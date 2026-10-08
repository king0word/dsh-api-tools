/** Host-side creation of a dedicated desktop Agent preset declaration. */
import { copyFile, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises'
import { constants } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { Context } from '@deepseek-ai/cordis'
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import { validateConfig, type ApiConfig } from './validation.js'

declare module '@deepseek-ai/cordis' {
  interface Context { apiPreset: ApiPresetService }
}

const PRESET_NAME = /^[a-z][a-z0-9-]{0,39}$/
const presetPrefix = 'dsh-api-'

/** JSON string literals are valid YAML scalars and cannot introduce new rows. */
function yamlScalar(value: string): string { return JSON.stringify(value) }

export function renderPresetPatch(name: string, config: ApiConfig): string {
  const id = presetPrefix + name
  const rows = [
    `# dsh-api-tools preset: ${id}`,
    '- insert:',
    `    - id: preset-${id}`,
    "      name: '@deepseek-ai/dsh-agent-preset'",
    '      config:',
    `        id: ${yamlScalar(id)}`,
    `        name: ${yamlScalar(`API 测试 ${name}`)}`,
    `        description: ${yamlScalar('由 dsh-api-tools 创建的独立 API 工具 Agent preset')}`,
    '        order: 100',
    '        plugins:',
    '          - id: tool-api-collection',
    '            name: dsh-api-tools/tool',
    '            config:',
    `              baseUrl: ${yamlScalar(config.baseUrl)}`,
    `              timeoutMs: ${config.timeoutMs}`,
    `              maxResponseChars: ${config.maxResponseChars}`,
  ]
  if (config.tokenEnv) rows.push(`              tokenEnv: ${yamlScalar(config.tokenEnv)}`)
  rows.push('              endpoints:')
  for (const endpoint of config.endpoints) {
    rows.push(`                - name: ${yamlScalar(endpoint.name)}`)
    rows.push(`                  description: ${yamlScalar(endpoint.description)}`)
    rows.push(`                  method: ${endpoint.method}`)
    rows.push(`                  path: ${yamlScalar(endpoint.path)}`)
  }
  return rows.join('\n') + '\n'
}

/** Preserve the existing user patch, or replace its sole empty-list marker. */
export function appendPresetPatch(current: string, name: string, config: ApiConfig): string {
  const id = presetPrefix + name
  if (current.includes(`preset-${id}`) || current.includes(`# dsh-api-tools preset: ${id}`)) {
    throw new Error(`Agent preset ${id} 已存在；不会覆盖。`)
  }
  const lines = current.split(/\r?\n/)
  const active = lines.map(line => line.trim()).filter(line => line && !line.startsWith('#'))
  const newline = current.includes('\r\n') ? '\r\n' : '\n'
  const patch = renderPresetPatch(name, config).replace(/\n/g, newline)
  if (active.length === 1 && active[0] === '[]') {
    const emptyLine = lines.findIndex(line => line.trim() === '[]')
    lines.splice(emptyLine, 1)
    return lines.join(newline).replace(/\s*$/, '') + newline + patch
  }
  if (!active.some(line => line.startsWith('- '))) {
    throw new Error('desktop/cordis.patch.yml 不是预期的顶层补丁列表；已拒绝修改。')
  }
  return current.replace(/\s*$/, '') + newline + newline + patch
}

export class ApiPresetService extends TypertRemoteService {
  private pending: Promise<void> = Promise.resolve()
  constructor(ctx: Context) { super(ctx, 'apiPreset') }

  @Remote
  async create(name: string, config: ApiConfig): Promise<{ name: string; path: string }> {
    if (!PRESET_NAME.test(name)) throw new Error('Preset 名称只能用小写字母、数字和连字符，以字母开头，最多 40 字符。')
    const problem = validateConfig(config)
    if (problem) throw new Error(problem)
    const run = async () => {
      const home = process.env.DSH_HOME || join(homedir(), '.dsh')
      const profile = join(home, 'profiles', 'desktop')
      const packageInfo = JSON.parse(await readFile(join(profile, 'package.json'), 'utf8')) as {
        dsh?: { profile?: { bundles?: string[] } }
      }
      if (!packageInfo.dsh?.profile?.bundles?.includes('dsh-api-tools')) {
        throw new Error('当前 desktop profile 未启用 dsh-api-tools；已拒绝写入。')
      }
      const path = join(profile, 'cordis.patch.yml')
      const before = await readFile(path, 'utf8')
      const next = appendPresetPatch(before, name, config)
      const info = await stat(path)
      const backup = `${path}.dsh-api-tools-${Date.now()}-${randomUUID()}.bak`
      const temporary = `${path}.dsh-api-tools-${randomUUID()}.tmp`
      try {
        await writeFile(temporary, next, { flag: 'wx' })
        if ((await stat(path)).mtimeMs !== info.mtimeMs || await readFile(path, 'utf8') !== before) {
          throw new Error('desktop profile 在写入期间发生变化；请重新尝试。')
        }
        await copyFile(path, backup, constants.COPYFILE_EXCL)
        await rename(temporary, path)
      } finally {
        await unlink(temporary).catch(() => {})
      }
      return { name: presetPrefix + name, path }
    }
    const result = this.pending.then(run)
    this.pending = result.then(() => {}, () => {})
    return result
  }
}
