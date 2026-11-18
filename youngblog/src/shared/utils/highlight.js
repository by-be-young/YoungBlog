/**
 * 轻量级 highlight.js 配置
 *
 * 仅注册博客文章中实际使用的语言，避免打包全部 190+ 种语言（~915 KB）。
 * 如需新增语言，在此添加即可。
 */
import hljs from 'highlight.js/lib/core'

// 博客文章中使用的语言
import bash from 'highlight.js/lib/languages/bash'
import c from 'highlight.js/lib/languages/c'
import cpp from 'highlight.js/lib/languages/cpp'
import java from 'highlight.js/lib/languages/java'
import makefile from 'highlight.js/lib/languages/makefile'
import python from 'highlight.js/lib/languages/python'
import plaintext from 'highlight.js/lib/languages/plaintext'
import shell from 'highlight.js/lib/languages/shell'
import sql from 'highlight.js/lib/languages/sql'

hljs.registerLanguage('bash', bash)
hljs.registerLanguage('c', c)
hljs.registerLanguage('C', c) // 兼容 markdown 中的 ```C（大写）
hljs.registerLanguage('cpp', cpp)
hljs.registerLanguage('java', java)
hljs.registerLanguage('makefile', makefile)
hljs.registerLanguage('python', python)
hljs.registerLanguage('plaintext', plaintext)
hljs.registerLanguage('shell', shell)
hljs.registerLanguage('sql', sql)

export default hljs
