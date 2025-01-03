import { Option } from '@/types'
import { name as appName } from '@/manifest.json'
import { pages as unstablePages } from '@/pages.json'
import appLogo from '@/static/images/logo.png'

// 帐号信息
interface AccountInfo {
    id: string,
    name: string,
    logo: string,
}
const { miniProgram: { appId } } = uni.getAccountInfoSync()
export const accountInfo: Readonly<AccountInfo> = {
    id: appId,
    name: appName,
    logo: appLogo,
}

// 页面列表
interface Page {
    path: string,
    name: string,
}
export const pages: Page[] = unstablePages.map(({ path, style: { navigationBarTitleText } }) => ({
    path: `/${path}`,
    name: navigationBarTitleText,
}))
export const algoPages: Page[] = pages.flatMap(({ path, name }) => path.includes('algo') && !path.includes('index')
    ? {
        path,
        name,
    }
    : [],
)
export const gamePages: Page[] = pages.flatMap(({ path, name }) => path.includes('game') && !path.includes('index')
    ? {
        path,
        name,
    }
    : [],
)

// 倍速（播放速度）
export const speeds: Option[] = [
    { value: 0.5, label: '0.5x' },
    { value: 1, label: '1.0x' },
    { value: 1.5, label: '1.5x' },
    { value: 2, label: '2.0x' },
]
