import { resolve } from 'path'
import { parseRouteData, parseMarkdownFile } from '../src/parser'
import { resolveOptions } from '../src/options'

const options = resolveOptions({})

describe('Parser', () => {
  test('json5 block', async() => {
    const path = resolve('./test/assets/pages/blog/[id].vue')
    const parsedCustomBlock = await parseRouteData(path, options)
    expect(parsedCustomBlock).toMatchSnapshot('custom block')
  })

  test('empty block', async() => {
    const path = resolve('./test/assets/pages/about.vue')
    const parsedCustomBlock = await parseRouteData(path, options)
    expect(parsedCustomBlock).toEqual(undefined)
  })

  test('yaml block', async() => {
    const path = resolve('./test/assets/pages/components.vue')
    const parsedCustomBlock = await parseRouteData(path, options)
    expect(parsedCustomBlock).toMatchSnapshot('yaml block')
  })

  test('markdown file', async() => {
    const content = await parseMarkdownFile('example.md', '---\ntitle: About\n---')
    expect(content).toEqual({ meta: { title: 'About' } })
  })
})
