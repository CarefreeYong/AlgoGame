<script lang="tsx" setup>
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'

onLaunch(() => {
})

onShow(() => {
})

onHide(() => {
})
</script>

<style lang="scss">
@import '@/static/iconfont/iconfont.css';

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
