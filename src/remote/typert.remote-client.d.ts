import type { RemoteResult, TypertRemoteContribution } from '@deepseek-ai/dsh-typert-protocol'
import type { ApiConfig } from '../validation.js'

declare module '@deepseek-ai/dsh-typert-protocol' {
  interface TypertRemoteNamespaceMap {
    apiPreset: { create: (name: string, config: ApiConfig) => Promise<RemoteResult<{ name: string; path: string }>> }
  }
}
export declare const TYPERT_REMOTE: TypertRemoteContribution
export default TYPERT_REMOTE
