declare module '@toast-ui/editor' {
  export type EditorOptions = Record<string, any>

  export default class Editor {
    constructor(options: EditorOptions)
    getMarkdown(): string
    setMarkdown(markdown: string, cursorToEnd?: boolean): void
    on(eventName: string, handler: (...args: any[]) => void): void
    destroy(): void
  }
}

declare module '@toast-ui/editor/dist/toastui-editor-viewer' {
  export type ViewerOptions = {
    el: HTMLElement
    initialValue?: string
  } & Record<string, any>

  export default class Viewer {
    constructor(options: ViewerOptions)
    setMarkdown?(markdown: string): void
    setContent?(markdown: string): void
    destroy?(): void
  }

  export { Viewer }
}
