<script lang="tsx" setup>
import type Component from '*.vue'
import type { Option, Size, Position, PositionStr, Vector, Grid as UnstableGrid, Path, Route } from '@/types'
import { Direction, PathDirection, GridType } from '@/types'
import { ref, triggerRef, computed, onBeforeMount, onMounted, nextTick } from 'vue'
import { speeds } from '@/data'
import { getBoundingClientRectBySelector, getRandomString, shuffleArray } from '@/utility'
import AlgoContainer from '@/components/AlgoContainer.vue'
import Dropdown from '@/components/Dropdown.vue'

type Grid = Required<Pick<UnstableGrid, 'position' | 'type' | 'visited'>>
type Wall = [Position, Position, Position]

const DropdownId: string = `Dropdown-${getRandomString()}`
const mapSize: Size = [21, 21] // 地图尺寸，单位：网格数量
let walls: Wall[] = [] // 墙体列表（每两个房间之间的墙体）
const roomToAreaMap = new Map<PositionStr, number>() // 房间与区域的映射表（已连通的多个房间统一打上相同的区域 id）
let searchIntervalId: NodeJS.Timeout | void = void 0

const dialogRef = ref<InstanceType<typeof Component>>({ content: '', confirm: () => {} })
const map = ref<Grid[][]>(Array.from(
    { length: mapSize[1] },
    (_grids, y) => Array.from(
        { length: mapSize[0] },
        (_grid, x) => ({
            position: [x, y],
            type: GridType.Space,
            visited: false,
        }),
    ),
))
const gridSize = ref<Size>([0, 0]) // 网格尺寸，单位：px，根据屏幕分辨率动态计算
const speed = ref<number>(1)
const started = ref<boolean | null>(null)
const route = ref<Route>({ start: null, end: null, path: {} }) // 路线
const queue = ref<Vector[]>([]) // 显式队列
const searchProbeMap = ref<Map<PositionStr, Vector>>(new Map()) // 搜索指针集
const predecessorGridMap = ref<Map<PositionStr, Vector>>(new Map()) // 前驱网格集
const interval = computed<number>(() => Math.floor(200 / speed.value))

const createMaze = (): void => { // 使用 Kruskal 算法生成迷宫
    // 初始化迷宫
    map.value.forEach((grids, y) => grids.forEach((grid, x) => (grid.type = x % 2 === 0 && y % 2 === 0 ? GridType.Space : GridType.Barrier))) // [x, y] 均为偶数时设为 GridType.Space（表示房间），否则设为 GridType.Barrier（表示墙体）

    // 初始化房间与区域的映射表
    let areaId = 0
    map.value.forEach((grids, y) => grids.forEach((grid, x) => grid.type === GridType.Space && roomToAreaMap.set(String([x, y]) as PositionStr, ++areaId)))

    // 获取墙体列表
    map.value.forEach((grids, y) => grids.forEach((_grid, x) => {
        x % 2 !== 0 && y % 2 === 0 && walls.push([[x, y], [x - 1, y], [x + 1, y]]) // 水平方向上的墙体取其左右房间
        x % 2 === 0 && y % 2 !== 0 && walls.push([[x, y], [x, y - 1], [x, y + 1]]) // 垂直方向上的墙体取其上下房间
    }))
    walls = shuffleArray<Wall[]>(walls) // 打乱墙体列表

    // 判断是否需要拆除墙体
    walls.forEach(([wall, room1, room2]) => {
        if (roomToAreaMap.get(String(room1) as PositionStr) === roomToAreaMap.get(String(room2) as PositionStr)) { // 两个房间在相同区域时，有 10% 的概率会拆除当前墙体，使迷宫产生环结构，增加迷宫的复杂性
            Math.random() < 0.1 && (map.value[wall[1]]![wall[0]]!.type = GridType.Space)
        } else { // 两个房间在不同区域时拆除当前墙体
            const areaId = roomToAreaMap.get(String(room2) as PositionStr)
            roomToAreaMap.forEach((value, key, map) => value === areaId && map.set(key, map.get(String(room1) as PositionStr)!)) // 给区域 2 的所有房间打上区域 1 的 id
            map.value[wall[1]]![wall[0]]!.type = GridType.Space
        }
    })

    // 迷宫生成完毕，释放内存
    walls = []
    roomToAreaMap.clear()
}

const setRoute = (target: 'StartAndEnd' | 'Path', value: Position | Path, type?: GridType): void => {
    if (target === 'StartAndEnd') {
        const [x, y] = value as Position
        if (typeof started.value === 'boolean') return
        if (type !== GridType.Space) return
        if (String([x, y]) === String(route.value.start)) { route.value.start = null; return }
        if (String([x, y]) === String(route.value.end)) { route.value.end = null; return }
        if (route.value.start && route.value.end) return
        route.value[route.value.start ? 'end' : 'start'] = [x, y]
    }
    if (target === 'Path') {
        route.value.path = value as Path
    }
}

const search = (resumed: boolean, finalCallback: (vectors: Vector[]) => void): void => {
    if (!route.value.start || !route.value.end) return

    // 检查目标网格是否可通行
    const isPassable = (targetGrid: Grid): boolean => targetGrid.type === GridType.Space && !targetGrid.visited

    // 根据位置获取对应网格及其相邻网格
    const getAdjacentGrids = (targetGridPosition: Position): Grid[] => {
        const [x, y] = targetGridPosition
        return [
            { // targetGrid
                position: [x, y],
                type: map.value[y]![x]!.type,
                visited: map.value[y]![x]!.visited,
            },
            { // 上
                position: [x, y - 1],
                type: y - 1 < 0 ? GridType.Outer : map.value[y - 1]![x]!.type,
                visited: y - 1 < 0 ? false : map.value[y - 1]![x]!.visited,
            },
            { // 右
                position: [x + 1, y],
                type: x + 1 > map.value[0]!.length - 1 ? GridType.Outer : map.value[y]![x + 1]!.type,
                visited: x + 1 > map.value[0]!.length - 1 ? false : map.value[y]![x + 1]!.visited,
            },
            { // 下
                position: [x, y + 1],
                type: y + 1 > map.value.length - 1 ? GridType.Outer : map.value[y + 1]![x]!.type,
                visited: y + 1 > map.value.length - 1 ? false : map.value[y + 1]![x]!.visited,

            },
            { // 左
                position: [x - 1, y],
                type: x - 1 < 0 ? GridType.Outer : map.value[y]![x - 1]!.type,
                visited: x - 1 < 0 ? false : map.value[y]![x - 1]!.visited,
            },
        ]
    }

    // 初始化开始帧的队列数据
    if (!resumed) {
        const initialPosition = [...route.value.start] as Position
        const initialDirection = Direction.None
        queue.value = [{ position: initialPosition, direction: initialDirection }]
    }

    searchIntervalId = setInterval(async () => {
        // 不断出列并更新相关数据，直到当前帧队列为空
        searchProbeMap.value.clear()
        const nextQueueMap = new Map<PositionStr, Vector>()
        while (queue.value.length) {
            // 出列
            const front = queue.value.shift() as Vector

            // 更新搜索指针集
            searchProbeMap.value.set(String(front.position) as PositionStr, front)

            // 更新搜索指针对应网格的访问状态
            map.value[front.position[1]]![front.position[0]]!.visited = true

            // 缓存下一帧的队列数据
            const frontAdjacentGrids = getAdjacentGrids(front.position)
            frontAdjacentGrids.forEach((grid, index) => {
                if (!nextQueueMap.has(String(grid.position) as PositionStr) && isPassable(grid)) {
                    nextQueueMap.set(String(grid.position) as PositionStr, { position: grid.position, direction: index })
                    predecessorGridMap.value.set(String(grid.position) as PositionStr, front) // 更新前驱网格集
                }
            })
        }

        // 先更新视图再往下执行
        await nextTick()

        // 检查是否找到终点
        if (searchProbeMap.value.has(String(route.value.end) as PositionStr)) { // 已找到
            searchIntervalId = clearInterval(searchIntervalId as NodeJS.Timeout)
            finalCallback((() => { // 通过不断回溯获取最短路径数据并修正方向后返回
                const vectors = [searchProbeMap.value.get(String(route.value.end) as PositionStr)!]
                while (String(vectors[0]!.position) !== String(route.value.start)) vectors.unshift(predecessorGridMap.value.get(String(vectors[0]!.position) as PositionStr)!)
                return vectors.map((vector, index, arr) => ({
                    ...vector,
                    direction: index === arr.length - 1 ? vector.direction : arr[index + 1]!.direction,
                }))
            })())
        } else if (nextQueueMap.size) { // 未找到
            queue.value = [...nextQueueMap.values()] // 更新下一帧的队列数据
        } else { // 找不到
            searchIntervalId = clearInterval(searchIntervalId as NodeJS.Timeout)
            finalCallback([])
        }
    }, interval.value)
}

const runSearch = (resumed: boolean) => search(resumed, (vectors) => {
    if (vectors.length) {
        setTimeout(() => {
            queue.value = []
            searchProbeMap.value.clear()
            predecessorGridMap.value.clear()
            setRoute(
                'Path',
                vectors.reduce((result, { position, direction }, index, arr) => {
                    result[String(position) as PositionStr] = (() => {
                        if (index === 0 || index === arr.length - 1) return PathDirection.None
                        if (direction === arr[index - 1]!.direction) return [PathDirection.None, PathDirection.Vertical, PathDirection.Horizontal, PathDirection.Vertical, PathDirection.Horizontal][direction]
                        return [
                            PathDirection.None,
                            [PathDirection.None, PathDirection.None, PathDirection.BottomRight, PathDirection.None, PathDirection.BottomLeft][direction],
                            [PathDirection.None, PathDirection.TopLeft, PathDirection.None, PathDirection.BottomLeft, PathDirection.None][direction],
                            [PathDirection.None, PathDirection.None, PathDirection.TopRight, PathDirection.None, PathDirection.TopLeft][direction],
                            [PathDirection.None, PathDirection.TopRight, PathDirection.None, PathDirection.BottomRight, PathDirection.None][direction],
                        ][arr[index - 1]!.direction]
                    })() as PathDirection
                    return result
                }, {} as Path),
            )
        }, interval.value)
    } else {
        dialogRef.value.content = '此路不通，请重新设置起点和终点'
        dialogRef.value.confirm = () => {
            map.value.forEach((grids) => grids.forEach((grid) => (grid.visited = false)))
            started.value = null
            route.value = { start: null, end: null, path: {} }
            queue.value = []
            searchProbeMap.value.clear()
            predecessorGridMap.value.clear()
        }
        dialogRef.value.open()
        triggerRef(dialogRef)
    }
})

const reset = (initialize: boolean | MouseEvent): void => {
    if (initialize !== true) {
        searchIntervalId = clearInterval(searchIntervalId as NodeJS.Timeout)
        map.value.forEach((grids, y) => grids.forEach((grid, x) => (grid.type = x % 2 === 0 && y % 2 === 0 ? GridType.Space : GridType.Barrier, grid.visited = false)))
        speed.value = 1
        started.value = null
        route.value = { start: null, end: null, path: {} }
        queue.value = []
        searchProbeMap.value.clear()
        predecessorGridMap.value.clear()
    }
    createMaze()
}

const changeSpeed = (value: Option['value']): void => {
    if (value === speed.value) return
    searchIntervalId = clearInterval(searchIntervalId as NodeJS.Timeout)
    speed.value = value as number
    started.value && runSearch(true)
}

const start = (): void => {
    if (!route.value.start || !route.value.end) {
        dialogRef.value.content = '开始前，请先点击地图空白网格设置起点和终点'
        dialogRef.value.confirm = () => {}
        dialogRef.value.open()
        triggerRef(dialogRef)
        return
    }
    if (Math.abs(route.value.end[0] - route.value.start[0]) + Math.abs(route.value.end[1] - route.value.start[1]) < 2) {
        dialogRef.value.content = '起点和终点距离过近，请重新设置'
        dialogRef.value.confirm = () => (route.value = { start: null, end: null, path: {} })
        dialogRef.value.open()
        triggerRef(dialogRef)
        return
    }
    runSearch(started.value === false)
    started.value = true
}

const pause = (): void => {
    searchIntervalId = clearInterval(searchIntervalId as NodeJS.Timeout)
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
                    <view class="legend legend--wall">
                        <icon />
                        <text>
                            {{ '墙体' }}
                        </text>
                    </view>
                    <view class="legend legend--start">
                        <icon />
                        <text>
                            {{ '起点' }}
                        </text>
                    </view>
                    <view class="legend legend--end">
                        <icon />
                        <text>
                            {{ '终点' }}
                        </text>
                    </view>
                    <view class="legend legend--path">
                        <icon />
                        <text>
                            {{ '路径' }}
                        </text>
                    </view>
                </view>
                <view
                    class="detail__row"
                    :style="{
                        justifyContent: 'space-evenly',
                    }"
                >
                    <view class="legend legend--searched">
                        <icon />
                        <text>
                            {{ '已搜索' }}
                        </text>
                    </view>
                    <view class="legend legend--searching">
                        <icon />
                        <text>
                            {{ '搜索中' }}
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
                        v-for="({ type, visited }, x) in grids"
                        :key="`mapGrid-${x}`"
                        :class="{
                            mapGrid: true,
                            'mapGrid--visited': visited,
                            'mapGrid--start': String([x, y]) === String(route.start),
                            'mapGrid--end': String([x, y]) === String(route.end),
                            [`mapGrid--probe--${['none', 'top', 'right', 'bottom', 'left'][Number(searchProbeMap.has(String([x, y]) as PositionStr)) && searchProbeMap.get(String([x, y]) as PositionStr)!.direction]}`]: searchProbeMap.has(String([x, y]) as PositionStr),
                            [`mapGrid--path--${['none', 'horizontal', 'vertical', 'topLeft', 'topRight', 'bottomLeft', 'bottomRight'][route.path[String([x, y]) as PositionStr]!]}`]: route.path[String([x, y]) as PositionStr] && !(new Set<PositionStr>([String(route.start) as PositionStr, String(route.end) as PositionStr]).has(String([x, y]) as PositionStr)),
                        }"
                        :style="{
                            width: `${gridSize[0]}px`,
                            height: `${gridSize[1]}px`,
                            ...(type === GridType.Barrier && { backgroundColor: '#333' }),
                        }"
                        @click="setRoute('StartAndEnd', [x, y], type)"
                    />
                </view>
            </view>
        </view>

        <template #control>
            <view
                class="buttons"
                :style="{
                    justifyContent: !Object.keys(route.path).length ? 'space-between' : 'center',
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
                    v-if="!Object.keys(route.path).length"
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
                    v-if="!started && !Object.keys(route.path).length"
                    size="mini"
                    :type="('primary' as 'button')"
                    @click="start"
                >
                    {{ typeof started === 'boolean' ? '继续' : '开始' }}
                </button>
                <button
                    v-if="started && !Object.keys(route.path).length"
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
            type="warn"
            title="提示"
            confirmText="好的"
            :showClose="false"
            :content="dialogRef.content"
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
        &.legend--start {
            icon {
                background-color: $uni-color-warning;
            }
        }
        &.legend--end {
            icon {
                background-color: $uni-color-error;
            }
        }
        &.legend--path {
            icon {
                background-color: $uni-color-success;
            }
        }
        &.legend--searched {
            icon {
                background-color: #cce4ff;
            }
        }
        &.legend--searching {
            icon {
                background-color: $uni-color-primary;
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
    &.mapGrid--visited {
        background-color: #cce4ff;
    }
    &.mapGrid--start {
        background-color: $uni-color-warning;
    }
    &.mapGrid--end {
        background-color: $uni-color-error;
    }
    // 搜索指针
    &.mapGrid--probe--none::before,
    &.mapGrid--probe--top::before,
    &.mapGrid--probe--right::before,
    &.mapGrid--probe--bottom::before,
    &.mapGrid--probe--left::before {
        content: '';
        display: block;
        width: 100%;
        height: 100%;
        background-color: $uni-color-primary;
    }
    &.mapGrid--probe--top::before,
    &.mapGrid--probe--right::before,
    &.mapGrid--probe--bottom::before,
    &.mapGrid--probe--left::before {
        clip-path: polygon(50% 10%, 90% 90%, 50% 70%, 10% 90%);
    }
    &.mapGrid--probe--none::before {
        clip-path: circle(40% at 50% 50%);
    }
    &.mapGrid--probe--top::before {
        transform: rotate(0deg);
    }
    &.mapGrid--probe--right::before {
        transform: rotate(90deg);
    }
    &.mapGrid--probe--bottom::before {
        transform: rotate(180deg);
    }
    &.mapGrid--probe--left::before {
        transform: rotate(270deg);
    }
    // 路径
    &.mapGrid--path--horizontal::before,
    &.mapGrid--path--vertical::before {
        content: '';
        display: block;
        background-color: $uni-color-success;
    }
    &.mapGrid--path--horizontal::before {
        width: 100%;
        height: 50%;
        margin: 25% 0%;
    }
    &.mapGrid--path--vertical::before {
        width: 50%;
        height: 100%;
        margin: 0% 25%;
    }
    // 路径拐角
    &.mapGrid--path--topLeft::before,
    &.mapGrid--path--topRight::before,
    &.mapGrid--path--bottomLeft::before,
    &.mapGrid--path--bottomRight::before {
        content: '';
        display: block;
        width: 100%;
        height: 100%;
        background-color: $uni-color-success;
    }
    &.mapGrid--path--topLeft::before {
        clip-path: polygon(25% 0%, 75% 0%, 75% 75%, 0% 75%, 0% 25%, 25% 25%);
    }
    &.mapGrid--path--topRight::before {
        clip-path: polygon(25% 0%, 75% 0%, 75% 25%, 100% 25%, 100% 75%, 25% 75%);
    }
    &.mapGrid--path--bottomLeft::before {
        clip-path: polygon(0% 25%, 75% 25%, 75% 100%, 25% 100%, 25% 75%, 0% 75%);
    }
    &.mapGrid--path--bottomRight::before {
        clip-path: polygon(25% 25%, 100% 25%, 100% 75%, 75% 75%, 75% 100%, 25% 100%);
    }
}
</style>
