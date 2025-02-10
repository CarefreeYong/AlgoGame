/// <reference types="vite/client" />

declare module '*.vue' {
    import type { DefineComponent } from 'vue'

    // eslint-disable-next-line ts/no-empty-object-type
    const Component: DefineComponent<{}, {}, any> = {}
    export default Component
}
