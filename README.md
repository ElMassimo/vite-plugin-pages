# @mussi/vite-plugin-pages

[![npm version](https://badgen.net/npm/v/@mussi/vite-plugin-pages)](https://www.npmjs.com/package/@mussi/vite-plugin-pages)

[îles]: https://github.com/ElMassimo/iles
[vite-plugin-pages]: https://github.com/hannoeru/vite-plugin-pages

> File system based routing for Vue 3 applications using
> [îles]

_This is a temporary fork of [vite-plugin-pages] that adds a Javascript API to the plugin, which is used by [îles]._

## Getting Started

By default a page is a Vue component exported from a `.vue` or `.mdx` file in the
`src/pages` directory, and they are automatically registered in the router by [îles].

## Configuration ⚙️

You can provide custom configuration by providing a `pages` option in your [iles] configuration file:

```js
// iles.config.ts
export default {
  pages: {
    pagesDir: 'src/views'
  },
}
```

Check the [vite-plugin-pages] documentation for reference.
