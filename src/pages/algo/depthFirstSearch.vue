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
                        justifyContent: 'space-between',
                    }"
                >
                    <view class="legend legend--searched">
                        <icon />
                        <text>
                            {{ '已搜索' }}
                        </text>
                    </view>
                    <view class="legend legend--pending">
                        <icon />
                        <text>
                            {{ '待回溯' }}
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
                            'mapGrid': true,
                            'mapGrid--visited': visited,
                            'mapGrid--pending': pendingGridSet.has(String([x, y]) as PositionStr),
                            'mapGrid--start': String([x, y]) === String(route.start),
                            'mapGrid--end': String([x, y]) === String(route.end),
                            [`mapGrid--probe--${['none', 'top', 'right', 'bottom', 'left'][searchProbe.direction]}`]: String([x, y]) === String(searchProbe.position),
                            [`mapGrid--path--${['none', 'horizontal', 'vertical', 'topLeft', 'topRight', 'bottomLeft', 'bottomRight'][route.path[String([x, y]) as PositionStr]]}`]: route.path[String([x, y]) as PositionStr] && !(new Set([String(route.start), String(route.end)]).has(String([x, y]))),
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

<script lang="tsx" setup>
import type Component from '*.vue'
import { Option, Size, Position, PositionStr, Direction, RotationDirection, PathDirection, Vector, GridType, Grid as UnstableGrid, Path, Route } from '@/types'
import { ref, triggerRef, computed, onBeforeMount, onMounted, nextTick } from 'vue'
import { speeds } from '@/data'
import { getBoundingClientRectBySelector, getRandomString, getRelativeDirection, shuffleArray } from '@/utility'
import AlgoContainer from '@/components/AlgoContainer.vue'
import Dropdown from '@/components/Dropdown.vue'

type Grid = Required<Pick<UnstableGrid, 'position' | 'type' | 'visited'>>
type Wall = [Position, Position, Position]

const DropdownId = `Dropdown-${getRandomString()}`
const mapSize: Size = [21, 21] // 地图尺寸，单位：网格数量
let walls: Wall[] = [] // 墙体列表（每两个房间之间的墙体）
const roomAreaMap: Map<PositionStr, number> = new Map() // 房间与区域的映射表（已连通的多个房间统一打上相同的区域 id）
let searchIntervalId: number = 0

const dialogRef = ref<InstanceType<typeof Component>>({ content: '', confirm: () => {} })
const map = ref<Grid[][]>(
    Array(mapSize[1]).fill(null).map(
        (grids, y) => Array(mapSize[0]).fill(null).map(
            (grid, x) => ({
                position: [x, y],
                type: GridType.Space,
                visited: false,
            }),
        ),
    ),
)
const gridSize = ref<Size>([0, 0]) // 网格尺寸，单位：px，根据屏幕分辨率动态计算
const speed = ref<number>(1)
const started = ref<boolean | null>(null)
const route = ref<Route>({ start: null, end: null, path: {} }) // 路线
const stack = ref<Vector[]>([]) // 显式栈
const searchProbe = ref<Vector>({ position: [-1, -1], direction: Direction.None }) // 搜索指针
const pendingGridSet = ref<Set<PositionStr>>(new Set()) // 待回溯网格集
const interval = computed<number>(() => Math.floor(200 / speed.value))

const createMaze = (): void => { // 使用 Kruskal 算法生成迷宫
    // 初始化迷宫
    map.value.forEach((grids, y) => grids.forEach((grid, x) => (grid.type = x % 2 === 0 && y % 2 === 0 ? GridType.Space : GridType.Barrier))) // [x, y] 均为偶数时设为 GridType.Space（表示房间），否则设为 GridType.Barrier（表示墙体）

    // 初始化房间与区域的映射表
    let areaId = 0
    map.value.forEach((grids, y) => grids.forEach((grid, x) => grid.type === GridType.Space && roomAreaMap.set(String([x, y]) as PositionStr, ++areaId)))

    // 获取墙体列表
    map.value.forEach((grids, y) => grids.forEach((grid, x) => {
        x % 2 !== 0 && y % 2 === 0 && walls.push([[x, y], [x - 1, y], [x + 1, y]]) // 水平方向上的墙体取其左右房间
        x % 2 === 0 && y % 2 !== 0 && walls.push([[x, y], [x, y - 1], [x, y + 1]]) // 垂直方向上的墙体取其上下房间
    }))
    walls = shuffleArray(walls) // 打乱墙体列表

    // 判断是否需要拆除墙体
    walls.forEach(([wall, room1, room2]) => {
        if (roomAreaMap.get(String(room1) as PositionStr) === roomAreaMap.get(String(room2) as PositionStr)) { // 两个房间在相同区域时，有 10% 的概率会拆除当前墙体，使迷宫产生环结构，增加迷宫的复杂性
            Math.random() < 0.1 && (map.value[wall[1]][wall[0]].type = GridType.Space)
        } else { // 两个房间在不同区域时拆除当前墙体
            const areaId = roomAreaMap.get(String(room2) as PositionStr)
            roomAreaMap.forEach((value, key, map) => value === areaId && map.set(key, map.get(String(room1) as PositionStr)!)) // 给区域 2 的所有房间打上区域 1 的 id
            map.value[wall[1]][wall[0]].type = GridType.Space
        }
    })

    // 迷宫生成完毕，释放内存
    walls = []
    roomAreaMap.clear()
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

    // 方向盘
    const wheel = (n: number): Direction => (n % 4 + 4) % 4 === 0 ? 4 : (n % 4 + 4) % 4

    // 根据位置获取对应网格及其相邻网格
    const getAdjacentGrids = (targetGridPosition: Position): Grid[] => {
        const [x, y] = targetGridPosition
        return [
            { // targetGrid
                position: [x, y],
                type: map.value[y][x].type,
                visited: map.value[y][x].visited,
            },
            { // 上
                position: [x, y - 1],
                type: y - 1 < 0 ? GridType.Outer : map.value[y - 1][x].type,
                visited: y - 1 < 0 ? false : map.value[y - 1][x].visited,
            },
            { // 右
                position: [x + 1, y],
                type: x + 1 > map.value[0].length - 1 ? GridType.Outer : map.value[y][x + 1].type,
                visited: x + 1 > map.value[0].length - 1 ? false : map.value[y][x + 1].visited,
            },
            { // 下
                position: [x, y + 1],
                type: y + 1 > map.value.length - 1 ? GridType.Outer : map.value[y + 1][x].type,
                visited: y + 1 > map.value.length - 1 ? false : map.value[y + 1][x].visited,

            },
            { // 左
                position: [x - 1, y],
                type: x - 1 < 0 ? GridType.Outer : map.value[y][x - 1].type,
                visited: x - 1 < 0 ? false : map.value[y][x - 1].visited,
            },
        ]
    }

    // 搜索开始前，根据初始搜索方向提前检查开始帧搜索指针的下一个网格是否可通行，从而改变开始帧搜索指针的方向和 initialDirectionChanged，避免开始帧为空白帧
    let initialDirectionChanged = resumed // 记录初始搜索方向是否已被改变
    if (!initialDirectionChanged) {
        const initialPosition: Position = [...route.value.start]
        const initialDirection = getRelativeDirection(RotationDirection.Anticlockwise, route.value.start, route.value.end) // 初始搜索方向（终点相对于起点的方向）
        const initialSearchProbeAdjacentGrids = getAdjacentGrids(initialPosition)
        stack.value = [{ position: initialPosition, direction: initialDirection }]
        !isPassable(initialSearchProbeAdjacentGrids[initialDirection]) && (
            stack.value[stack.value.length - 1].direction = wheel(initialDirection - 1), // 左转使右侧靠墙
            initialDirectionChanged = true
        )
    }

    searchIntervalId = setInterval(async () => {
        // 检查是否找不到终点
        if (!stack.value.length) {
            clearInterval(searchIntervalId)
            searchIntervalId = 0
            finalCallback(stack.value)
            return
        }

        // 更新搜索指针
        searchProbe.value = stack.value[stack.value.length - 1]

        // 更新搜索指针对应网格的访问状态
        map.value[searchProbe.value.position[1]][searchProbe.value.position[0]].visited = true

        // 更新待回溯网格集
        pendingGridSet.value.clear()
        stack.value.forEach(({ position }, index, arr) => {
            if (index === arr.length - 1) return
            const adjacentGrid = getAdjacentGrids(position)
            adjacentGrid.some(isPassable) && pendingGridSet.value.add(String(position) as PositionStr)
        })

        // 先更新视图再往下执行
        await nextTick()

        // 获取搜索指针对应网格及其相邻网格
        const searchProbeAdjacentGrids = getAdjacentGrids(searchProbe.value.position)

        // 检查搜索指针对应网格及其相邻网格是否存在终点
        const endDirection = searchProbeAdjacentGrids.findIndex(({ position }) => String(position) === String(route.value.end))
        switch (endDirection) {
            case -1: {
                break
            }
            case Direction.None: {
                clearInterval(searchIntervalId)
                searchIntervalId = 0
                finalCallback(stack.value)
                return
            }
            default: {
                searchProbe.value.direction = endDirection
                stack.value.push({ position: searchProbeAdjacentGrids[endDirection].position, direction: endDirection })
                return
            }
        }

        // 搜索规则如下：
        if (initialDirectionChanged) { // 2. 靠墙后，按照道路交通中的右侧行驶规则进行搜索直到找到终点
            // 获取最新搜索指针的可通行方向，方向为不可通行时则出栈并更新搜索指针，直到方向为可通行为止
            let popped = false
            while (true) {
                const lastSearchProbe = stack.value[stack.value.length - 1]
                const lastSearchProbeAdjacentGrids = getAdjacentGrids(lastSearchProbe.position)
                /* const checkedSequence = [ // 顺时针检查顺序（左侧行驶规则）
                    wheel(lastSearchProbe.direction - 1), // 左
                    wheel(lastSearchProbe.direction), // 前
                    wheel(lastSearchProbe.direction + 1), // 右
                    wheel(lastSearchProbe.direction + 2), // 后
                ] */
                const checkedSequence = [ // 逆时针检查顺序（右侧行驶规则）
                    wheel(lastSearchProbe.direction + 1), // 右
                    wheel(lastSearchProbe.direction), // 前
                    wheel(lastSearchProbe.direction - 1), // 左
                    wheel(lastSearchProbe.direction - 2), // 后
                ]
                lastSearchProbe.direction = Direction.None
                for (const dir of checkedSequence) {
                    if (isPassable(lastSearchProbeAdjacentGrids[dir])) { lastSearchProbe.direction = dir; break }
                }
                if (lastSearchProbe.direction) {
                    searchProbe.value = lastSearchProbe
                    stack.value.push({ position: lastSearchProbeAdjacentGrids[lastSearchProbe.direction].position, direction: lastSearchProbe.direction })
                    break
                } else {
                    popped = true
                    stack.value.pop()
                }
            }
            popped && await nextTick() // 若出过栈，便在开始下一帧前先更新视图
        } else { // 1. 靠墙前，按照初始搜索方向一直往前搜索直到靠墙
            // 上一帧已提前检查下一个网格的可通行性，这里可直接将下一个网格加入显式栈
            stack.value.push({ position: searchProbeAdjacentGrids[searchProbe.value.direction].position, direction: searchProbe.value.direction })
            // 下一帧搜索开始前，根据初始搜索方向提前检查下一帧搜索指针的下一个网格是否可通行，从而改变下一帧搜索指针的方向和 initialDirectionChanged，避免下一帧为空白帧
            const nextSearchProbeAdjacentGrids = getAdjacentGrids(searchProbeAdjacentGrids[searchProbe.value.direction].position)
            !isPassable(nextSearchProbeAdjacentGrids[searchProbe.value.direction]) && (
                stack.value[stack.value.length - 1].direction = wheel(searchProbe.value.direction - 1), // 左转使右侧靠墙
                initialDirectionChanged = true
            )
        }
    }, interval.value)
}

const runSearch = (resumed: boolean) => search(resumed, (vectors) => {
    if (vectors.length) {
        setTimeout(() => {
            stack.value = []
            searchProbe.value = { position: [-1, -1], direction: Direction.None }
            pendingGridSet.value.clear()
            setRoute(
                'Path',
                vectors.reduce((result, { position, direction }, index, arr) => {
                    result[String(position) as PositionStr] = (() => {
                        if (index === 0 || index === arr.length - 1) return PathDirection.None
                        if (direction === arr[index - 1].direction) return [PathDirection.None, PathDirection.Vertical, PathDirection.Horizontal, PathDirection.Vertical, PathDirection.Horizontal][direction]
                        return [
                            PathDirection.None,
                            [PathDirection.None, PathDirection.None, PathDirection.BottomRight, PathDirection.None, PathDirection.BottomLeft][direction],
                            [PathDirection.None, PathDirection.TopLeft, PathDirection.None, PathDirection.BottomLeft, PathDirection.None][direction],
                            [PathDirection.None, PathDirection.None, PathDirection.TopRight, PathDirection.None, PathDirection.TopLeft][direction],
                            [PathDirection.None, PathDirection.TopRight, PathDirection.None, PathDirection.BottomRight, PathDirection.None][direction],
                        ][arr[index - 1].direction]
                    })()
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
            stack.value = []
            searchProbe.value = { position: [-1, -1], direction: Direction.None }
            pendingGridSet.value.clear()
        }
        dialogRef.value.open()
        triggerRef(dialogRef)
    }
})

const reset = (initialize: boolean | MouseEvent): void => {
    if (initialize !== true) {
        clearInterval(searchIntervalId)
        searchIntervalId = 0
        map.value.forEach((grids, y) => grids.forEach((grid, x) => (grid.type = x % 2 === 0 && y % 2 === 0 ? GridType.Space : GridType.Barrier, grid.visited = false)))
        speed.value = 1
        started.value = null
        route.value = { start: null, end: null, path: {} }
        stack.value = []
        searchProbe.value = { position: [-1, -1], direction: Direction.None }
        pendingGridSet.value.clear()
    }
    createMaze()
}

const changeSpeed = (value: Option['value']): void => {
    if (value === speed.value) return
    clearInterval(searchIntervalId)
    searchIntervalId = 0
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
    clearInterval(searchIntervalId)
    searchIntervalId = 0
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
        &.legend--pending {
            icon {
                background-color: #66b0ff;
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
    &.mapGrid--pending {
        background-color: #66b0ff;
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
        content: "";
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
        content: "";
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
        content: "";
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
