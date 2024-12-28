import { createSSRApp } from 'vue'
import App from '@/App.vue'

export const createApp = () => ({
    app: createSSRApp(App),
})
