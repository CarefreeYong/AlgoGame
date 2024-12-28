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
                    <view class="legend legend--player">
                        <icon />
                        <text>
                            {{ '玩家' }}
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
                            'mapGrid--start': String([x, y]) === String([0, 0]),
                            'mapGrid--end': String([x, y]) === String([grids.length - 1, map.length - 1]),
                            [`mapGrid--player--${['none', 'top', 'right', 'bottom', 'left'][player.direction]}`]: String([x, y]) === String(player.position),
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

        <view class="gamepad">
            <view
                class="gamepadDirection gamepadDirection--top iconfont"
                @touchstart="moveStart(Direction.Top)"
                @touchend="moveEnd"
            >
                {{ '\ue70f' }}
            </view>
            <view class="gamepad__middle">
                <view
                    class="gamepadDirection gamepadDirection--left iconfont"
                    @touchstart="moveStart(Direction.Left)"
                    @touchend="moveEnd"
                >
                    {{ '\ue712' }}
                </view>
                <view
                    class="gamepadDirection gamepadDirection--right iconfont"
                    @touchstart="moveStart(Direction.Right)"
                    @touchend="moveEnd"
                >
                    {{ '\ue711' }}
                </view>
            </view>
            <view
                class="gamepadDirection gamepadDirection--bottom iconfont"
                @touchstart="moveStart(Direction.Bottom)"
                @touchend="moveEnd"
            >
                {{ '\ue710' }}
            </view>
        </view>

        <template #control>
            <view
                class="buttons"
                :style="{
                    justifyContent: 'center',
                }"
            >
                <button
                    size="mini"
                    :type="('default' as 'button')"
                    @click="reset"
                >
                    {{ '重置' }}
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
            title="恭喜你到达终点！"
            content="是否重置迷宫？"
            cancelText="否"
            confirmText="是"
            @confirm="reset"
        />
    </uni-popup>
</template>

<script lang="tsx" setup>
import type Component from '*.vue'
import { Size, Position, PositionStr, Direction, GridType, Grid as UnstableGrid, Player } from '@/types'
import { ref, onBeforeMount, onMounted, nextTick } from 'vue'
import { getBoundingClientRectBySelector, shuffleArray } from '@/utility'
import AlgoContainer from '@/components/AlgoContainer.vue'

type Grid = Pick<UnstableGrid, 'position' | 'type'>
type Wall = [Position, Position, Position]

const mapSize: Size = [21, 21] // 地图尺寸，单位：网格数量
let walls: Wall[] = [] // 墙体列表（每两个房间之间的墙体）
const roomAreaMap: Map<PositionStr, number> = new Map() // 房间与区域的映射表（已连通的多个房间统一打上相同的区域 id）
let moveIntervalId: number = 0

const dialogRef = ref<InstanceType<typeof Component>>({ arrived: false })
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
const player = ref<Player>({ id: 'Player', position: [0, 0], direction: Direction.Bottom }) // 玩家

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

const moveStart = (direction: Direction): void => {
    if (moveIntervalId) return
    moveIntervalId = setInterval(async () => {
        uni.vibrateShort() // 手机短震动
        const oldPosition = player.value.position
        const newPosition = [
            player.value.position, // 停留
            [player.value.position[0], Math.max(0, player.value.position[1] - 1)], // 上
            [Math.min(map.value[0].length - 1, player.value.position[0] + 1), player.value.position[1]], // 右
            [player.value.position[0], Math.min(map.value.length - 1, player.value.position[1] + 1)], // 下
            [Math.max(0, player.value.position[0] - 1), player.value.position[1]], // 左
        ][direction] as Position
        String(newPosition) !== String(oldPosition) && map.value[newPosition[1]][newPosition[0]].type === GridType.Space && (player.value.position = newPosition)
        player.value.direction = direction
        // 检查是否到达终点
        await nextTick()
        String([player.value.position]) === String([map.value[0].length - 1, map.value.length - 1]) && !dialogRef.value.arrived && (dialogRef.value.arrived = true, dialogRef.value.open())
    }, 50)
}

const moveEnd = (): void => {
    clearInterval(moveIntervalId)
    moveIntervalId = 0
}

const reset = (initialize: boolean | MouseEvent): void => {
    if (initialize !== true) {
        dialogRef.value.arrived = false
        map.value.forEach((grids, y) => grids.forEach((grid, x) => (grid.type = x % 2 === 0 && y % 2 === 0 ? GridType.Space : GridType.Barrier)))
        player.value.position = [0, 0]
        player.value.direction = Direction.Bottom
    }
    createMaze()
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
        &.legend--player {
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
    &.mapGrid--start {
        background-color: $uni-color-warning;
    }
    &.mapGrid--end {
        background-color: $uni-color-error;
    }
    // 玩家
    &.mapGrid--player--none::before,
    &.mapGrid--player--top::before,
    &.mapGrid--player--right::before,
    &.mapGrid--player--bottom::before,
    &.mapGrid--player--left::before {
        content: "";
        display: block;
        width: 100%;
        height: 100%;
        background-color: $uni-color-primary;
    }
    &.mapGrid--player--top::before,
    &.mapGrid--player--right::before,
    &.mapGrid--player--bottom::before,
    &.mapGrid--player--left::before {
        clip-path: polygon(50% 10%, 90% 90%, 50% 70%, 10% 90%);
    }
    &.mapGrid--player--none::before {
        clip-path: circle(40% at 50% 50%);
    }
    &.mapGrid--player--top::before {
        transform: rotate(0deg);
    }
    &.mapGrid--player--right::before {
        transform: rotate(90deg);
    }
    &.mapGrid--player--bottom::before {
        transform: rotate(180deg);
    }
    &.mapGrid--player--left::before {
        transform: rotate(270deg);
    }
}

.gamepad {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    margin-top: 80rpx;
}

.gamepad__middle {
    display: flex;
    justify-content: center;
    align-items: center;
    column-gap: 100rpx;
}

.gamepadDirection {
    flex: none;
    width: 100rpx;
    height: 100rpx;
    font-size: 50rpx;
    text-align: center;
    background-color: #fff;
    border-radius: 50%;
    box-shadow: 0rpx 0rpx 20rpx 0rpx rgba(0, 0, 0, 0.2);
    &:active {
        color: rgba(0, 0,0, .6);
        background-color: #dedede;
        box-shadow: 0rpx 0rpx 80rpx 20rpx rgba(0, 0, 0, 0.2);
    }
    &.gamepadDirection--top {
        line-height: 90rpx;
    }
    &.gamepadDirection--bottom {
        line-height: 110rpx;
    }
    &.gamepadDirection--left {
        line-height: 100rpx;
        text-indent: -10rpx;
    }
    &.gamepadDirection--right {
        line-height: 100rpx;
        text-indent: 10rpx;
    }
}
</style>
