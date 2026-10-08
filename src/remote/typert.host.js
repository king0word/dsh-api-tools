import { descriptors } from './descriptor.js'

export const TYPERT = {
  package: 'dsh-api-tools', face: 'host', schemas: [], invocations: descriptors,
  model: {
    services: [{ key: 'apiPreset', exportName: 'ApiPresetService', tags: [], types: [],
      members: [{ kind: 'method', name: 'create', signature: 'create(name: string, config: ApiConfig): Promise<{ name: string; path: string }>' }] }],
    events: [], objects: [],
  },
}
