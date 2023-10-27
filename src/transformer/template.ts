import posthtml from 'posthtml'
import type { Node } from 'posthtml'
import { minify } from 'html-minifier-terser'
import { chinesePattern, i18nKeyPattern, templateLiteralsPattern, resetLastIndex } from '../utils/regex'

export async function templateTransformer(rawContent: string) {
  let hasChange = false
  function vueTemplateI18NReplacePlugin(tree: Node) {
    // 不需要处理的 key 列表
    const excludeKeyList = [
      'v-track'
    ]

    // 不处理但需要记录下来的 key 列表
    const unHandleKeyList = [
      'v-text',
      'v-html',
      'v-show',
      'v-if',
      'v-else',
      'v-else-if',
      'v-for',
      'v-on',
      '@',
      'v-bind',
      ':',
      'v-model',
      'v-slot',
    ]

    const i18nFunctionWrapper = (key: string) => `$t('${key}')`
    const vueTemplateMustacheWrapper = (key: string) => `{{ ${key} }}`

    tree.walk(function (node) {
      // console.log(node);
      /**
       * attr
       * v-bind / :attr
       * v-on / @click
       */
      if (node.attrs) {
        // 遍历 html 节点的 attr
        Object.entries(node.attrs as Record<string, string>).forEach(
          ([key, value]) => {
            if (excludeKeyList.some((operator) => key.indexOf(operator) > -1)) return
            resetLastIndex()
            const existZh = chinesePattern.test(value)
            const i18nMatch = i18nKeyPattern.exec(value) !== null
            if (existZh && !i18nMatch) {
              if (!hasChange) hasChange = true
              console.log('match chinese: ', key, value)
              // if (key.startsWith(':')) {
              //   // :attr 后面的 value 肯定是表达式，因此可以使用 babel 来处理
              // }
              if (
                templateLiteralsPattern.test(value) ||
                unHandleKeyList.some((operator) => key.indexOf(operator) > -1)
              ) {
                // 匹配到模板字符串 不做处理 但记录下来
                unHandleArray.push(value)
              } else {
                /**
                  * TODO
                  * 1.
                  * :placeholder 
                     !['fast_report', 'quota'].includes(sourceType.provider)
                       ? '自定义数据连接名称，建议与数据库名称一致'
                       : '自定义数据连接名称，如快速报表/指标库'
                     2.
                     @click 
                     handleModal(
                       hierarchyId,
                       '确定退出层级',
                       'quit',
                       '此操作会将当前图表中使用到的本层级中的下钻字段清空，请确认是否执行此操作'
                     )
                  */
                node.attrs[`:${key}`] = i18nFunctionWrapper(value as string)
                delete node.attrs[key]
              }
            }
          }
        )
      } else if (typeof node === 'string') {
        /**
         * 纯文本节点
         * <div>中文</div>
         */
        resetLastIndex()
        const existZh = chinesePattern.test(node)
        const i18nMatch = i18nKeyPattern.exec(node) !== null
        if (existZh && !i18nMatch) {
          console.log('match chinese: ', node)
          if (!hasChange) hasChange = true
          if (
            templateLiteralsPattern.test(node) ||
            String(node).indexOf('{{') > -1
          ) {
            // 匹配到模板字符串，模版语法 不做处理 但记录下来
            unHandleArray.push(node)
          } else {
            /**
              * TODO
              *  1.
                 {{ row.runStatus ? '恢复' : '冻结' }}
                 2.
                 {{ row.runStatus ? '恢复' : '冻结' }}sss{{ 'test' }}
                 3.
                 当前筛选器字段名：{{ columnName }}
              */
            node = vueTemplateMustacheWrapper(
              i18nFunctionWrapper(node as unknown as string)
            ) as unknown as Node<string>
          }
        }
      }
      return node
    })
  }

  // 将 template 先 minify
  const minifyHTML = await minify(rawContent, {
    // 移除注释
    removeComments: true,
    // 去除空格缩进
    collapseWhitespace: true,
    // 大小写敏感（不会更改原标签的大小写）
    caseSensitive: true,
  })

  // const templateLiteralsArray: string[] = []
  const unHandleArray: string[] = []

  const result = await posthtml()
    .use(vueTemplateI18NReplacePlugin)
    .process(minifyHTML)

  return {
    result: result.html,
    unHandleArray,
    hasChange,
  }
}

// const html = `
// <FormItem
//   :label="$t('当有效期结束时间到了，是否直接下线？')"
//   :label-width="275"
//   prop="expired_is_offline"
// >
//   <RadioGroup v-model="basicInfo.expired_is_offline">
//     <Radio :disabled="!!getRouteQUery('cid')" :label="1">{{
//       $t('是')
//     }}</Radio>
//     <Radio :disabled="!!getRouteQUery('cid')" :label="0">{{
//       $t('否')
//     }}</Radio>
//   </RadioGroup>
// </FormItem>
// `
// templateTransformer(html)
