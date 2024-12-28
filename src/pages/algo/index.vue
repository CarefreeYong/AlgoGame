<template>
    <view class="pageList">
        <navigator
            v-for="{ path, name } in pageList"
            :key="path"
            class="pageItem"
            :url="path"
        >
            {{ name }}
        </navigator>
    </view>
</template>

<script lang="tsx" setup>
import { computed } from 'vue'
import { pages } from '@/pages.json'

interface PageItem {
    path: string,
    name: string,
}

const pageList = computed<PageItem[]>(
    () => pages.flatMap(
        ({ path, style: { navigationBarTitleText } }) => path.includes('algo') && !path.includes('index')
            ? {
                path: `/${path}`,
                name: navigationBarTitleText,
            }
            : [],
    ),
)
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
