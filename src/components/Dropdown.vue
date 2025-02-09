<script lang="tsx" setup>
import type { Option, Position } from '@/types'
import { ref, toRefs } from 'vue'
import { getBoundingClientRectBySelector } from '@/utility'
import useBodyClick from '@/hooks/useBodyClick'

const props = withDefaults(
    defineProps<{
        id: string,
        value: Option['value'] | null,
        options: Option[],
        placement?: 'top' | 'topLeft' | 'topRight' | 'bottom' | 'bottomLeft' | 'bottomRight',
    }>(),
    {
        placement: 'bottom',
    },
)

const emits = defineEmits<{
    change: [value: Option['value']],
}>()

const {
    id,
    value,
    options,
    placement,
} = toRefs(props)

const menusVisible = ref<boolean>(false)
const menusPosition = ref<Position>([0, 0])

const toggle = async (): Promise<void> => {
    if (menusVisible.value) { menusVisible.value = false; return }
    const triggerRect = await getBoundingClientRectBySelector(`#${id.value}`)
    if (!triggerRect) return
    menusPosition.value = (() => {
        const { top, bottom, left, width } = triggerRect
        const offset = 10
        switch (placement.value) {
            case 'top':
            case 'topLeft':
            case 'topRight': {
                return [left + width / 2, top - offset]
            }
            default: {
                return [left + width / 2, bottom + offset]
            }
        }
    })()
    menusVisible.value = true
}

useBodyClick(() => {
    menusVisible.value = false
})
</script>

<template>
    <slot :toggle="toggle" />
    <view
        v-if="options.length && menusVisible"
        :class="{
            menus: true,
            [`menus--${placement}`]: true,
        }"
        :style="{
            top: `${menusPosition[1]}px`,
            left: `${menusPosition[0]}px`,
        }"
    >
        <view class="menus__content">
            <view
                v-for="{ value: innerValue, label } in options"
                :key="innerValue"
                :class="{
                    menu: true,
                    'menu--active': innerValue === value,
                }"
                @click.stop="emits('change', innerValue); menusVisible = false"
            >
                {{ label }}
            </view>
        </view>
    </view>
</template>

<style lang="scss" scoped>
.menus {
    position: fixed;
    background-color: #fff;
    border-radius: 8rpx;
    box-shadow: 0rpx 2rpx 20rpx 0rpx rgba(0, 0, 0, 0.2);
    &.menus--top {
        transform: translate(-50%, -100%);
        &::before {
            bottom: 0%;
            left: 50%;
            border-top-color: #fff;
            transform: translate(-50%, 100%);
        }
    }
    &.menus--topLeft {
        transform: translate(-100%, -100%);
        &::before {
            bottom: 0%;
            right: 0%;
            border-top-color: #fff;
            transform: translate(-50%, 100%);
        }
    }
    &.menus--topRight {
        transform: translate(0%, -100%);
        &::before {
            bottom: 0%;
            left: 0%;
            border-top-color: #fff;
            transform: translate(50%, 100%);
        }
    }
    &.menus--bottom {
        transform: translate(-50%, 0%);
        &::before {
            top: 0%;
            left: 50%;
            border-bottom-color: #fff;
            transform: translate(-50%, -100%);
        }
    }
    &.menus--bottomLeft {
        transform: translate(-100%, 0%);
        &::before {
            top: 0%;
            right: 0%;
            border-bottom-color: #fff;
            transform: translate(-50%, -100%);
        }
    }
    &.menus--bottomRight {
        transform: translate(0%, 0%);
        &::before {
            top: 0%;
            left: 0%;
            border-bottom-color: #fff;
            transform: translate(50%, -100%);
        }
    }
    &::before {
        content: '';
        position: absolute;
        border: 10rpx solid transparent;
    }
    .menus__content {
        max-width: 480rpx;
        max-height: 960rpx;
        overflow: auto;
    }
}

.menu {
    height: 60rpx;
    padding: 0rpx 1em;
    font-size: 28rpx;
    line-height: 60rpx;
    text-align: center;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
    &.menu--active {
        color: $uni-color-primary;
    }
}
</style>
