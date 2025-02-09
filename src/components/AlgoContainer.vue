<script lang="tsx" setup>
import { ref, onMounted } from 'vue'

let countdownIntervalId: NodeJS.Timeout | void = void 0

const toggleDescription = ref<number | '?'>(3)
const descriptionUnfolded = ref<boolean>(true)
const controlUnfolded = ref<boolean>(true)

const toggle = (type: 'Description' | 'Control'): void => {
    switch (type) {
        case 'Description': {
            countdownIntervalId && (
                countdownIntervalId = clearInterval(countdownIntervalId),
                toggleDescription.value = '?'
            )
            descriptionUnfolded.value = !descriptionUnfolded.value
            break
        }
        case 'Control': {
            controlUnfolded.value = !controlUnfolded.value
            break
        }
    }
}

onMounted(async () => {
    await new Promise<void>((resolve) => setTimeout(resolve, 500)) // 500ms 后再往下执行

    countdownIntervalId = setInterval(() => { // 3s 后自动收起 description
        if (toggleDescription.value === 0) {
            countdownIntervalId = clearInterval(countdownIntervalId as NodeJS.Timeout)
            toggleDescription.value = '?'
            descriptionUnfolded.value = false
            return
        }
        (toggleDescription.value as number)--
    }, 1000)
})
</script>

<template>
    <view class="algoContainer">
        <view class="description">
            <view
                class="toggle toggle--description"
                @click="toggle('Description')"
            >
                {{ toggleDescription }}
            </view>
            <view
                :class="{
                    'description__content': true,
                    'description__content--unfolded': descriptionUnfolded,
                }"
            >
                <slot name="description" />
            </view>
        </view>

        <view class="content">
            <slot />
        </view>

        <view class="control">
            <view
                class="toggle toggle--control iconfont"
                @click="toggle('Control')"
            >
                {{ '\ue60b' }}
            </view>
            <view
                :class="{
                    'control__content': true,
                    'control__content--unfolded': controlUnfolded,
                }"
            >
                <slot name="control" />
            </view>
        </view>
    </view>
</template>

<style lang="scss" scoped>
.algoContainer {
    position: relative;
    height: 100%;
}

.description {
    position: absolute;
    z-index: 1;
    top: 0rpx;
    right: 0rpx;
    left: 0rpx;
    .description__content {
        max-height: 400rpx;
        margin-top: -400rpx;
        padding: 40rpx 20rpx;
        overflow: auto;
        background-color: rgba(255, 255, 255, 0.9);
        box-shadow: 0rpx 2rpx 20rpx 0rpx rgba(0, 0, 0, 0.2);
        transition: margin-top 0.5s;
        &.description__content--unfolded {
            margin-top: 0rpx;
        }
    }
}

.content {
    box-sizing: border-box;
    height: 100%;
    padding: 40rpx 20rpx;
    overflow: auto;
}

.control {
    position: absolute;
    z-index: 1;
    right: 0rpx;
    bottom: 0rpx;
    left: 0rpx;
    .control__content {
        max-height: 400rpx;
        margin-bottom: -400rpx;
        padding: 40rpx 20rpx;
        overflow: auto;
        background-color: rgba(255, 255, 255, 0.9);
        box-shadow: 0rpx -2rpx 20rpx 0rpx rgba(0, 0, 0, 0.2);
        transition: margin-bottom 0.5s;
        &.control__content--unfolded {
            margin-bottom: 0rpx;
        }
    }
}

.toggle {
    position: absolute;
    right: 20rpx;
    width: 48rpx;
    height: 48rpx;
    font-size: 32rpx;
    line-height: 48rpx;
    text-align: center;
    background-color: #fff;
    border-radius: 50%;
    box-shadow: 0rpx 0rpx 20rpx 0rpx rgba(0, 0, 0, 0.2);
    &.toggle--description {
        bottom: -68rpx;
    }
    &.toggle--control {
        top: -68rpx;
    }
}
</style>
