import type { UserConfig } from 'tsdown'

const pluginId = 'dsh-api-tools'
// DSH Web's module loader expects this global and a factory returning module.exports.
const loaderGlobal = 'window.__ModuleLoader__'
const platformModules = ['react', 'react/jsx-runtime']

const client: UserConfig = {
  entry: { client: 'src/client/index.tsx' },
  outDir: 'lib',
  format: 'cjs',
  platform: 'browser',
  clean: false,
  dts: false,
  external: platformModules,
  noExternal: (id: string) => platformModules.includes(id) ? undefined : true,
  outputOptions: {
    entryFileNames: 'client.js',
    banner: `${loaderGlobal}.load({ id: ${JSON.stringify(pluginId)}, factory: (require) => {`,
    footer: 'return module.exports; } });',
    intro: 'const module = { exports: {} }; const exports = module.exports;',
  },
}

export default client
