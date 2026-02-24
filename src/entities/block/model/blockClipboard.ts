import { Block } from './types'

// Module-level clipboard shared across the entire editor session
let _blockClipboard: Block[] = []

export const copyBlocksToClipboard = (blocks: Block[]) => {
    _blockClipboard = blocks
    // Write plain text to system clipboard for external app compatibility
    const plainText = blocks
        .map(b => ('content' in b ? (b as any).content || '' : `[${(b as any).widgetType || b.type}]`))
        .join('\n')
    navigator.clipboard.writeText(plainText).catch(() => { })
}

export const getBlockClipboard = (): Block[] => _blockClipboard

export const clearBlockClipboard = () => {
    _blockClipboard = []
}
