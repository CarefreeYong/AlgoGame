// 结合 useBodyClick hook 进行使用，模拟 document.body.addEventListener('click', () => {})
// 在编译前对 src/pages/**/*.vue 的代码进行修改（插入 body 标签相关代码）

import type { PluginOption } from 'vite'

const templateRegExp: RegExp = /<template((?:[^>]*[^\s>]=(?:'[^']*'|"[^"]*"))*|[^>]*)>([\s\S]*)<\/template>/
const scriptRegExp: RegExp = /<script((?:[^>]*[^\s>]=(?:'[^']*'|"[^"]*"))*|[^>]*)>([\s\S]*)<\/script>/
const styleRegExp: RegExp = /<style((?:[^>]*[^\s>]=(?:'[^']*'|"[^"]*"))*|[^>]*)>([\s\S]*)<\/style>/

const getInsertedTemplate = (p1: string, p2: string): string => `
<template${p1}>
    <view
        id="body"
        @click="handleBodyClick"
    >
        ${p2}
    </view>
</template>
`.trim()

const getInsertedScript = (p1: string, p2: string): string => `
<script${p1}>
import { handleBodyClick } from '@/hooks/useBodyClick'
${p2}
</script>
`.trim()

const getInsertedStyle = (p1: string, p2: string): string => `
<style${p1}>
#body {
    height: 100%;
    overflow: auto;
}
${p2}
</style>
`.trim()

export default (): PluginOption => ({
    name: 'vite-plugin-insertBody',
    enforce: 'pre',
    transform(code, id) {
        if (!/src\/pages\/.*\.vue$/.test(id)) return
        let hasBody = false // 是否已插入 body 标签
        const replacedCode = code.replace(
            templateRegExp,
            (match, p1, p2) => (hasBody = !!match && !!(p2 as string).trim())
                ? getInsertedTemplate(p1 as string, p2 as string)
                : match,
        )
        return hasBody
            ? {
                code: (
                    replacedCode
                        .replace(scriptRegExp, (_match: string, p1: string, p2: string) => getInsertedScript(p1, p2))
                        .replace(styleRegExp, (_match: string, p1: string, p2: string) => getInsertedStyle(p1, p2))
                ),
            }
            : void 0
    },
})
