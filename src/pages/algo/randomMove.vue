<template>
    <AlgoContainer>
        <template #description>
            <view class="detail">
                <view
                    class="detail__row"
                    :style="{
                        justifyContent: 'space-between',
                    }"
                >
                    {{ '移动指令由 Math.floor(Math.random() * 5) 生成' }}
                </view>
                <view
                    class="detail__row"
                    :style="{
                        justifyContent: 'space-between',
                    }"
                >
                    <view class="legend">
                        {{ '停留：0' }}
                    </view>
                    <view class="legend">
                        {{ '上：1' }}
                    </view>
                    <view class="legend">
                        {{ '右：2' }}
                    </view>
                    <view class="legend">
                        {{ '下：3' }}
                    </view>
                    <view class="legend">
                        {{ '左：4' }}
                    </view>
                </view>
            </view>
        </template>

        <view
            id="mapContainer"
            class="mapContainer"
        >
            <view class="map">
                <view
                    v-for="(grids, y) in map"
                    :key="`mapGrids-${y}`"
                    class="mapGrids"
                >
                    <view
                        v-for="({ type }, x) in grids"
                        :key="`mapGrid-${x}`"
                        :class="{
                            'mapGrid': true,
                            [`mapGrid--bot--${['none', 'top', 'right', 'bottom', 'left'][bot.direction]}`]: String([x, y]) === String(bot.position),
                        }"
                        :style="{
                            width: `${gridSize[0]}px`,
                            height: `${gridSize[1]}px`,
                            ...(type === GridType.Barrier && { backgroundColor: '#333' }),
                        }"
                    />
                </view>
            </view>
        </view>

        <template #control>
            <view
                class="buttons"
                :style="{
                    justifyContent: 'space-between',
                }"
            >
                <button
                    size="mini"
                    :type="('default' as 'button')"
                    @click="reset"
                >
                    {{ '重置' }}
                </button>
                <Dropdown
                    :id="DropdownId"
                    v-slot="{ toggle }"
                    placement="top"
                    :value="speed"
                    :options="speeds"
                    @change="changeSpeed"
                >
                    <button
                        size="mini"
                        :type="('default' as 'button')"
                        :style="{ display: 'block' }"
                        @click.stop="toggle"
                    >
                        {{ `倍速（${speeds.find(({ value }) => value === speed)?.label}）` }}
                    </button>
                </Dropdown>
                <button
                    v-if="!started"
                    size="mini"
                    :type="('primary' as 'button')"
                    @click="start"
                >
                    {{ typeof started === 'boolean' ? '继续' : '开始' }}
                </button>
                <button
                    v-if="started"
                    size="mini"
                    :type="('primary' as 'button')"
                    @click="pause"
                >
                    {{ '暂停' }}
                </button>
            </view>
        </template>
    </AlgoContainer>
</template>

<script lang="tsx" setup>
import { Option, Size, Position, Direction, GridType, Grid as UnstableGrid, Bot } from '@/types'
import { ref, computed, onBeforeMount, onMounted } from 'vue'
import { speeds } from '@/data'
import { getBoundingClientRectBySelector, getRandomString } from '@/utility'
import AlgoContainer from '@/components/AlgoContainer.vue'
import Dropdown from '@/components/Dropdown.vue'

type Grid = Pick<UnstableGrid, 'position' | 'type'>

const DropdownId = `Dropdown-${getRandomString()}`
const mapSize: Size = [21, 21] // 地图尺寸，单位：网格数量
const botPosition: Position = [Math.floor(mapSize[0] / 2), Math.floor(mapSize[1] / 2)]
let moveIntervalId: number = 0

const map = ref<Grid[][]>(
    Array(mapSize[1]).fill(null).map(
        (grids, y) => Array(mapSize[0]).fill(null).map(
            (grid, x) => ({
                position: [x, y],
                type: GridType.Space,
            }),
        ),
    ),
)
const gridSize = ref<Size>([0, 0]) // 网格尺寸，单位：px，根据屏幕分辨率动态计算
const speed = ref<number>(1)
const started = ref<boolean | null>(null)
const bot = ref<Bot>({ id: 'Bot', position: botPosition, direction: Direction.Top }) // 电脑玩家
const interval = computed<number>(() => Math.floor(200 / speed.value))

const move = (): void => {
    moveIntervalId = setInterval(() => {
        const direction = Math.floor(Math.random() * 5)
        const oldPosition = bot.value.position
        const newPosition = [
            bot.value.position, // 停留
            [bot.value.position[0], Math.max(0, bot.value.position[1] - 1)], // 上
            [Math.min(map.value[0].length - 1, bot.value.position[0] + 1), bot.value.position[1]], // 右
            [bot.value.position[0], Math.min(map.value.length - 1, bot.value.position[1] + 1)], // 下
            [Math.max(0, bot.value.position[0] - 1), bot.value.position[1]], // 左
        ][direction] as Position
        String(newPosition) !== String(oldPosition) && (bot.value.position = newPosition)
        direction && (bot.value.direction = direction)
    }, interval.value)
}

const reset = (initialize: boolean | MouseEvent): void => {
    if (initialize !== true) {
        clearInterval(moveIntervalId)
        moveIntervalId = 0
        speed.value = 1
        started.value = null
    }
    bot.value.position = botPosition
    bot.value.direction = Direction.Top
}

const changeSpeed = (value: Option['value']): void => {
    if (value === speed.value) return
    clearInterval(moveIntervalId)
    moveIntervalId = 0
    speed.value = value as number
    started.value && move()
}

const start = (): void => {
    move()
    started.value = true
}

const pause = (): void => {
    clearInterval(moveIntervalId)
    moveIntervalId = 0
    started.value = false
}

onBeforeMount(() => {
    // 初始化地图
    reset(true)
})

onMounted(async () => {
    // 根据屏幕分辨率动态设置 gridSize
    const mapRect = await getBoundingClientRectBySelector('#mapContainer')
    mapRect && (gridSize.value = [Math.floor(mapRect.width / map.value[0].length) - 1, Math.floor(mapRect.width / map.value.length) - 1]) // 这里统一取宽度进行计算，使 grid 为正方形
})
</script>

<style lang="scss" scoped>
.detail {
    display: flex;
    flex-direction: column;
    row-gap: 20rpx;
}

.detail__row {
    display: flex;
    align-items: center;
    flex: 1 0 40rpx;
    font-size: 24rpx;
    line-height: 40rpx;
}

.buttons {
    display: flex;
    align-items: center;
    button {
        margin: 0rpx;
    }
}

.mapContainer {
    display: flex;
    justify-content: center;
    align-items: center;
}

.map {
    display: flex;
    flex-direction: column;
    row-gap: 1px;
    background-color: #ccc;
    border: 1px solid #ccc;
}

.mapGrids {
    display: flex;
    column-gap: 1px;
}

.mapGrid {
    flex: none;
    background-color: #fff;
    // 电脑玩家
    &.mapGrid--bot--none::before,
    &.mapGrid--bot--top::before,
    &.mapGrid--bot--right::before,
    &.mapGrid--bot--bottom::before,
    &.mapGrid--bot--left::before {
        content: "";
        display: block;
        width: 100%;
        height: 100%;
        background-color: $uni-color-primary;
    }
    &.mapGrid--bot--top::before,
    &.mapGrid--bot--right::before,
    &.mapGrid--bot--bottom::before,
    &.mapGrid--bot--left::before {
        clip-path: polygon(50% 10%, 90% 90%, 50% 70%, 10% 90%);
    }
    &.mapGrid--bot--none::before {
        clip-path: circle(40% at 50% 50%);
    }
    &.mapGrid--bot--top::before {
        transform: rotate(0deg);
    }
    &.mapGrid--bot--right::before {
        transform: rotate(90deg);
    }
    &.mapGrid--bot--bottom::before {
        transform: rotate(180deg);
    }
    &.mapGrid--bot--left::before {
        transform: rotate(270deg);
    }
}
</style>
