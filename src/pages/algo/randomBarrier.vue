<template>
    <AlgoContainer>
        <template #description>
            <view class="detail">
                <view
                    class="detail__row"
                    :style="{
                        justifyContent: 'center',
                    }"
                >
                    <view class="legend legend--barrier">
                        <icon />
                        <text>
                            {{ '障碍物' }}
                        </text>
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

        <view class="configs">
            <view class="config">
                <view class="config__label">
                    {{ '障碍物数量' }}
                </view>
                <view class="config__content">
                    <input
                        v-model="barrierTotal"
                        type="number"
                        placeholder="默认：80，范围：[1, 200]"
                        :disabled="typeof started === 'boolean'"
                        @blur="restrictBarrierTotal"
                    />
                </view>
            </view>
        </view>

        <template #control>
            <view
                class="buttons"
                :style="{
                    justifyContent: barrierSet.size < barrierTotal || !barrierSet.size ? 'space-between' : 'center',
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
                    v-if="barrierSet.size < barrierTotal || !barrierSet.size"
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
                    v-if="!started && (barrierSet.size < barrierTotal || !barrierSet.size)"
                    size="mini"
                    :type="('primary' as 'button')"
                    @click="start"
                >
                    {{ typeof started === 'boolean' ? '继续' : '开始' }}
                </button>
                <button
                    v-if="started && (barrierSet.size < barrierTotal || !barrierSet.size)"
                    size="mini"
                    :type="('primary' as 'button')"
                    @click="pause"
                >
                    {{ '暂停' }}
                </button>
            </view>
        </template>
    </AlgoContainer>

    <uni-popup
        ref="dialogRef"
        type="dialog"
    >
        <uni-popup-dialog
            type="success"
            title="提示"
            content="障碍物生成完毕！"
            confirmText="好的"
            :showClose="false"
            @confirm="dialogRef.confirm"
        />
    </uni-popup>
</template>

<script lang="tsx" setup>
import type Component from '*.vue'
import { Option, Size, Position, PositionStr, GridType, Grid as UnstableGrid } from '@/types'
import { ref, computed, onBeforeMount, onMounted } from 'vue'
import { speeds } from '@/data'
import { getBoundingClientRectBySelector, getRandomString, getRandomIntInclusive } from '@/utility'
import AlgoContainer from '@/components/AlgoContainer.vue'
import Dropdown from '@/components/Dropdown.vue'

type Grid = Pick<UnstableGrid, 'position' | 'type'>

const DropdownId = `Dropdown-${getRandomString()}`
const mapSize: Size = [21, 21] // 地图尺寸，单位：网格数量
let createBarriersIntervalId: number = 0

const dialogRef = ref<InstanceType<typeof Component>>({ confirm: () => {} })
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
const barrierTotal = ref<number>(80) // 障碍物数量
const barrierSet = ref<Set<PositionStr>>(new Set()) // 障碍物集
const interval = computed<number>(() => Math.floor(200 / speed.value))

const restrictBarrierTotal = (event: FocusEvent): void => {
    const { value }: { value: unknown } = event.target as HTMLInputElement
    barrierTotal.value = isNaN(value as number) ? 80 : Math.max(1, Math.min(200, Math.floor(value as number)))
}

const createBarriers = (): void => {
    createBarriersIntervalId = setInterval(() => {
        if (barrierSet.value.size === barrierTotal.value) {
            clearInterval(createBarriersIntervalId)
            createBarriersIntervalId = 0
            dialogRef.value.open()
            return
        }

        const barrierPosition: Position = (() => {
            let tempBarrierPosition = [
                getRandomIntInclusive(0, map.value[0].length - 1),
                getRandomIntInclusive(0, map.value.length - 1),
            ]
            while (barrierSet.value.has(String(tempBarrierPosition) as PositionStr)) {
                tempBarrierPosition = [
                    getRandomIntInclusive(0, map.value[0].length - 1),
                    getRandomIntInclusive(0, map.value.length - 1),
                ]
            }
            return tempBarrierPosition as Position
        })()

        barrierSet.value.add(String(barrierPosition) as PositionStr)
        map.value[barrierPosition[1]][barrierPosition[0]].type = GridType.Barrier
    }, interval.value)
}

const reset = (initialize: boolean | MouseEvent): void => {
    if (initialize !== true) {
        clearInterval(createBarriersIntervalId)
        createBarriersIntervalId = 0
        map.value.forEach((grids) => grids.forEach((grid) => (grid.type = GridType.Space)))
        speed.value = 1
        started.value = null
        barrierTotal.value = 80
        barrierSet.value.clear()
    }
}

const changeSpeed = (value: Option['value']): void => {
    if (value === speed.value) return
    clearInterval(createBarriersIntervalId)
    createBarriersIntervalId = 0
    speed.value = value as number
    started.value && createBarriers()
}

const start = (): void => {
    createBarriers()
    started.value = true
}

const pause = (): void => {
    clearInterval(createBarriersIntervalId)
    createBarriersIntervalId = 0
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
    .legend {
        display: flex;
        align-items: center;
        column-gap: 0.5em;
        &.legend--barrier {
            icon {
                background-color: #333;
            }
        }
        icon {
            width: 24rpx;
            height: 24rpx;
        }
    }
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
}

.configs {
    display: flex;
    flex-direction: column;
    margin-top: 80rpx;
    padding: 0rpx 20rpx;
}

.config {
    display: flex;
    align-items: center;
    column-gap: 28rpx;
    &:not(:first-of-type) {
        margin-top: 20rpx;
    }
}

.config__label {
    flex: none;
    font-size: 28rpx;
}

.config__content {
    flex: auto;
    input {
        height: 72rpx;
        padding: 0rpx 0.5em;
        font-size: 28rpx;
        background-color: #f8f8f8;
        border-radius: 8rpx;
    }
}
</style>
