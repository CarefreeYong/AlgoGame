import { createSSRApp } from 'vue'
import { accountInfo, pages } from '@/data'
import App from '@/App.vue'

export const app = createSSRApp(App)

// 激活分享功能
app.mixin({
    onShareAppMessage() { // 分享给好友
        const { length, [length - 1]: currentPage } = getCurrentPages()
        const pageName = pages.find(({ path }) => path.includes(currentPage!.route as string))?.name || accountInfo.name
        return {
            title: pageName,
            path: currentPage!.route as string,
            imageUrl: accountInfo.logo, // 默认：当前页面截图
        }
    },
    onShareTimeline() { // 分享到朋友圈
        return {
            title: accountInfo.name,
            // imageUrl: accountInfo.logo, // 默认：小程序 logo
        }
    },
})

export const createApp = () => ({ app })
