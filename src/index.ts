/** Host entry: exposes the browser configuration tab through dsh.client. */
import type { Context } from '@deepseek-ai/cordis'

export const name = 'api-tools-host'

/** The API tools themselves are mounted only by an agent preset via ./tool. */
export function apply(_ctx: Context): void {}
