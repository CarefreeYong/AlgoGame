// 在提交前提示是否更新版本，并根据选择的版本指令对相关配置文件进行修改（更新版本信息）

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import select, { Separator } from '@inquirer/select'

interface Version { // 版本信息
    readonly tuple: [number, number, number, number],
    readonly name: string,
    readonly code: number,
}
enum VersionId { // 版本标识
    Major = 'major',
    Minor = 'minor',
    Patch = 'patch',
    Release = 'release',
}
enum PreId { // 预发布版本标识
    Alpha = 'alpha',
    Beta = 'beta',
    RC = 'rc',
}
enum VersionCommand { // 版本指令
    NotUpdate = 'not update',
    Major = 'major',
    MajorAlpha = 'major:alpha',
    MajorBeta = 'major:beta',
    MajorRC = 'major:rc',
    Minor = 'minor',
    MinorAlpha = 'minor:alpha',
    MinorBeta = 'minor:beta',
    MinorRC = 'minor:rc',
    Patch = 'patch',
    PatchAlpha = 'patch:alpha',
    PatchBeta = 'patch:beta',
    PatchRC = 'patch:rc',
    // Release = 'release',
    ReleaseAlpha = 'release:alpha',
    ReleaseBeta = 'release:beta',
    ReleaseRC = 'release:rc',
}
interface VersionChoice { // 版本选项
    name: string,
    value: VersionCommand,
    description: string,
}
interface File { // 配置文件
    path: string,
    content: (path: string, newVersion: Version) => string,
}

const version: Version = { tuple: [1, 0, 1, -1], name: '1.0.1', code: 2 } // !important: 项目当前版本，由 createSelect.onSelected 执行修改操作，非特殊需要不建议手动修改
const versionIds: VersionId[] = Object.values(VersionId)
const preIds: PreId[] = Object.values(PreId)
const versionCommands: VersionCommand[] = Object.values(VersionCommand)

// 获取新版本信息
const getNewVersion = (command: VersionCommand, oldVersion: Version): Version => {
    const versionIdToTupleIndexMap = new Map<VersionId, number>([
        [VersionId.Major, 0],
        [VersionId.Minor, 1],
        [VersionId.Patch, 2],
        [VersionId.Release, 3],
    ])
    const [versionId, preId] = (command as string).split(':') as [VersionId | void, PreId | void]
    const hasVersionId = !!versionId && versionIds.includes(versionId)
    const hasPreId = !!preId && preIds.includes(preId)

    if (hasVersionId) {
        const getNewTuple = (inputIndex: number, inputHasPreId: boolean): Version['tuple'] => oldVersion.tuple.map((item, index, arr) => {
            if (index === arr.length - 1) {
                return inputHasPreId
                    ? inputIndex === versionIdToTupleIndexMap.get(VersionId.Release) && oldVersion.name.includes(preId as string) ? item + 1 : 0
                    : -1
            } else {
                return index === inputIndex
                    ? item + 1
                    : index < inputIndex ? item : 0
            }
        }) as Version['tuple']
        const tuple = getNewTuple(versionIdToTupleIndexMap.get(versionId)!, hasPreId)
        const name = tuple.reduce(
            (result, item, index, arr) => arr[arr.length - 1]! < 0
                ? result += `${index === 0 || index === arr.length - 1 ? '' : '.'}${index === arr.length - 1 ? '' : item}`
                : result += `${index === 0 ? '' : '.'}${index === 2 ? `${item}-${preId as string}` : item}`,
            '',
        )
        const code = oldVersion.code + 1
        return { tuple, name, code }
    } else {
        return { ...oldVersion }
    }
}

// 创建终端 Select
const createSelect = async (onSelected: (answer: VersionCommand) => void): Promise<void> => {
    const choices: (VersionChoice | Separator)[] = versionCommands.map((item) => ({
        name: item,
        value: item,
        description: `${version.name} => ${getNewVersion(item, version).name}`,
    }))
    choices.push(new Separator())

    try {
        const answer = await select<VersionCommand>({
            message: `\x1B[0;33m本次提交是否更新版本（\x1B[0;34m--no-git-tag-version\x1B[0;33m），当前版本：\x1B[0;34m${version.name}\x1B[0;33m，可选择相应的指令进行更新：\x1B[0m`,
            choices,
            pageSize: choices.length,
            theme: {
                style: {
                    answer: (text: VersionCommand) => `\x1B[0;34m${text} => ${getNewVersion(text, version).name}\x1B[0m`,
                },
            },
        })
        onSelected(answer)
    } catch {}
}

// 选择版本指令后的回调，对相关配置文件进行修改（更新版本信息）
void createSelect((answer) => {
    if (answer === VersionCommand.NotUpdate) return
    const newVersion = getNewVersion(answer, version)
    const files: File[] = [
        {
            path: path.resolve(process.cwd(), './package-script-updateVersion.ts'),
            content: (path, { tuple, name, code }) => fs
                .readFileSync(path, 'utf8')
                .replaceAll(/const\s+version:\s+Version\s+=\s+\{(.*?)\}/g, (match, p1) => match.replace(p1 as string, ` tuple: [${tuple.join(', ')}], name: '${name}', code: ${code} `)),
        },
        {
            path: path.resolve(process.cwd(), './package.json'),
            content: (path, { name }) => fs
                .readFileSync(path, 'utf8')
                .replaceAll(/"version":\s*"(.*?)"/g, (match, p1) => match.replace(p1 as string, name)),
        },
        {
            path: path.resolve(process.cwd(), './src/manifest.json'),
            content: (path, { name, code }) => fs
                .readFileSync(path, 'utf8')
                .replaceAll(/"versionName":\s*"(.*?)"/g, (match, p1) => match.replace(p1 as string, name))
                .replaceAll(/"versionCode":\s*"(.*?)"/g, (match, p1) => match.replace(p1 as string, String(code))),
        },
    ]
    files.forEach(({ path, content }) => fs.writeFileSync(path, content(path, newVersion), 'utf8'))
})
