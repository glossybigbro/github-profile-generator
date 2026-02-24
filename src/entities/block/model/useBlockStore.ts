import { create } from 'zustand'
import { temporal } from 'zundo'
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
    addBlockAtCursor: (block: Block) => void
    insertBlockAfter: (prevBlockId: string, newBlock: Block, shouldFocus?: boolean) => void
    removeBlock: (blockId: string) => void
    updateBlock: (blockId: string, updates: Partial<Block>) => void
    turnIntoBlock: (blockId: string, newTypeBlock: Block, maintainContent?: boolean) => void
    setActiveBlock: (blockId: string | null) => void
    setCursorPosition: (position: number | null) => void
    toggleMode: () => void
    reorderBlocks: (newBlocks: Block[]) => void

    // Bulk Actions
    removeBlocks: (blockIds: string[]) => void
    duplicateBlocks: (blockIds: string[]) => void

    // Transaction Actions
    addBlocks: (blocks: Block[], position?: number, shouldFocus?: boolean) => void
    removeBlocksByPreviewId: (previewId: string, restoreEmptyBlock?: boolean) => void
    replaceBlocksByPreviewId: (previewId: string, newBlocks: Block[]) => void
    commitPreviewBlocks: (previewId: string) => void
}

// Deep Content Equality Helper specifically designed to ignore non-content state changes (e.g., activeBlockId, selection states)
const areBlocksEqual = (blocksA: Block[] | undefined, blocksB: Block[] | undefined): boolean => {
    if (!blocksA || !blocksB) return false
    if (blocksA.length !== blocksB.length) return false

    for (let i = 0; i < blocksA.length; i++) {
        const a = blocksA[i]
        const b = blocksB[i]

        if (a.id !== b.id) return false
        if (a.type !== b.type) return false

        // Fast shallow check for content
        if ('content' in a && 'content' in b && a.content !== b.content) return false

        // Detailed check for widgets
        if (a.type === 'widget' && b.type === 'widget') {
            if ((a as any).widgetType !== (b as any).widgetType) return false
            if (JSON.stringify((a as any).config) !== JSON.stringify((b as any).config)) return false
        }
    }
    return true
}

export const useBlockStore = create<BlockStore>()(
    temporal(
        (set, get) => {
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
                cursorPosition: null,
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

                    let targetIndex = state.activeBlockId ? newBlocks.findIndex(b => b.id === state.activeBlockId) : -1;

                    // Fallback to the last block if no valid active block exists
                    if (targetIndex === -1 && newBlocks.length > 0) {
                        targetIndex = newBlocks.length - 1;
                    }

                    if (targetIndex !== -1) {
                        const targetBlock = newBlocks[targetIndex]

                        // If target block is empty text (or just whitespace), replace it
                        if (targetBlock.type === 'text' && 'content' in targetBlock && (!targetBlock.content || targetBlock.content.trim() === '')) {
                            newBlocks.splice(targetIndex, 1, block) // Replace
                            insertPosition = targetIndex
                        } else {
                            // Otherwise insert after
                            newBlocks.splice(targetIndex + 1, 0, block)
                            insertPosition = targetIndex + 1
                        }
                    } else {
                        // Empty document (shouldn't happen due to fallback, but safe)
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
                    // Reset cursorPosition when switching to a different block.
                    // This prevents the stale cursor offset of the previous block from being applied.
                    // The null fallback causes the cursor to go to end-of-text when the block is focused.
                    const cursorReset = id !== state.activeBlockId ? { cursorPosition: null } : {}
                    return { activeBlockId: id, ...cursorReset }
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
                    let isActiveBlockRemoved = false

                    if (position === undefined) {
                        let targetIndex = state.activeBlockId ? currentBlocks.findIndex(b => b.id === state.activeBlockId) : -1;

                        // Fallback to the last block if no valid active block exists
                        if (targetIndex === -1 && currentBlocks.length > 0) {
                            targetIndex = currentBlocks.length - 1;
                        }

                        if (targetIndex !== -1) {
                            const targetBlock = currentBlocks[targetIndex]
                            if (targetBlock.type === 'text' && (!targetBlock.content || (targetBlock as any).content.trim() === '')) {
                                currentBlocks.splice(targetIndex, 1) // Remove empty block
                                effectivePosition = targetIndex
                                isActiveBlockRemoved = true
                            } else {
                                // If not empty, insert after target block
                                effectivePosition = targetIndex + 1
                            }
                        }
                    }

                    currentBlocks.splice(effectivePosition, 0, ...newBlocks)

                    // Focus the LAST inserted block to intuitively continue writing after paste
                    const newActiveBlockId = shouldFocus && newBlocks.length > 0
                        ? newBlocks[newBlocks.length - 1].id
                        : (isActiveBlockRemoved ? null : state.activeBlockId)

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
                }),

                commitPreviewBlocks: (previewId) => set((state) => ({
                    blocks: state.blocks.map(b => {
                        if (b.previewId === previewId) {
                            const { previewId: _, ...rest } = b
                            return rest as Block
                        }
                        return b
                    })
                }))
            }
        },
        {
            partialize: (state) => ({
                blocks: state.blocks,
                activeBlockId: state.activeBlockId,
                cursorPosition: state.cursorPosition
            }),
            limit: 100,
            handleSet: (handleSet) => {
                let timeout: ReturnType<typeof setTimeout> | null = null;
                let lastSaveTime = Date.now();
                let lastBlocksRef: Block[] | null = null;
                let lastBlocksLength: number | null = null;
                let originalPastState: any = null;
                // ★ 핵심 변수: 미리보기(Preview)가 뜨기 직전의 "깨끗한 상태"를 보관합니다.
                // 위젯 확정(Commit) 시 이 상태를 Zundo 히스토리에 넣어야
                // Undo했을 때 미리보기 상태가 아닌, 위젯이 없던 원래 상태로 돌아갑니다.
                let prePreviewState: any = null;

                return (...args: any[]) => {
                    const now = Date.now();

                    const pastState = args[0] as any;
                    const currentState = (args.length > 2 ? args[2] : args[0]) as any;

                    const pastHadPreviews = pastState?.blocks?.some((b: any) => b.previewId);
                    const currentHasPreviews = currentState?.blocks?.some((b: any) => b.previewId);

                    // ── 1단계: 기준점(Baseline) 초기화 ──
                    // 처음 실행될 때 pastState를 기준으로 잡되, 미리보기 상태는 절대 기준으로 삼지 않습니다.
                    if (lastBlocksRef === null && !pastHadPreviews) {
                        lastBlocksRef = pastState?.blocks ?? []
                        lastBlocksLength = pastState?.blocks?.length ?? 0
                    }

                    // ── 2단계: 미리보기 상태는 히스토리에서 완전 무시 ──
                    // 단, 미리보기가 처음 뜨는 순간에 "직전의 깨끗한 상태"를 보관해 둡니다.
                    if (currentHasPreviews) {
                        // 미리보기가 막 시작된 순간: pastState는 아직 깨끗함 → 보관
                        if (!pastHadPreviews && !prePreviewState) {
                            prePreviewState = pastState;
                        }
                        return;
                    }

                    // ── 3단계: 위젯 확정(Commit) 감지 ──
                    const isCommitAction = pastHadPreviews && !currentHasPreviews;

                    // ── 4단계: 내용이 실제로 바뀌지 않았으면 무시 ──
                    if (!isCommitAction && areBlocksEqual(currentState?.blocks, lastBlocksRef ?? undefined)) {
                        return;
                    }

                    // ── 5단계: 타이핑 묶음을 위해 첫 번째 pastState 보관 ──
                    if (!timeout && !originalPastState) {
                        originalPastState = pastState;
                    }

                    const isStructuralChange =
                        currentState?.blocks?.length !== lastBlocksLength ||
                        isCommitAction;

                    // ── 6단계: 즉시 저장 (구조 변경, 위젯 확정, 800ms 초과) ──
                    if (isStructuralChange || now - lastSaveTime > 800) {
                        const modifiedArgs = [...args];
                        // ★ 위젯 확정 시: pastState에는 previewId가 포함되어 있으므로
                        //   반드시 미리보기 직전의 깨끗한 상태(prePreviewState)를 사용합니다.
                        //   이래야 Undo했을 때 위젯이 없던 원래 화면으로 돌아갑니다.
                        if (isCommitAction && prePreviewState) {
                            modifiedArgs[0] = prePreviewState;
                        } else {
                            modifiedArgs[0] = originalPastState || pastState;
                        }

                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-ignore
                        handleSet(...modifiedArgs);
                        lastSaveTime = now;
                        lastBlocksLength = currentState?.blocks?.length ?? 0;
                        lastBlocksRef = currentState?.blocks ?? [];
                        if (timeout) clearTimeout(timeout);
                        timeout = null;
                        originalPastState = null;
                        prePreviewState = null;
                        return;
                    }

                    if (timeout) clearTimeout(timeout);

                    // ── 7단계: 타이핑 디바운스 (400ms 후 저장) ──
                    timeout = setTimeout(() => {
                        const modifiedArgs = [...args];
                        modifiedArgs[0] = originalPastState || pastState;

                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-ignore
                        handleSet(...modifiedArgs);
                        lastSaveTime = Date.now();
                        lastBlocksLength = currentState?.blocks?.length ?? 0;
                        lastBlocksRef = currentState?.blocks ?? [];
                        timeout = null;
                        originalPastState = null;
                    }, 400);
                }
            }
        }
    )
)
