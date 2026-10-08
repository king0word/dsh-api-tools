import { copyFileSync } from 'node:fs'
for (const file of ['descriptor.js', 'typert.host.js', 'typert.host.d.ts', 'typert.remote-client.js', 'typert.remote-client.d.ts']) {
  copyFileSync(new URL(`../src/remote/${file}`, import.meta.url), new URL(`../lib/${file}`, import.meta.url))
}
