<script lang="tsx" setup>
import type { Option, Size, Position, Grid as UnstableGrid, MMonster } from '@/types'
import { Direction, GridType, ModelType } from '@/types'
import { ref, computed, onBeforeMount, onMounted } from 'vue'
import { speeds } from '@/data'
import { getBoundingClientRectBySelector, getRandomString } from '@/utility'
import AlgoContainer from '@/components/AlgoContainer.vue'
import Dropdown from '@/components/Dropdown.vue'

type Grid = Required<Pick<UnstableGrid, 'position' | 'type' | 'count'>>

const DropdownId: string = `Dropdown-${getRandomString()}`
const mapSize: Size = [21, 21] // 地图尺寸，单位：网格数量
const mMonsterPositionMap = new Map<MMonster['id'], Position>([
    ['I', [3, 3]],
    ['J', [7, 4]],
    ['L', [12, 4]],
    ['O', [16, 5]],
    ['S', [3, 15]],
    ['T', [9, 15]],
    ['Z', [15, 15]],
])
const mMonsters: MMonster[] = [
    {
        id: 'I',
        position: mMonsterPositionMap.get('I')!,
        direction: Direction.None,
        model: [
            [ModelType.Solid],
            [ModelType.Solid],
            [ModelType.Solid],
            [ModelType.Solid],
        ],
    },
    {
        id: 'J',
        position: mMonsterPositionMap.get('J')!,
        direction: Direction.None,
        model: [
            [ModelType.Hollow, ModelType.Solid],
            [ModelType.Hollow, ModelType.Solid],
            [ModelType.Solid, ModelType.Solid],
        ],
    },
    {
        id: 'L',
        position: mMonsterPositionMap.get('L')!,
        direction: Direction.None,
        model: [
            [ModelType.Solid, ModelType.Hollow],
            [ModelType.Solid, ModelType.Hollow],
            [ModelType.Solid, ModelType.Solid],
        ],
    },
    {
        id: 'O',
        position: mMonsterPositionMap.get('O')!,
        direction: Direction.None,
        model: [
            [ModelType.Solid, ModelType.Solid],
            [ModelType.Solid, ModelType.Solid],
        ],
    },
    {
        id: 'S',
        position: mMonsterPositionMap.get('S')!,
        direction: Direction.None,
        model: [
            [ModelType.Hollow, ModelType.Solid, ModelType.Solid],
            [ModelType.Solid, ModelType.Solid, ModelType.Hollow],
        ],
    },
    {
        id: 'T',
        position: mMonsterPositionMap.get('T')!,
        direction: Direction.None,
        model: [
            [ModelType.Solid, ModelType.Solid, ModelType.Solid],
            [ModelType.Hollow, ModelType.Solid, ModelType.Hollow],
        ],
    },
    {
        id: 'Z',
        position: mMonsterPositionMap.get('Z')!,
        direction: Direction.None,
        model: [
            [ModelType.Solid, ModelType.Solid, ModelType.Hollow],
            [ModelType.Hollow, ModelType.Solid, ModelType.Solid],
        ],
    },
]
let moveIntervalId: NodeJS.Timeout | void = void 0

const map = ref<Grid[][]>(Array.from(
    { length: mapSize[1] },
    (_grids, y) => Array.from(
        { length: mapSize[0] },
        (_grid, x) => ({
            position: [x, y],
            type: GridType.Space,
            count: 0,
        }),
    ),
))
const gridSize = ref<Size>([0, 0]) // 网格尺寸，单位：px，根据屏幕分辨率动态计算
const speed = ref<number>(1)
const started = ref<boolean | null>(null)
const interval = computed<number>(() => Math.floor(200 / speed.value))

const move = (): void => {
    moveIntervalId = setInterval(() => {
        mMonsters.forEach((mMonster) => {
            const direction = Math.floor(Math.random() * 5)
            const oldPosition = mMonster.position
            const newPosition = [
                mMonster.position, // 停留
                [mMonster.position[0], Math.max(0, mMonster.position[1] - 1)], // 上
                [Math.min(map.value[0]!.length - mMonster.model[0]!.length, mMonster.position[0] + 1), mMonster.position[1]], // 右
                [mMonster.position[0], Math.min(map.value.length - mMonster.model.length, mMonster.position[1] + 1)], // 下
                [Math.max(0, mMonster.position[0] - 1), mMonster.position[1]], // 左
            ][direction] as Position
            String(newPosition) !== String(oldPosition) && (
                mMonster.position = newPosition,
                mMonster.model.forEach((modelTypes, y) => { // 更新怪物旧位置对应网格的计数
                    modelTypes.forEach((modelType, x) => {
                        modelType && map.value[oldPosition[1] + y]![oldPosition[0] + x]!.count--
                    })
                }),
                mMonster.model.forEach((modelTypes, y) => { // 更新怪物新位置对应网格的计数
                    modelTypes.forEach((modelType, x) => {
                        modelType && map.value[newPosition[1] + y]![newPosition[0] + x]!.count++
                    })
                })
            )
            direction && (mMonster.direction = direction)
        })
    }, interval.value)
}

const reset = (initialize: boolean | MouseEvent): void => {
    if (initialize !== true) {
        moveIntervalId = clearInterval(moveIntervalId as NodeJS.Timeout)
        map.value.forEach((grids) => grids.forEach((grid) => (grid.count = GridType.Space)))
        speed.value = 1
        started.value = null
    }
    mMonsters.forEach((mMonster) => {
        mMonster.position = mMonsterPositionMap.get(mMonster.id)!
        mMonster.direction = Direction.None
        mMonster.model.forEach((modelTypes, y) => {
            modelTypes.forEach((modelType, x) => {
                modelType && map.value[mMonster.position[1] + y]![mMonster.position[0] + x]!.count++
            })
        })
    })
}

const changeSpeed = (value: Option['value']): void => {
    if (value === speed.value) return
    moveIntervalId = clearInterval(moveIntervalId as NodeJS.Timeout)
    speed.value = value as number
    started.value && move()
}

const start = (): void => {
    move()
    started.value = true
}

const pause = (): void => {
    moveIntervalId = clearInterval(moveIntervalId as NodeJS.Timeout)
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
                        justifyContent: 'space-evenly',
                    }"
                >
                    <view class="legend legend--normal">
                        <icon />
                        <text>
                            {{ '正常' }}
                        </text>
                    </view>
                    <view class="legend legend--collision">
                        <icon />
                        <text>
                            {{ '碰撞' }}
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
                        v-for="({ type, count }, x) in grids"
                        :key="`mapGrid-${x}`"
                        :class="{
                            mapGrid: true,
                            'mapGrid--mMonster': count > 0,
                            'mapGrid--mMonster--collision': count > 1,
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
        &.legend--normal {
            icon {
                background-color: $uni-color-primary;
            }
        }
        &.legend--collision {
            icon {
                background-color: $uni-color-error;
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

.map-row {
    display: flex;
    column-gap: 1px;
}

.mapGrids {
    display: flex;
    column-gap: 1px;
}

.mapGrid {
    flex: none;
    background-color: #fff;
    &.mapGrid--mMonster {
        background-color: $uni-color-primary;
        &.mapGrid--mMonster--collision {
            background-color: $uni-color-error;
        }
    }
}
</style>
