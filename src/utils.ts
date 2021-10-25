import { resolve, basename } from 'path'
import Debug from 'debug'
import deepEqual from 'deep-equal'
import type { Nullable, Arrayable } from '@antfu/utils'
import { ResolvedOptions, Route } from './types'
import { parseRouteData } from './parser'
import { MODULE_ID_VIRTUAL } from './constants'
import type { ViteDevServer } from 'vite'
import type { OutputBundle } from 'rollup'

/**
 * Convert `Arrayable<T>` to `Array<T>`
 */
export function toArray<T>(array?: Nullable<Arrayable<T>>): Array<T> {
  array = array || []
  if (Array.isArray(array))
    return array
  return [array]
}

/**
 * Replace backslash to slash
 */
export function slash(str: string) {
  return str.replace(/\\/g, '/')
}

export const routeBlockCache = new Map<string, Record<string, any>>()

export function extensionsToGlob(extensions: string[]) {
  return extensions.length > 1 ? `{${extensions.join(',')}}` : extensions[0] || ''
}

/**
 * Clear undefined fields from an object. It mutates the object
 */
export function clearUndefined<T extends object>(obj: T): T {
  // @ts-expect-error
  Object.keys(obj).forEach((key: string) => (obj[key] === undefined ? delete obj[key] : {}))
  return obj
}

function isPagesDir(path: string, options: ResolvedOptions) {
  for (const page of options.pagesDir) {
    const dirPath = slash(resolve(options.root, page.dir))
    if (path.startsWith(dirPath)) return true
  }
  return false
}

export function isTarget(path: string, options: ResolvedOptions) {
  return isPagesDir(path, options) && options.extensionsRE.test(path)
}

export function supportsCustomBlock(path: string, options: ResolvedOptions) {
  return isTarget(path, options) && !options.react
}

export const debug = {
  hmr: Debug('vite-plugin-pages:hmr'),
  parser: Debug('vite-plugin-pages:parser'),
  gen: Debug('vite-plugin-pages:gen'),
  options: Debug('vite-plugin-pages:options'),
  cache: Debug('vite-plugin-pages:cache'),
  pages: Debug('vite-plugin-pages:pages'),
}

const dynamicRouteRE = /^\[.+\]$/
export const nuxtDynamicRouteRE = /^_[\s\S]*$/

export function isDynamicRoute(routePath: string, nuxtStyle: Boolean = false) {
  return nuxtStyle
    ? nuxtDynamicRouteRE.test(routePath)
    : dynamicRouteRE.test(routePath)
}

export function isCatchAllRoute(routePath: string, nuxtStyle: Boolean = false) {
  return nuxtStyle
    ? /^_$/.test(routePath)
    : /^\[\.{3}/.test(routePath)
}

export function resolveImportMode(
  filepath: string,
  options: ResolvedOptions,
) {
  const mode = options.importMode
  if (typeof mode === 'function')
    return mode(filepath)

  for (const pageDir of options.pagesDir) {
    if (
      options.syncIndex
      && pageDir.baseRoute === ''
      && filepath === `/${pageDir.dir}/index.vue`
    )
      return 'sync'
  }
  return mode
}

export function pathToName(filepath: string) {
  return filepath.replace(/[_.\-\\/]/g, '_').replace(/[[:\]()]/g, '$')
}

export function findRouteByFilename(routes: Route[], filename: string): Route | null {
  let result = null
  for (const route of routes) {
    if (filename.endsWith(route.component))
      result = route

    if (!result && route.children)
      result = findRouteByFilename(route.children, filename)

    if (result) return result
  }
  return null
}

export async function getRouteBlock(path: string, options: ResolvedOptions) {
  if (!isTarget(path, options) || options.react) return null

  let result
  try {
    result = await parseRouteData(path, options)
  } catch (error: any) {
    if (!options.server) throw error
    options.server.config.logger.error(error.message, { timestamp: true, error })
    options.server.ws.send({ type: 'error', err: error })
  }
  if (!result) return null

  debug.parser('%s: %O', path, result)
  routeBlockCache.set(slash(path), result)

  return result
}

export function getPagesVirtualModule(server: ViteDevServer) {
  const { moduleGraph } = server
  const module = moduleGraph.getModuleById(MODULE_ID_VIRTUAL)
  if (module) {
    moduleGraph.invalidateModule(module)
    return module
  }
  return null
}

export function replaceSquareBrackets(bundle: OutputBundle) {
  const files = Object.keys(bundle).map(i => basename(i))
  for (const chunk of Object.values(bundle)) {
    chunk.fileName = chunk.fileName.replace(/(\[|\])/g, '_')
    if (chunk.type === 'chunk') {
      for (const file of files)
        chunk.code = chunk.code.replace(file, file.replace(/(\[|\])/g, '_'))
    }
  }
}

export async function checkRouteBlockChanges(filePath: string, options: ResolvedOptions) {
  debug.cache(routeBlockCache)
  const oldRouteBlock = routeBlockCache.get(filePath)
  const routeBlock = await getRouteBlock(filePath, options)

  debug.hmr('%s old: %O', filePath, oldRouteBlock)
  debug.hmr('%s new: %O', filePath, routeBlock)

  return {
    changed: !deepEqual(oldRouteBlock, routeBlock),
    needsReload: !deepEqual(oldRouteBlock?.route, routeBlock?.route)
      || !deepEqual(oldRouteBlock?.templateAttrs, routeBlock?.templateAttrs),
  }
}
