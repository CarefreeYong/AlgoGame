<template>
    <view class="content">
        <image
            class="logo"
            src="@/static/image/logo.png"
        />
        <view class="text__area">
            <text class="title">
                {{ '敬请期待' }}
            </text>
        </view>
    </view>
</template>

<script lang="tsx" setup>
</script>

<style lang="scss" scoped>
.content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}

.logo {
    height: 200rpx;
    width: 200rpx;
    margin-top: 200rpx;
    margin-left: auto;
    margin-right: auto;
    margin-bottom: 50rpx;
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
