import { promises as fs } from 'fs'
import { extname } from 'path'
import JSON5 from 'json5'
import matter from 'gray-matter'
import { clearUndefined } from '@antfu/utils'

import { ResolvedOptions } from './types'
import type { SFCDescriptor } from '@vue/compiler-sfc'

const engines = { json5: JSON5.parse.bind(JSON5) }

async function parseSFC(code: string): Promise<SFCDescriptor> {
  try {
    const { parse } = await import('@vue/compiler-sfc')
    return parse(code, {
      pad: 'space',
    }).descriptor
  } catch {
    throw new Error('[vite-plugin-pages] Vue3\'s "@vue/compiler-sfc" is required.')
  }
}

export async function parseRouteData(filePath: string, options: ResolvedOptions) {
  const content = await fs.readFile(filePath, 'utf8')
  const rawBlock = extname(filePath) === '.vue'
    ? await parseCustomBlock(filePath, content, options)
    : parseMarkdownFile(filePath, content)
  if (!rawBlock) return

  const { alias, name, props, path, meta, route, ...blockMatter } = rawBlock
  return { ...blockMatter, route: clearUndefined({ alias, name, props, path, meta, ...route }) }
}

function parseFrontmatter(content: string, language?: string) {
  return matter(content, { language, engines }).data
}

export function parseMarkdownFile(filePath: string, content: string) {
  try {
    return parseFrontmatter(content)
  } catch (err: any) {
    err.message = `Invalid frontmatter for ${filePath}\n${err.message}`
    throw err
  }
}

export async function parseCustomBlock(filePath: string, content: string, options: ResolvedOptions) {
  const parsed = await parseSFC(content)
  const templateAttrs = parsed.template?.attrs
  const block = parsed.customBlocks.find(b => b.type === 'route')
  if (!block) return { ...templateAttrs, templateAttrs }
  const language = block.lang || options.routeBlockLang
  try {
    return {
      ...templateAttrs,
      templateAttrs,
      ...parseFrontmatter(`---\n${block.content}\n---`, language),
    }
  } catch (err: any) {
    err.message = `Invalid ${language} format of <${block.type}> content in ${filePath}\n${err.message}`
    throw err
  }
}
