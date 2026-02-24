import { create } from 'zustand'
import { Block, CanvasEditorState, EditorMode } from './types'
import { createTextBlock } from './blockUtils'

// Helper to sync the selection anchor when focus changes programmatically
const syncSelectionAnchor = (id: string | null) => {
    if (!id) return
    import('@/entities/block/model/useSelectionStore').then(m => {
        const store = m.useSelectionStore.getState()
        if (store.ignoreNextAnchorSync) {
            store.setIgnoreNextAnchorSync(false)
        } else {
            store.setLastSelectedId(id)
        }
    })
}

interface BlockStore extends CanvasEditorState {
    mode: EditorMode
    setMode: (mode: EditorMode) => void

    // Actions
    addBlock: (block: Block, position?: number, shouldFocus?: boolean) => void
    addBlockAtCursor: (block: Block) => void // Smart insertion at active block position
    insertBlockAfter: (prevBlockId: string, newBlock: Block, shouldFocus?: boolean) => void
    removeBlock: (blockId: string) => void
    updateBlock: (blockId: string, updates: Partial<Block>) => void
    turnIntoBlock: (blockId: string, newTypeBlock: Block, maintainContent?: boolean) => void
    setActiveBlock: (blockId: string | null) => void
    setCursorPosition: (position: number) => void
    toggleMode: () => void
    reorderBlocks: (newBlocks: Block[]) => void

    // Bulk Actions
    removeBlocks: (blockIds: string[]) => void
    duplicateBlocks: (blockIds: string[]) => void

    // Transaction Actions
    addBlocks: (blocks: Block[], position?: number, shouldFocus?: boolean) => void
    removeBlocksByPreviewId: (previewId: string, restoreEmptyBlock?: boolean) => void
    replaceBlocksByPreviewId: (previewId: string, newBlocks: Block[]) => void
}

export const useBlockStore = create<BlockStore>((set, get) => {
    // Helper: Ensure empty line after widget if it's the last block
    const ensureEmptyLineAfterWidget = (blocks: Block[]): Block[] => {
        if (blocks.length === 0) return blocks

        const lastBlock = blocks[blocks.length - 1]

        // The canvas must ALWAYS end with an empty text block.
        // This ensures the user can always click/type at the bottom.
        const isLastBlockEmpty =
            lastBlock.type === 'text' &&
            'content' in lastBlock &&
            !(lastBlock as any).content?.trim()

        if (!isLastBlockEmpty) {
            return [
                ...blocks,
                {
                    id: `block-${Date.now()}-auto-empty`,
                    type: 'text',
                    content: '',
                    createdAt: Date.now()
                } as Block
            ]
        }

        return blocks
    }

    return {
        // Initial State
        blocks: [createTextBlock()],
        activeBlockId: null,
        cursorPosition: 1,
        mode: 'edit',

        setMode: (mode) => set({ mode }),

        // Actions
        addBlock: (block, position, shouldFocus = true) => set((state) => {
            const newBlocks = [...state.blocks]
            const insertPosition = position ?? state.cursorPosition ?? newBlocks.length
            newBlocks.splice(insertPosition, 0, block)

            return {
                blocks: ensureEmptyLineAfterWidget(newBlocks),
                cursorPosition: insertPosition + 1,
                activeBlockId: shouldFocus ? block.id : state.activeBlockId,
            }
        }),

        // Smart insertion at cursor position (replaces empty line or inserts after)
        addBlockAtCursor: (block) => set((state) => {
            let newBlocks = [...state.blocks]
            let insertPosition = newBlocks.length
            let newActiveBlockId = block.id

            if (state.activeBlockId) {
                const activeIndex = newBlocks.findIndex(b => b.id === state.activeBlockId)
                if (activeIndex !== -1) {
                    const activeBlock = newBlocks[activeIndex]

                    // If active block is empty text (or just whitespace), replace it
                    if (activeBlock.type === 'text' && 'content' in activeBlock && (!activeBlock.content || activeBlock.content.trim() === '')) {
                        newBlocks.splice(activeIndex, 1, block) // Replace
                        insertPosition = activeIndex
                    } else {
                        // Otherwise insert after
                        newBlocks.splice(activeIndex + 1, 0, block)
                        insertPosition = activeIndex + 1
                    }
                }
            } else {
                // No active block, append to end
                newBlocks.push(block)
                insertPosition = newBlocks.length - 1
            }

            return {
                blocks: ensureEmptyLineAfterWidget(newBlocks),
                activeBlockId: newActiveBlockId,
                cursorPosition: insertPosition + 1
            }
        }),

        insertBlockAfter: (prevBlockId, newBlock, shouldFocus = true) => set((state) => {
            const index = state.blocks.findIndex(b => b.id === prevBlockId)
            if (index === -1) return state

            const newBlocks = [...state.blocks]
            newBlocks.splice(index + 1, 0, newBlock)

            if (shouldFocus) syncSelectionAnchor(newBlock.id)

            return {
                blocks: ensureEmptyLineAfterWidget(newBlocks),
                activeBlockId: shouldFocus ? newBlock.id : state.activeBlockId,
            }
        }),

        removeBlock: (blockId) => set((state) => {
            const index = state.blocks.findIndex(b => b.id === blockId)
            if (index === -1) return state

            // Check if it's a widget block and sync with profile store
            const blockToRemove = state.blocks[index]
            if (blockToRemove.type === 'widget') {
                const widgetType = (blockToRemove as any).widgetType
                if (widgetType) {
                    // Count how many widgets of this type exist (before removal)
                    const widgetCount = state.blocks.filter(
                        b => b.type === 'widget' && (b as any).widgetType === widgetType
                    ).length

                    // Only disable section if this is the LAST widget of this type
                    if (widgetCount === 1) {
                        // Import profile store dynamically to avoid circular dependencies
                        import('@/entities/profile/model/useProfileStore').then(({ useProfileStore }) => {
                            const profileState = useProfileStore.getState()
                            const section = profileState.sections.find(s => s.id === widgetType)
                            if (section?.enabled) {
                                profileState.toggleSection(widgetType)
                            }
                        })
                    }
                }
            }

            const prevBlockId = index > 0 ? state.blocks[index - 1].id : null
            const newBlocks = state.blocks.filter(b => b.id !== blockId)

            // Integrity Rule: Always keep at least one block
            if (newBlocks.length === 0) {
                const fallback = createTextBlock()
                syncSelectionAnchor(fallback.id)
                return {
                    blocks: [fallback],
                    activeBlockId: fallback.id
                }
            }

            const newActiveBlockId = state.activeBlockId === blockId ? prevBlockId : state.activeBlockId
            if (state.activeBlockId === blockId && prevBlockId) {
                syncSelectionAnchor(prevBlockId)
            }

            return {
                blocks: ensureEmptyLineAfterWidget(newBlocks),
                activeBlockId: newActiveBlockId
            }
        }),

        removeBlocks: (blockIds) => set((state) => {
            const idsToRemove = new Set(blockIds)
            let newBlocks = state.blocks.filter(b => !idsToRemove.has(b.id))

            // Integrity Rule: Always keep at least one block
            let newActiveId = state.activeBlockId
            if (newBlocks.length === 0) {
                const fallback = createTextBlock()
                newBlocks = [fallback]
                newActiveId = fallback.id
                syncSelectionAnchor(fallback.id)
            } else if (newActiveId && idsToRemove.has(newActiveId)) {
                // If active block was removed, just clear focus (Selection Box should remain primary UX)
                newActiveId = null
                syncSelectionAnchor(null)
            }

            return {
                blocks: ensureEmptyLineAfterWidget(newBlocks),
                activeBlockId: newActiveId
            }
        }),

        duplicateBlocks: (blockIds) => set((state) => {
            if (blockIds.length === 0) return state

            const idsToDuplicate = new Set(blockIds)
            const newBlocks = [...state.blocks]

            // Find the index of the LAST block in the selection, so we know where to insert duplicates
            let lastSelectedIndex = -1
            for (let i = state.blocks.length - 1; i >= 0; i--) {
                if (idsToDuplicate.has(state.blocks[i].id)) {
                    lastSelectedIndex = i
                    break
                }
            }

            if (lastSelectedIndex === -1) return state

            // Collect all blocks to duplicate IN THE ORDER they appear in the document
            const blocksToClone = state.blocks.filter(b => idsToDuplicate.has(b.id))

            const clonedBlocks: Block[] = blocksToClone.map(b => ({
                ...b, // Copy all properties
                id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Generate new ID
                createdAt: Date.now()
            }))

            // Insert immediately after the last selected block
            newBlocks.splice(lastSelectedIndex + 1, 0, ...clonedBlocks)

            return {
                blocks: ensureEmptyLineAfterWidget(newBlocks),
                // UX: Select the newly duplicated blocks? Or just leave them.
                // Let's rely on the caller to update selection store if needed.
            }
        }),

        updateBlock: (blockId, updates) => set((state) => ({
            blocks: state.blocks.map(b =>
                b.id === blockId ? { ...b, ...updates } as Block : b
            )
        })),

        turnIntoBlock: (blockId, newTypeBlock, maintainContent = true) => set((state) => {
            const index = state.blocks.findIndex(b => b.id === blockId)
            if (index === -1) return state

            const original = state.blocks[index]
            const newBlocks = [...state.blocks]

            const content = maintainContent
                ? (original as any).content || ''
                : (newTypeBlock as any).content || ''

            const transformed = {
                ...newTypeBlock,
                id: original.id,
                content,
                createdAt: original.createdAt
            }

            newBlocks[index] = transformed

            syncSelectionAnchor(original.id)

            return {
                blocks: newBlocks,
                activeBlockId: original.id
            }
        }),

        setActiveBlock: (id, syncAnchor = true) => set((state) => {
            // Guarantee that the focused block is ALWAYS the anchor point for a subsequent Shift+Click
            // UNLESS syncAnchor is explicitly false (e.g. during a Shift+Click range selection itself)
            if (id !== state.activeBlockId && syncAnchor) {
                syncSelectionAnchor(id)
            }
            return { activeBlockId: id }
        }),
        setCursorPosition: (pos) => set({ cursorPosition: pos }),
        toggleMode: () => set((state) => ({ mode: state.mode === 'edit' ? 'preview' : 'edit' })),
        reorderBlocks: (newBlocks) => set({ blocks: ensureEmptyLineAfterWidget(newBlocks) }),

        // Transaction Actions for Multi-Block Previews (e.g., Bio)
        addBlocks: (newBlocks, position, shouldFocus = true) => set((state) => {
            const currentBlocks = [...state.blocks]
            const insertPosition = position ?? state.cursorPosition ?? currentBlocks.length

            // If active block is empty text, replace it instead of inserting after
            let effectivePosition = insertPosition
            if (state.activeBlockId) {
                const activeIndex = currentBlocks.findIndex(b => b.id === state.activeBlockId)
                if (activeIndex !== -1) {
                    const activeBlock = currentBlocks[activeIndex]
                    if (activeBlock.type === 'text' && (!activeBlock.content || (activeBlock as any).content.trim() === '')) {
                        currentBlocks.splice(activeIndex, 1) // Remove empty block
                        effectivePosition = activeIndex
                    } else {
                        // If not empty, insert after active block
                        effectivePosition = activeIndex + 1
                    }
                }
            }

            currentBlocks.splice(effectivePosition, 0, ...newBlocks)

            // Focus the LAST inserted block to intuitively continue writing after paste
            const newActiveBlockId = shouldFocus && newBlocks.length > 0
                ? newBlocks[newBlocks.length - 1].id
                : state.activeBlockId

            if (shouldFocus && newBlocks.length > 0) {
                syncSelectionAnchor(newBlocks[newBlocks.length - 1].id)
            }

            return {
                blocks: ensureEmptyLineAfterWidget(currentBlocks),
                activeBlockId: newActiveBlockId,
                cursorPosition: effectivePosition + newBlocks.length
            }
        }),

        removeBlocksByPreviewId: (previewId, restoreEmptyBlock = false) => set((state) => {
            const firstIndex = state.blocks.findIndex(b => b.previewId === previewId)
            const newBlocks = state.blocks.filter(b => b.previewId !== previewId)

            // If all blocks were removed (empty doc), restore a text block
            if (newBlocks.length === 0) {
                const fallback = createTextBlock()
                syncSelectionAnchor(fallback.id)
                return {
                    blocks: [fallback],
                    activeBlockId: fallback.id,
                    cursorPosition: 1
                }
            }

            // Restore empty block if requested
            if (restoreEmptyBlock && firstIndex !== -1) {
                const emptyBlock = createTextBlock()
                // Insert at the position where the blocks were removed
                newBlocks.splice(firstIndex, 0, emptyBlock)

                return {
                    blocks: ensureEmptyLineAfterWidget(newBlocks),
                    activeBlockId: emptyBlock.id
                }
            }

            // Find where to focus? Ideally the block before the removed section.
            // For now, let's just keep the last remaining block active if the active one was removed.
            const isActiveRemoved = !newBlocks.find(b => b.id === state.activeBlockId)
            let newActiveId = state.activeBlockId

            if (isActiveRemoved) {
                // If we removed the active block, focus the last block of the document
                newActiveId = newBlocks[newBlocks.length - 1].id
            }

            return {
                blocks: ensureEmptyLineAfterWidget(newBlocks),
                activeBlockId: newActiveId
            }
        }),

        replaceBlocksByPreviewId: (previewId, newBlocks) => set((state) => {
            // Find the index of the first block with this previewId
            const startIndex = state.blocks.findIndex(b => b.previewId === previewId)

            if (startIndex === -1) {
                // If not found, just append (fallback, though unlikely in preview flow)
                return {
                    blocks: ensureEmptyLineAfterWidget([...state.blocks, ...newBlocks])
                }
            }

            // Filter out old blocks
            const blocksWithoutOld = state.blocks.filter(b => b.previewId !== previewId)

            // Insert new blocks at the same start index
            // Note: Since we removed blocks, the indices shifted. But startIndex is relative to the *original* array.
            // wait, if we filter, the indices shift.
            // Correct logic:
            // 1. Split into [before] and [after] relative to the preview group.
            // Since preview blocks are contiguous, we can just find the range.

            const firstBlockIndex = state.blocks.findIndex(b => b.previewId === previewId)
            // If we assume contiguous (which they should be for a preview), this is safe.
            // Actually, safest is to filter, but we need to know WHERE to insert.

            // Let's rely on the fact that for a preview, they are inserted together.
            // So we find the index of the first one.

            const preBlocks = state.blocks.slice(0, firstBlockIndex)
            // Post blocks are those after the preview group.
            // We can't use slice because we don't know the end index easily without iteration.
            // Simply: filter blocks that are NOT the previewId, but we need to split them.

            // Robust way:
            const filteredBlocks = state.blocks.filter(b => b.previewId !== previewId)

            // Insert at firstBlockIndex.
            // NOTE: If firstBlockIndex is > filteredBlocks.length, it means we were at the end.
            const insertIndex = Math.min(firstBlockIndex, filteredBlocks.length)

            const finalBlocks = [...filteredBlocks]
            finalBlocks.splice(insertIndex, 0, ...newBlocks)

            return {
                blocks: ensureEmptyLineAfterWidget(finalBlocks)
            }
        })
    }
})
