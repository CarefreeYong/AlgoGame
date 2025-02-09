import { defineConfig } from 'vite'
import vueJsx from '@vitejs/plugin-vue-jsx'
import uni from '@dcloudio/vite-plugin-uni'
import viteInsertBody from './vite-plugin-insertBody'

// @ts-expect-error package.json 里的 type 值设为 module 时的兼容性处理
const viteUni = ((typeof uni.default === 'function') ? uni.default : uni) as typeof uni

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
    plugins: [
        vueJsx(),
        viteUni(),
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
