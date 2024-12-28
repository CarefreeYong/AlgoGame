// 结合 useBodyClick hook 进行使用，模拟 document.body.addEventListener('click', () => {})

import type { PluginOption } from 'vite'

const insertedTemplate = `
<template${'$1'}>
    <view
        id="body"
        @click="handleBodyClick"
    >
        ${'$2'}
    </view>
</template>
`

const insertedScript = `
<script${'$1'}>
import { handleBodyClick } from '@/hooks/useBodyClick'
${'$2'}
</script>
`

const insertedStyle = `
<style${'$1'}>
#body {
    height: 100%;
    overflow: auto;
}
${'$2'}
</style>
`

// 编译前对 src/pages/**/*.vue 的代码进行修改（插入 body 标签相关代码）
const viteInsertBody = (): PluginOption => ({
    name: 'vite-plugin-insertBody',
    enforce: 'pre',
    transform(code, id) {
        if (!/src\/pages\/.*\.vue$/.test(id)) return
        let result = code.replace(/<template([^<]*?)>([\S\s]*\S+[\S\s]*)<\/template>/, insertedTemplate)
        const replaced = result !== code // 是否已插入 body 标签
        replaced && (result = result.replace(/<script([^<]*?)>([\S\s]*)<\/script>/, insertedScript))
        replaced && (result = result.replace(/<style([^<]*?)>([\S\s]*)<\/style>/, insertedStyle))
        return {
            code: result,
            map: null,
        }
    },
})

export default viteInsertBody
