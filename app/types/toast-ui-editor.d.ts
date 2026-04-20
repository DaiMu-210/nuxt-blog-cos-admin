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

