import { glob } from 'glob'
import { readFile } from 'node:fs/promises'
import { extname } from 'node:path'

import { vueParser } from './parser/vue'
import { templateTransformer } from './transformer/template'
import { javascriptTransformer } from './transformer/javascript'

const unHandleMap = new Map()

async function vueHandler(content: string, path: string) {
  console.log(path);
  
  const { template, script, scriptSetup } = vueParser(content)
  // const { hasChange, result: templateResult, unHandleArray } = await templateTransformer(template)
  if (script) {
    await javascriptTransformer(script)
  }
  if (scriptSetup) {
    await javascriptTransformer(scriptSetup)
  }
  // if (hasChange) {
  //   console.log('templateResult:', templateResult);
  //   if (unHandleArray.length) {
  //     console.log('unHandleArray:', unHandleArray);
  //     unHandleMap.set(path, unHandleArray)
  //   }
  // }
}

const matchFiles = await glob('**/*.{vue,js,ts}', {
  cwd: '/Users/crab.huang/Project/abtest.web/src',
  absolute: true
})

for (const path of matchFiles) {
  const fileContent = await readFile(path, 'utf-8')
  const ext = extname(path)
  switch (ext) {
    case '.vue': {
      await vueHandler(fileContent, path)
    }
    case '.js': {
      // await javascriptTransformer(fileContent)
    }
    case '.ts': {
      // TODO
    }
  }
}

console.log(unHandleMap);


