// 结合 vite-plugin-insertBody 插件进行使用，模拟 document.body.addEventListener('click', () => {})

import { onBeforeUnmount } from 'vue'

// 回调队列
const callbackSet = new Set<(event: MouseEvent) => void>()

// 处理 body 的 click 事件
export const handleBodyClick = (event: MouseEvent): void => {
    callbackSet.forEach((callback) => callback(event))
}

// 注册 body 的 click 事件
export default (callback: (event?: MouseEvent) => void): void => {
    if (typeof callback !== 'function') return
    callbackSet.add(callback)
    onBeforeUnmount(() => callbackSet.delete(callback)) // 组件卸载前先注销 body 的 click 事件
}
