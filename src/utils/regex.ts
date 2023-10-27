// 匹配所有的中文
export const chinesePattern = /[\u4e00-\u9fa5]{1,}/g
// 用于匹配是否被 i18n 块包裹
export const i18nKeyPattern =
  /(?:i18n(?:-\w+)?[ (\n]\s*(?:key)?path=|v-t=['"`{]|(?:this\.|\$|i18n\.|[^\w\d])(?:t|tc|te)\()\s*['"`](.*?)['"`]/gm
// 是否为 i18n 块开头
export const i18nStartKeyPattern = /(?:this\.|\$|i18n\.|[^\w\d])(?:t|tc|te)\(/gm
// 匹配是否为模版字符串
export const templateLiteralsPattern = /^`([^`]|\\`)*`$/gm

export function resetLastIndex() {
  chinesePattern.lastIndex = 0
  i18nKeyPattern.lastIndex = 0
  i18nStartKeyPattern.lastIndex = 0
  templateLiteralsPattern.lastIndex = 0
}