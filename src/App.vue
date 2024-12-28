<script lang="tsx" setup>
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'

onLaunch(() => {
    // console.log('App Launch')
})

onShow(() => {
    // console.log('App Show')
})

onHide(() => {
    // console.log('App Hide')
})
</script>

<style lang="scss">
@import "@/static/font/iconfont.css";

page {
    height: 100%;
    color: #333;
    overflow: hidden;
}

uni-popup-message {
    :deep(.uni-popup-message__box) {
        text-align: center;
        box-shadow: 0rpx 2rpx 20rpx 0rpx rgba(0, 0, 0, 0.2);
    }
}
</style>
