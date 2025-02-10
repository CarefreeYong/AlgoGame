<script lang="tsx" setup>
import { accountInfo } from '@/data'
</script>

<template>
    <view class="content">
        <image
            class="logo"
            :src="accountInfo.logo"
        />
        <view class="text__area">
            <text class="title">
                {{ '敬请期待' }}
            </text>
        </view>
    </view>
</template>

<style lang="scss" scoped>
.content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}

.logo {
    height: 400rpx;
    width: 400rpx;
    margin: 200rpx auto 0rpx auto;
}

.text__area {
    display: flex;
    justify-content: center;
}

.title {
    font-size: 36rpx;
    color: #8f8f94;
}
</style>
