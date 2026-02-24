// Block 타입 정의
export type BlockType = 'header' | 'text' | 'bullet' | 'divider' | 'widget'

export interface BaseBlock {
    id: string
    type: BlockType
    createdAt: number
    previewId?: string // For transaction-based preview tracking
    style?: React.CSSProperties // Custom per-block styling (e.g. spacing)
}

export interface HeaderBlock extends BaseBlock {
    type: 'header'
    level: 1 | 2 | 3
    content: string
}

export interface TextBlock extends BaseBlock {
    type: 'text'
    content: string
}

export interface DividerBlock extends BaseBlock {
    type: 'divider'
}

export interface BulletBlock extends BaseBlock {
    type: 'bullet'
    content: string
    indent: number // 0 = top-level, 1+ = nested (supports Tab/Shift+Tab)
}

// 추후 확장을 위한 Widget 블록 (Phase 3)
export interface WidgetBlock extends BaseBlock {
    type: 'widget'
    widgetType: string
    config: Record<string, unknown>
}

export type Block = HeaderBlock | TextBlock | BulletBlock | DividerBlock | WidgetBlock

// Canvas Editor State
export interface CanvasEditorState {
    blocks: Block[]
    activeBlockId: string | null
    cursorPosition: number
}

// Editor Actions (inferred from the user's change request)
export interface EditorActions {
    removeBlock: (blockId: string) => void
    updateBlock: (blockId: string, updates: Partial<Block>) => void
    turnIntoBlock: (blockId: string, newTypeBlock: Block, maintainContent?: boolean) => void
    setActiveBlock: (blockId: string | null, syncAnchor?: boolean) => void
    setCursorPosition: (position: number) => void
}

// Mode
export type EditorMode = 'edit' | 'preview'

// Extensible Behavior Interfaces
export interface BlockCopyBehavior {
    /**
     * Serializes a visual DOM selection into the clipboard plain text (e.g., Markdown).
     * @param range - The partial or full DOM intersection Range of the drag selection covering this block element.
     * @param block - The actual state object of the Block being copied.
     * @param blockElement - The root DOM element of the block.
     * @returns The extracted Markdown or serialized format for the clipboard.
     */
    serializeSelection: (range: Range, block: Block, blockElement: Element) => string
}
