import { parse } from '@vue/compiler-dom'

export function vueParser(rawContent: string) {
  const result = parse(rawContent)
  let template;
  let script;
  let scriptSetup;
  result.children.forEach((item) => {
    if (item?.tag === 'template') {
      template = item.loc.source
    } else if (item?.tag === 'script') {
      if (item?.props?.some?.((prop) => prop.name === 'setup')) {
        scriptSetup = item.children.length ? item.children[0].loc.source : ''
      } else {
        script = item.children.length ? item.children[0].loc.source : ''
      }
    }
  })
  return {
    template,
    script,
    scriptSetup
  }
}