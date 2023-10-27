import { parse } from '@babel/parser'
import traverse from '@babel/traverse'
import generate from '@babel/generator'
import * as t from '@babel/types'
import { chinesePattern, i18nStartKeyPattern, resetLastIndex } from '../utils/regex'
import { minify } from 'terser'

export async function javascriptTransformer(rawContent: string) {

  const minifyCode = String((await minify(rawContent)).code)
  
  const ast = parse(minifyCode, {
    sourceType: 'unambiguous',
    plugins: ['jsx', 'typescript']
  })

  traverse(ast, {
    StringLiteral(path) {
      const parentCode = minifyCode.slice(path.parent.loc?.start.index, path.parent.loc?.end.index)
      resetLastIndex()
      if (chinesePattern.test(path.node.value) && !i18nStartKeyPattern.test(parentCode)) {
        // vue3 t
        // TODO vue3 还要加上 import 语句，vue2 setup script 也要加上 getCurrentInstance
        // vue2 normal script: this.$t / setup script: instance.proxy.$t 
        path.replaceWith(t.callExpression(t.identifier("$t"), [t.stringLiteral(path.node.value)]))
        path.skip()
      }
    },
    ImportDeclaration(path) {
      if (path.node.source.value === 'vue') {
        const importVueList = path.node.specifiers.map((item) => item.local.name)
        if (!importVueList.includes('getCurrentInstance')) {
          path.node.specifiers.push(t.importSpecifier(t.identifier('getCurrentInstance'), t.identifier('getCurrentInstance')))
        }
      }
    }
  })

  const output = generate(ast, {
    jsescOption: {
      // 中文不转unicode
      minimal: true
    }
  })
  console.log(output.code);
  return output.code
}

const content = `
this.$Modal.confirm({
  title: '提交确认',
  content: \`<p>\${this.$t(
    '预约上线的版本到期自动上线，当前上线版本自动下线，请确认是否创建？'
  )}</p>\`,
  onOk: () => {
    this.createTest(params)
  }
})
`

javascriptTransformer(content)