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
                    {{ '移动指令由玩家输入' }}
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
</template>

<script lang="tsx" setup>
import { Size, Position, Direction, GridType, Grid as UnstableGrid, Player } from '@/types'
import { ref, onBeforeMount, onMounted } from 'vue'
import { getBoundingClientRectBySelector } from '@/utility'
import AlgoContainer from '@/components/AlgoContainer.vue'

type Grid = Pick<UnstableGrid, 'position' | 'type'>

const mapSize: Size = [21, 21] // 地图尺寸，单位：网格数量
const playerPosition: Position = [Math.floor(mapSize[0] / 2), Math.floor(mapSize[1] / 2)]
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
const player = ref<Player>({ id: 'Player', position: playerPosition, direction: Direction.Top }) // 玩家

const moveStart = (direction: Direction): void => {
    if (moveIntervalId) return
    moveIntervalId = setInterval(() => {
        uni.vibrateShort() // 手机短震动
        const oldPosition = player.value.position
        const newPosition = [
            player.value.position, // 停留
            [player.value.position[0], Math.max(0, player.value.position[1] - 1)], // 上
            [Math.min(map.value[0].length - 1, player.value.position[0] + 1), player.value.position[1]], // 右
            [player.value.position[0], Math.min(map.value.length - 1, player.value.position[1] + 1)], // 下
            [Math.max(0, player.value.position[0] - 1), player.value.position[1]], // 左
        ][direction] as Position
        String(newPosition) !== String(oldPosition) && (player.value.position = newPosition)
        player.value.direction = direction
    }, 50)
}

const moveEnd = (): void => {
    clearInterval(moveIntervalId)
    moveIntervalId = 0
}

const reset = (initialize: boolean | MouseEvent): void => {
    if (initialize !== true) {
        clearInterval(moveIntervalId)
        moveIntervalId = 0
    }
    player.value.position = playerPosition
    player.value.direction = Direction.Top
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
