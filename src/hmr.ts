import { ViteDevServer } from 'vite'
import { getPagesVirtualModule, checkRouteBlockChanges, isTarget, supportsCustomBlock, debug, slash } from './utils'
import { removePage, addPage, updatePage } from './pages'
import { ResolvedOptions, ResolvedPages } from './types'

export function handleHMR(server: ViteDevServer, pages: ResolvedPages, options: ResolvedOptions, clearRoutes: () => void) {
  const { ws, watcher, moduleGraph } = server

  function fullReload() {
    // invalidate module
    getPagesVirtualModule(server)
    clearRoutes()
    ws.send({
      type: 'full-reload',
    })
  }

  watcher.on('add', async(file) => {
    const path = slash(file)
    if (isTarget(path, options)) {
      await addPage(pages, path, options)
      debug.hmr('add', path)
      fullReload()
    }
  })
  watcher.on('unlink', (file) => {
    const path = slash(file)
    if (isTarget(path, options)) {
      removePage(pages, path)
      debug.hmr('remove', path)
      fullReload()
    }
  })
  watcher.on('change', async(file) => {
    const path = slash(file)
    if (supportsCustomBlock(file, options)) {
      const { changed, needsReload } = await checkRouteBlockChanges(path, options)
      if (changed) {
        moduleGraph.getModulesByFile(file)?.forEach(mod => moduleGraph.invalidateModule(mod))
        updatePage(pages, path)
        debug.hmr('change', path)
        if (needsReload) fullReload()
      }
    }
  })
}
