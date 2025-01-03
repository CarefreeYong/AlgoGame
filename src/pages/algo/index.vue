<template>
    <view class="pageList">
        <navigator
            v-for="{ path, name } in algoPages"
            :key="path"
            class="pageItem"
            :url="path"
        >
            {{ name }}
        </navigator>
    </view>
</template>

<script lang="tsx" setup>
import { algoPages } from '@/data'
</script>

<style lang="scss" scoped>
.pageList {
    box-sizing: border-box;
    height: 100%;
    padding: 20rpx;
    overflow: auto;
}

.pageItem {
    height: 80rpx;
    margin-top: 20rpx;
    padding: 0rpx 20rpx;
    line-height: 80rpx;
    white-space: nowrap;
    text-overflow: ellipsis;
    background-color: #f8f8f8;
    border-radius: 8rpx;
    overflow: hidden;
    &:first-of-type {
        margin-top: 0rpx;
    }
}
</style>
