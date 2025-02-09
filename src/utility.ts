import type { Position, RotationDirection } from '@/types'
import { Direction } from '@/types'

// 根据 id 获取元素的矩形信息
export const getBoundingClientRectBySelector = async (selector: string): Promise<DOMRect | null> => {
    try {
        const { length, [length - 1]: currentPage } = getCurrentPages()
        const selectorQuery = uni.createSelectorQuery().in(currentPage!.$vm)
        const nodesRef = selectorQuery.select(selector)
        const [rect] = await new Promise<[DOMRect]>((resolve) => nodesRef.boundingClientRect().exec(resolve))
        return rect
    } catch {
        return null
    }
}

// 获取一个指定长度的随机字符串
export const getRandomString = (length: number = 12): string => {
    const characters = 'ACDEFGHJKLMNPQRTUVWXYabcdefghijkmnpqrtuvwxy34679' // 已去除部分易混淆字符
    return ((result) => {
        for (let i = 0; i < length; i++) result += characters[Math.floor(Math.random() * characters.length)]
        return result
    })('')
}

// 获取一个两数间的随机整数（含两数）
export const getRandomIntInclusive = (min: number, max: number): number => {
    const minCeiled = Math.ceil(min)
    const maxFloored = Math.floor(max)
    return Math.floor(Math.random() * (maxFloored - minCeiled + 1)) + minCeiled
}

// 获取目标点相对于参考点的方向
export const getRelativeDirection = (rotationDirection: RotationDirection, referencePoint: Position, targetPoint: Position): Direction => {
    const horizontalDirection = targetPoint[0] > referencePoint[0]
        ? Direction.Right
        : (targetPoint[0] < referencePoint[0] ? Direction.Left : Direction.None)
    const verticalDirection = targetPoint[1] > referencePoint[1]
        ? Direction.Bottom
        : (targetPoint[1] < referencePoint[1] ? Direction.Top : Direction.None)

    switch (horizontalDirection) { // 基于旋转方向向下取整
        case Direction.None: {
            return verticalDirection
        }
        case Direction.Right: {
            switch (verticalDirection) {
                case Direction.None: {
                    return horizontalDirection
                }
                case Direction.Top: { // [Direction.None, 右上 => 上, 右上 => 右]
                    return [Direction.None, verticalDirection, horizontalDirection][rotationDirection] as Direction
                }
                case Direction.Bottom: { // [Direction.None, 右下 => 右, 右下 => 下]
                    return [Direction.None, horizontalDirection, verticalDirection][rotationDirection] as Direction
                }
            }
            // @ts-expect-error 避免 no-fallthrough 报错
            break
        }
        case Direction.Left: {
            switch (verticalDirection) {
                case Direction.None: {
                    return horizontalDirection
                }
                case Direction.Top: { // [Direction.None, 左上 => 左, 左上 => 上]
                    return [Direction.None, horizontalDirection, verticalDirection][rotationDirection] as Direction
                }
                case Direction.Bottom: { // [Direction.None, 左下 => 下, 左下 => 左]
                    return [Direction.None, verticalDirection, horizontalDirection][rotationDirection] as Direction
                }
            }
            // @ts-expect-error 避免 no-fallthrough 报错
            break
        }
    }
}

// 使用 Fisher-Yates 洗牌算法打乱数组
export const shuffleArray = <T>(arr: T): T => {
    if (!Array.isArray(arr)) return arr
    const shuffledArr = [...arr]
    for (let i = shuffledArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[shuffledArr[i], shuffledArr[j]] = [shuffledArr[j], shuffledArr[i]]
    }
    return shuffledArr as T
}
