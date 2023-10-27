// 运行此脚本前, 先安装依赖: lnpm i -g fs-extra  (此包内置了fs模块, 并简化一些写法)
import fs from 'fs-extra'
import path from 'path'

//  node lan-script.js ./src/views/dataManagement/list.vue replace
let input
let replace
let noOutput
if (process.argv[2] === 'lan') {
  // 走bd平台,  bd lan实际等于node xx/main.js lan
  input = process.argv[3] ? process.argv[3] : 'src/views'
  replace = ['replace', 'r'].includes(process.argv[4]) || ''
  noOutput = ['noOutput', 'n'].includes(process.argv[5]) || ''
} else {
  // 正常运行脚本
  // input = process.argv[2] ? process.argv[2] : 'src/views'
  input = process.argv[2] ? process.argv[2] : '/Users/crab.huang/Project/abtest.web/src'
  replace = ['replace', 'r'].includes(process.argv[3]) || ''
  noOutput = ['noOutput', 'n'].includes(process.argv[4]) || ''
}

const zhJson = {}
const enJson = {}

function getVueAndJsPath(jsonPath) {
  const jsonFiles = []

  function findJsonFile(pwd) {
    if (fs.lstatSync(pwd).isDirectory()) {
      const files = fs.readdirSync(pwd)
      files.forEach(function (item, index) {
        if (item !== 'test') {
          // 过滤test文件夹
          findJsonFile(path.join(pwd, item))
        }
      })
    } else {
      if (['.js', '.vue'].includes(path.extname(pwd))) jsonFiles.push(pwd)
    }
  }

  findJsonFile(jsonPath)
  console.log('扫描的文件是:' + jsonFiles)
  return jsonFiles
}

// 递归获取文件的path列表, input 支持 单文件 和 文件夹
const VueAndJsList = getVueAndJsPath(input)

// 匹配中英文加部分标点
const getZh = /[\u4e00-\u9fa5|\w| |,，.。\/\*:：=()（）!！？\?-]{1,}/g

/* 默认输出en和zh的json */
function getChineseList(str) {
  // 获取所有 中文 混合英文 混合空格 及 标点符号
  return str
    .match(getZh)
    .map((e) => {
      e = e.trim()
      // 把 英文 和 注释筛选掉
      if (/[\u4E00-\u9FA5]/.test(e) && !/\/\/|\/\*|\*|!--/.test(e)) return e
    })
    .filter((e) => e)
}

VueAndJsList.forEach((e) => {
  const data = fs.readFileSync(e, 'utf8')
  const zhList = getChineseList(data)
  zhList.forEach((e) => {
    zhJson[e] = e
    enJson[e] = ''
  })
})
// console.log(zhJson)
// console.log(enJson)

if (!noOutput) {
  // output
  const outputMap = {
    'zh.json': zhJson,
    'en.json': enJson,
  }

  for (const file of Object.keys(outputMap)) {
    const output = input + '-' + file
    fs.pathExists(output).then((exists) => {
      if (exists) {
        console.log('当前' + output + '文件已存在, 请确保安全后, 在删除, 重跑')
      } else {
        fs.outputJson(output, outputMap[file])
          .then((_) => {
            console.log(output + ' 生成成功')
          })
          .catch((err) => {
            console.error(err)
          })
      }
    })
  }
}

/* 回填
 *    比如: placeholder="任务ID"  =>  :placeholder="$t('任务ID')"
 *          <span>查询</span>    =>   <span>{{$t('查询')}}</span>
 *      js内:  columns: [
                  {
             (old)  title: '任务名称',
             (new)  title: this.$t('任务名称'),
                    key: 'name'
                  },
               ]
      注意: 模板字符串及拼接的情况比较特殊, 需特殊处理
 */
function escapeRegExp(str) {
  // escapeRegExp的作用: 比如str是'变更前(', 此时new RegExp(str) 会报错, 需要转义一下,转成: '变更前\\('
  return str.replace(/[\(\)]/g, '\\$&')
}

if (replace) {
  VueAndJsList.forEach((e) => {
    if (path.extname(e) === '.vue') {
      // 只对.vue文件做回填
      let data = fs.readFileSync(e, 'utf8')
      data = data.split('<script>')

      /* 处理 vue的template 部分 */
      // 处理 非props内 的, 特点1是尖括号 >$t('查询')<
      // 比如 <span>查询</span>   =>  <span>{{$t('查询')}}</span>
      // 特点1是尖括号 \n$t('结果')\n
      // 比如 <span>    =>     <span>
      //       结果     =>      {{$t('结果')}}
      //     </span>   =>     </span>
      let vueStr = data[0].replace(getZh, (word) => {
        if (zhJson[word.trim()]) {
          return "$t('" + word.trim() + "')"
        }
        return word
      })
      const textRe = />.*?<|\n\$.*?\n/g // . 不会匹配"\n",  加个 问号, 非贪婪模式
      vueStr = vueStr.replace(textRe, (e) => {
        if (e.slice(0, 2) === '>$') {
          if (/{{/.test(e)) {
            // 这种情况: >$t('企业'){{obj.name}}$t('图谱')<
            e = e.replace(/\$t\(.*?\)/g, (res) => {
              return '{{' + res + '}}'
            })
          } else {
            return `>{{${e.slice(1, e.length - 1)}}}<`
          }
        } else if (e[0] === '\n') {
          return `\n{{${e.slice(1, e.length - 1)}}}\n`
        }
        return e
      })
      // console.log(vueStr)

      const vueRe = /[a-zA-Z|="'\>\$t\(]{1,}/g
      // 处理props内的 比如: placeholder="任务ID"  =>  :placeholder="$t('任务ID')"
      let propsVue = vueStr
        .match(vueRe)
        .map((e) => {
          if (e.includes('="$t(')) return e
        })
        .filter((e) => e)

      const map = new Map() // 去重
      propsVue = propsVue
        .map((e) => {
          // 去重
          const val = e.split('=')[0]
          if (!map.get(val)) {
            map.set(val, 1)
            return val
          }
        })
        .filter((e) => e)
      // console.log(propsVue)
      propsVue.forEach((e) => {
        vueStr = vueStr.replace(new RegExp(e, 'g'), (word) => {
          if (word.includes(':')) {
            return word
          } else {
            return ':' + word
          }
        })
      })

      // !!!! 把一些脏东西洗掉
      // ::label-width='70'  有多个::的, 变成1个:
      vueStr = vueStr.replace(new RegExp(/::/, 'g'), (word) => ':')
      // '$t('表字段')' => $t('表字段')
      vueStr = vueStr.replace(new RegExp(/'\$t\('/, 'g'), (word) => "$t('")
      vueStr = vueStr.replace(new RegExp(/'\)'/, 'g'), (word) => "')")

      /* 处理 script 部分 */
      //  (old)  title: '任务名称',
      //  (new)  title: this.$t('任务名称'),
      // 处理非模板字符串
      let jsStr = data[1]
      const zhJsonNew = {}
      Object.keys(zhJson).forEach((e) => {
        zhJsonNew[`'${e}'`] = e // 此处拿中文+双引号字符串  例如："消息"
        zhJsonNew[`"${e}"`] = e // 此处拿中文+单引号字符串  例如：'消息'
        // zhJsonNew[e] = e // 此处只拿中文字符串(为了匹配模板字符串)  例如：消息
      })

      Object.keys(zhJsonNew).forEach((e) => {
        // escapeRegExp的作用: 比如e是'变更前(', 此时new RegExp(e) 会报错, 需要转义一下,转成: '变更前\\('
        jsStr =
          jsStr &&
          jsStr.replace(new RegExp(escapeRegExp(e), 'g'), (word) => {
            // console.log(e, new RegExp(escapeRegExp(e), 'g'))
            if (word) {
              return 'this.$t(' + word + ')'
            } else {
              return word
            }
          })
      })

      // 处理模板字符串
      const zhJsonTpl = {}
      Object.keys(zhJson).forEach((e) => {
        zhJsonTpl[e] = e // 此处只拿中文字符串(为了匹配模板字符串)  例如：消息
      })

      jsStr =
        jsStr &&
        jsStr.replace(/`.*`/g, (word) => {
          Object.keys(zhJsonTpl).forEach((e) => {
            // escapeRegExp的作用: 比如e是'变更前(', 此时new RegExp(e) 会报错, 需要转义一下,转成: '变更前\\('
            word = word.replace(new RegExp(escapeRegExp(e), 'g'), (zh) => {
              return "${this.$t('" + zh + "')}"
            })
          })
          return word
        })

      const tpl = vueStr + '<script>' + jsStr
      // console.log(tpl)

      // output
      fs.outputFile(e, tpl)
        .then(() => {
          console.log('写入' + e)
        })
        .catch((err) => {
          console.error(err)
        })
    }
  })
}
