export interface Option { // 选项
    value: number | string,
    label: number | string,
}

export type SizeWidth = number
export type SizeHeight = number
export type Size = [SizeWidth, SizeHeight] // 尺寸
export type SizeStr = `${SizeWidth},${SizeHeight}` // 尺寸（字符串形式）

export type PositionX = number
export type PositionY = number
export type Position = [PositionX, PositionY] // 位置
export type PositionStr = `${PositionX},${PositionY}` // 位置（字符串形式）

export enum Direction { // 方向
    None,
    Top,
    Right,
    Bottom,
    Left,
}

export enum RotationDirection { // 旋转方向
    Clockwise = 1, // 顺时针
    Anticlockwise = 2, // 逆时针
}

export enum PathDirection { // 路径方向
    None,
    Horizontal,
    Vertical,
    TopLeft,
    TopRight,
    BottomLeft,
    BottomRight,
}

export interface Vector { // 向量
    position: Position,
    direction: Direction,
}

export enum GridType { // 网格类型
    Outer = -1, // -1（地图外）
    Space, // 0（空地）
    Barrier, // 1（障碍物）
}
export interface Grid { // 网格
    position: Position,
    type: GridType,
    count?: number, // 计数（记录当前网格被多少个实体占用）
    visited?: boolean, // 是否已被访问
}

export enum ModelType { // 模型类型
    Hollow, // 0（空心）
    Solid, // 1（实体）
}

export interface Player extends Vector { // 玩家
    id: string,
}
export interface Bot extends Vector { // 电脑玩家
    id: string,
}
export interface Monster extends Vector { // 怪物
    id: string,
}
export interface MPlayer extends Player { // 玩家（带模型）
    model: ModelType[][],
}
export interface MBot extends Bot { // 电脑玩家（带模型）
    model: ModelType[][],
}
export interface MMonster extends Monster { // 怪物（带模型）
    model: ModelType[][],
}

export interface Path { // 路径
    [key: PositionStr]: PathDirection,
}
export interface Route { // 路线
    start: Position | null, // 起点
    end: Position | null, // 终点
    path: Path,
}
