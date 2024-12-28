import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import vueJsx from '@vitejs/plugin-vue-jsx'
import viteInsertBody from './vite-plugin-insertBody'

// @ts-ignore
const viteUni = (typeof uni.default === 'function') ? uni.default : uni // package.json 里的 type 值设为 module 时的兼容性处理

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
    plugins: [
        viteUni(),
        vueJsx(),
        viteInsertBody(),
    ],
    build: {
        sourcemap: mode === 'development',
    },
    css: {
        preprocessorOptions: {
            scss: {
                silenceDeprecations: ['legacy-js-api'],
            },
        },
    },
}))
