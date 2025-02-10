<script lang="tsx" setup>
import type Component from '*.vue'
import type { Option, Size, Position, PositionStr, Grid as UnstableGrid } from '@/types'
import { GridType } from '@/types'
import { ref, triggerRef, computed, onBeforeMount, onMounted } from 'vue'
import { speeds } from '@/data'
import { getBoundingClientRectBySelector, getRandomString, shuffleArray } from '@/utility'
import AlgoContainer from '@/components/AlgoContainer.vue'
import Dropdown from '@/components/Dropdown.vue'

type Grid = Pick<UnstableGrid, 'position' | 'type'>
type Wall = [Position, Position, Position]

const DropdownId: string = `Dropdown-${getRandomString()}`
const mapSize: Size = [21, 21] // 地图尺寸，单位：网格数量
let createMazeIntervalId: NodeJS.Timeout | void = void 0

const dialogRef = ref<InstanceType<typeof Component>>({ confirm: () => {} })
const map = ref<Grid[][]>(Array.from(
    { length: mapSize[1] },
    (_grids, y) => Array.from(
        { length: mapSize[0] },
        (_grid, x) => ({
            position: [x, y],
            type: GridType.Space,
        }),
    ),
))
const gridSize = ref<Size>([0, 0]) // 网格尺寸，单位：px，根据屏幕分辨率动态计算
const speed = ref<number>(1)
const started = ref<boolean | null>(null)
const step = ref<number>(1) // 生成迷宫进程的当前阶段
const walls = ref<Wall[]>([]) // 墙体列表（每两个房间之间的墙体）
const currentWall = ref<{ index: number, areRoomsInSameArea: boolean }>({ index: 0, areRoomsInSameArea: false }) // 当前墙体，index（索引）、areRoomsInSameArea（两侧房间是否在同一区域）
const roomToAreaMap = ref<Map<PositionStr, number>>(new Map()) // 房间与区域的映射表（已连通的多个房间统一打上相同的区域 id）
const interval = computed<number>(() => Math.floor(200 / speed.value))

const createMaze = (): void => { // 使用 Kruskal 算法生成迷宫
    createMazeIntervalId = setInterval(() => {
        switch (step.value) {
            case 1: {
                // 初始化迷宫
                map.value.forEach((grids, y) => grids.forEach((grid, x) => (grid.type = x % 2 === 0 && y % 2 === 0 ? GridType.Space : GridType.Barrier))) // [x, y] 均为偶数时设为 GridType.Space（表示房间），否则设为 GridType.Barrier（表示墙体）

                step.value++
                break
            }
            case 2:
            case 3: { // 设置两帧空白帧
                step.value++
                break
            }
            case 4: {
                // 初始化房间与区域的映射表
                let areaId = 0
                map.value.forEach((grids, y) => grids.forEach((grid, x) => grid.type === GridType.Space && roomToAreaMap.value.set(String([x, y]) as PositionStr, ++areaId)))

                step.value++
                break
            }
            case 5:
            case 6: { // 设置两帧空白帧
                step.value++
                break
            }
            case 7: {
                // 获取墙体列表
                if (!walls.value.length) {
                    map.value.forEach((grids, y) => grids.forEach((_grid, x) => {
                        x % 2 !== 0 && y % 2 === 0 && walls.value.push([[x, y], [x - 1, y], [x + 1, y]]) // 水平方向上的墙体取其左右房间
                        x % 2 === 0 && y % 2 !== 0 && walls.value.push([[x, y], [x, y - 1], [x, y + 1]]) // 垂直方向上的墙体取其上下房间
                    }))
                    walls.value = shuffleArray<Wall[]>(walls.value) // 打乱墙体列表
                }

                // 判断是否需要拆除墙体
                const [wall, room1, room2] = walls.value[currentWall.value.index++] as Wall
                currentWall.value.areRoomsInSameArea = roomToAreaMap.value.get(String(room1) as PositionStr) === roomToAreaMap.value.get(String(room2) as PositionStr)
                if (currentWall.value.areRoomsInSameArea) { // 两个房间在相同区域时，有 10% 的概率会拆除当前墙体，使迷宫产生环结构，增加迷宫的复杂性
                    Math.random() < 0.1 && (
                        roomToAreaMap.value.set(String(wall) as PositionStr, roomToAreaMap.value.get(String(room1) as PositionStr)!),
                        map.value[wall[1]]![wall[0]]!.type = GridType.Space
                    )
                } else { // 两个房间在不同区域时拆除当前墙体
                    const areaId = roomToAreaMap.value.get(String(room2) as PositionStr)
                    roomToAreaMap.value.forEach((value, key, map) => value === areaId && map.set(key, map.get(String(room1) as PositionStr)!)) // 给区域 2 的所有房间打上区域 1 的 id
                    roomToAreaMap.value.set(String(wall) as PositionStr, roomToAreaMap.value.get(String(room1) as PositionStr)!)
                    map.value[wall[1]]![wall[0]]!.type = GridType.Space
                }

                currentWall.value.index === walls.value.length - 1 && step.value++
                break
            }
            default: {
                createMazeIntervalId = clearInterval(createMazeIntervalId as NodeJS.Timeout)
                dialogRef.value.confirm = () => {
                    walls.value = []
                    currentWall.value = { index: 0, areRoomsInSameArea: false }
                    roomToAreaMap.value.clear()
                }
                dialogRef.value.open()
                triggerRef(dialogRef)
                break
            }
        }
    }, interval.value)
}

const reset = (initialize: boolean | MouseEvent): void => {
    if (initialize !== true) {
        createMazeIntervalId = clearInterval(createMazeIntervalId as NodeJS.Timeout)
        map.value.forEach((grids) => grids.forEach((grid) => (grid.type = GridType.Space)))
        speed.value = 1
        started.value = null
        step.value = 1
        walls.value = []
        currentWall.value = { index: 0, areRoomsInSameArea: false }
        roomToAreaMap.value.clear()
    }
}

const changeSpeed = (value: Option['value']): void => {
    if (value === speed.value) return
    createMazeIntervalId = clearInterval(createMazeIntervalId as NodeJS.Timeout)
    speed.value = value as number
    started.value && createMaze()
}

const start = (): void => {
    createMaze()
    started.value = true
}

const pause = (): void => {
    createMazeIntervalId = clearInterval(createMazeIntervalId as NodeJS.Timeout)
    started.value = false
}

onBeforeMount(() => {
    // 初始化地图
    reset(true)
})

onMounted(async () => {
    // 根据屏幕分辨率动态设置 gridSize
    const mapRect = await getBoundingClientRectBySelector('#mapContainer')
    mapRect && (gridSize.value = [Math.floor(mapRect.width / map.value[0]!.length) - 1, Math.floor(mapRect.width / map.value.length) - 1]) // 这里统一取宽度进行计算，使 grid 为正方形
})
</script>

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
                    {{ '迷宫主要基于 Kruskal 算法生成，并通过随机拆除部分墙体使其产生环结构，从而增加其复杂性' }}
                </view>
                <view
                    class="detail__row"
                    :style="{
                        justifyContent: 'center',
                    }"
                >
                    <view class="legend legend--wall">
                        <icon />
                        <text>
                            {{ '墙体' }}
                        </text>
                    </view>
                </view>
                <view
                    class="detail__row"
                    :style="{
                        justifyContent: 'space-between',
                    }"
                >
                    <view class="legend legend--demolishing">
                        <icon />
                        <text>
                            {{ '拆除（墙体两侧区域不同）' }}
                        </text>
                    </view>
                    <view class="legend legend--randomDemolishing">
                        <icon />
                        <text>
                            {{ '随机拆除（墙体两侧区域相同）' }}
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
                            mapGrid: true,
                            [`mapGrid--${['demolishing', 'randomDemolishing'][Number(currentWall.areRoomsInSameArea)]}`]: walls.length && String([x, y]) === String(walls[currentWall.index]![0]),
                        }"
                        :style="{
                            width: `${gridSize[0]}px`,
                            height: `${gridSize[1]}px`,
                            fontSize: '20rpx',
                            lineHeight: `${gridSize[1]}px`,
                            color: '#333',
                            textAlign: 'center',
                            ...(type === GridType.Barrier && { backgroundColor: '#333' }),
                        }"
                        v-text="roomToAreaMap.get(String([x, y]) as PositionStr)"
                    />
                </view>
            </view>
        </view>

        <template #control>
            <view
                class="buttons"
                :style="{
                    justifyContent: step < 8 ? 'space-between' : 'center',
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
                    v-if="step < 8"
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
                    v-if="!started && step < 8"
                    size="mini"
                    :type="('primary' as 'button')"
                    @click="start"
                >
                    {{ typeof started === 'boolean' ? '继续' : '开始' }}
                </button>
                <button
                    v-if="started && step < 8"
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
            content="迷宫生成完毕！"
            confirmText="好的"
            :showClose="false"
            @confirm="dialogRef.confirm"
        />
    </uni-popup>
</template>

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
        &.legend--wall {
            icon {
                background-color: #333;
            }
        }
        &.legend--demolishing {
            icon {
                box-sizing: border-box;
                background-color: #333;
                border: 4rpx solid $uni-color-error;
            }
        }
        &.legend--randomDemolishing {
            icon {
                box-sizing: border-box;
                background-color: #333;
                border: 4rpx solid $uni-color-warning;
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
    &.mapGrid--demolishing::before,
    &.mapGrid--randomDemolishing::before {
        content: '';
        display: block;
        position: relative;
        width: 100%;
        height: 100%;
        margin: -8rpx auto auto -8rpx;
        border-width: 8rpx;
        border-style: solid;
    }
    &.mapGrid--demolishing::before {
        border-color: $uni-color-error;
    }
    &.mapGrid--randomDemolishing::before {
        border-color: $uni-color-warning;
    }
}
</style>
