import { useMemo, useCallback, useEffect } from 'react'
import { useCanvasEditor } from './useCanvasEditor'
import { useSlashMenuLogic } from '@/features/slash-command/model/useSlashMenuLogic'
import { useSlashNavigation } from '@/features/slash-command/model/useSlashNavigation'
import { SLASH_MENU_ITEMS } from '@/entities/block/config/constants'
import { Block } from '@/entities/block/model/types'
import { useBlockStore } from '@/entities/block/model/useBlockStore'
import { copyBlocksToClipboard, getBlockClipboard, clearBlockClipboard } from '@/entities/block/model/blockClipboard'
import { useSelectionStore } from '@/entities/block/model/useSelectionStore'
import { BLOCK_BEHAVIORS } from '@/entities/block/lib/blockBehaviors'

export function useCanvasLogic() {
    // 1. Core Editor Logic
    const editor = useCanvasEditor()
    const {
        blocks,
        activeBlockId,
        mode,
        toggleMode,
        updateBlock,
        setActiveBlock,
        insertBlockAfter,
        addBlock,
        removeBlock,
        removeBlocks,
        duplicateBlocks,
        turnIntoBlock,
        reorderBlocks
    } = editor

    // 2. Slash Menu Core Logic
    const {
        slashMenu,
        handleOpenSlashMenu,
        handleCloseSlashMenu,
        handleSlashItemHover,
        executeSlashAction,
        setSlashMenu
    } = useSlashMenuLogic({ blocks, insertBlockAfter, turnIntoBlock })

    // 3. Command Items Construction (Business Logic)
    const slashItems = useMemo(() => {
        return SLASH_MENU_ITEMS.map(item => ({
            ...item,
            action: () => {
                switch (item.id) {
                    case 'text': executeSlashAction('text'); break;
                    case 'h1': executeSlashAction('header', 1); break;
                    case 'h2': executeSlashAction('header', 2); break;
                    case 'h3': executeSlashAction('header', 3); break;
                    case 'divider': executeSlashAction('divider'); break;
                    // Defense: Handle unknown actions gracefully instead of console.log
                    default: break;
                }
            }
        }))
    }, [executeSlashAction])

    // 4. Keyboard Navigation Logic
    useSlashNavigation({
        isOpen: slashMenu.isOpen,
        selectedIndex: slashMenu.selectedIndex,
        itemsCount: slashItems.length,
        setSelectedIndex: (index) => setSlashMenu(prev => ({ ...prev, selectedIndex: index })),
        onExecute: (index) => {
            const item = slashItems[index]
            if (item && !item.disabled) {
                item.action()
            }
        },
        onClose: handleCloseSlashMenu
    })

    // 5. Intelligent Block Update (Logic Extraction)
    const handleBlockUpdate = useCallback((id: string, updates: Partial<Block>) => {
        updateBlock(id, updates)

        // Auto-monitor content changes to close slash menu if necessary
        if (slashMenu.isOpen && id === slashMenu.triggerBlockId) {
            // Safe access using type guard or 'in' operator if needed, but 'content' exists on all text-like blocks
            const content = (updates as any).content
            // If content is no longer the trigger character '/', close the menu
            if (content !== undefined && content !== '/') {
                handleCloseSlashMenu()
            }
        }
    }, [updateBlock, slashMenu.isOpen, slashMenu.triggerBlockId, handleCloseSlashMenu])

    const handleBackgroundClick = useCallback((e: React.MouseEvent) => {
        // 1. Slash Menu Handling
        if (slashMenu.isOpen) {
            handleCloseSlashMenu()
            return
        }

        // --- CRITICAL FIX: MULTI-BLOCK TEXT SELECTION ---
        // When a user mousedown's on Block A, drags, and mouseup's on Block B,
        // the browser fires a 'click' event on their most specific common ancestor (the Canvas).
        // We MUST NOT interpret this as a "background click" to reset focus, because it will destroy the text selection!
        const selection = window.getSelection()
        const isTextSelected = selection && selection.toString().length > 0
        if (isTextSelected) {
            return
        }

        // 2. Smart Focus Logic (Clicking empty space)
        // Ensure we clicked the container, not a child
        if (e.target !== e.currentTarget) return

        if (blocks.length > 0) {
            let nearestBlockId = blocks[0].id
            let minDistance = Infinity
            const clickY = e.clientY

            blocks.forEach(block => {
                const el = document.getElementById(`block-${block.id}`)
                if (el) {
                    const rect = el.getBoundingClientRect()
                    const centerY = rect.top + (rect.height / 2)
                    const distance = Math.abs(clickY - centerY)

                    if (distance < minDistance) {
                        minDistance = distance
                        nearestBlockId = block.id
                    }
                }
            })

            setActiveBlock(nearestBlockId)

            // Cursor Management: Set to End
            requestAnimationFrame(() => {
                const el = document.getElementById(`block-${nearestBlockId}`)
                if (el) {
                    el.focus()
                    const range = document.createRange()
                    range.selectNodeContents(el)
                    range.collapse(false)
                    const sel = window.getSelection()
                    sel?.removeAllRanges()
                    sel?.addRange(range)
                }
            })
        }
    }, [blocks, slashMenu.isOpen, handleCloseSlashMenu, setActiveBlock])

    // 6. Block Keyboard Shortcuts — fully SYNCHRONOUS so e.preventDefault() works
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement
            const isTyping = target.isContentEditable ||
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA'

            // Read store state synchronously
            const { selectedIds, clearSelection } = useSelectionStore.getState()
            const activeBlockId = useBlockStore.getState().activeBlockId
            const allBlocks = useBlockStore.getState().blocks

            const hasMultiSelection = selectedIds.size > 1

            // ─ Cmd+C: Copy ─
            // NOTE: handled BEFORE targetIds guard — text selection works regardless of activeBlockId
            if (e.key === 'c' && (e.metaKey || e.ctrlKey)) {
                const selection = window.getSelection()
                const hasTextSelection = !!selection?.toString().trim()

                if (hasTextSelection && !hasMultiSelection && selection && selection.rangeCount > 0) {
                    // Find ALL blocks that the text selection overlaps
                    const selRange = selection.getRangeAt(0)
                    const allDomBlocks = Array.from(document.querySelectorAll('[id^="block-"]'))
                    const intersectingBlocks = allDomBlocks.filter(el => selRange.intersectsNode(el))

                    if (intersectingBlocks.length > 0) {
                        const copiedBlocks: Block[] = []

                        for (let i = 0; i < intersectingBlocks.length; i++) {
                            const blockEl = intersectingBlocks[i]
                            const blockId = blockEl.id.replace('block-', '')
                            const sourceBlock = allBlocks.find(b => b.id === blockId)
                            if (!sourceBlock) continue

                            // 1. Find the exact text selected within THIS block
                            const blockRange = document.createRange()
                            blockRange.selectNodeContents(blockEl)

                            const intersectionRange = document.createRange()

                            // Match Start Boundary
                            if (selRange.compareBoundaryPoints(Range.START_TO_START, blockRange) > 0) {
                                intersectionRange.setStart(selRange.startContainer, selRange.startOffset)
                            } else {
                                intersectionRange.setStart(blockRange.startContainer, blockRange.startOffset)
                            }

                            // Match End Boundary
                            if (selRange.compareBoundaryPoints(Range.END_TO_END, blockRange) < 0) {
                                intersectionRange.setEnd(selRange.endContainer, selRange.endOffset)
                            } else {
                                intersectionRange.setEnd(blockRange.endContainer, blockRange.endOffset)
                            }

                            // Locate the block's specific copy behavior strategy
                            const behavior = BLOCK_BEHAVIORS[sourceBlock.type] || BLOCK_BEHAVIORS['text']
                            const selectedContent = behavior.serializeSelection(intersectionRange, sourceBlock, blockEl)

                            // 2. Apply Notion Logic
                            if (i === 0) {
                                // First Block: Check if selection starts at the very beginning
                                const preSelectionRange = document.createRange()
                                preSelectionRange.setStart(blockEl, 0)
                                try {
                                    preSelectionRange.setEnd(intersectionRange.startContainer, intersectionRange.startOffset)
                                } catch { /* ignore */ }

                                const startsAtBeginning = preSelectionRange.toString().trim().length === 0

                                if (startsAtBeginning) {
                                    // Preserve type
                                    copiedBlocks.push('content' in sourceBlock
                                        ? { ...sourceBlock, content: selectedContent } as Block
                                        : sourceBlock)
                                } else {
                                    // Starts mid-block.
                                    if (intersectingBlocks.length === 1) {
                                        // If only ONE block is selected, just clear clipboard and let browser natively copy text
                                        // so that pasting mid-sentence is seamless.
                                        clearBlockClipboard()
                                        return
                                    } else {
                                        // Multi-block: Downgrade first block to plain 'text' type
                                        copiedBlocks.push({
                                            ...sourceBlock,
                                            type: 'text',
                                            content: selectedContent
                                        } as Block)
                                    }
                                }
                            } else {
                                // Middle or Last Blocks: Always preserve their type because the selection naturally wraps them!
                                copiedBlocks.push('content' in sourceBlock
                                    ? { ...sourceBlock, content: selectedContent } as Block
                                    : sourceBlock)
                            }
                        }

                        if (copiedBlocks.length > 0) {
                            e.preventDefault()
                            copyBlocksToClipboard(copiedBlocks)
                        } else {
                            clearBlockClipboard()
                        }
                    } else {
                        clearBlockClipboard()
                    }
                    return
                }

                // No text selection (cursor only) or multi-selection → block copy by targetIds
                const targetIds: string[] = hasMultiSelection
                    ? Array.from(selectedIds)
                    : activeBlockId ? [activeBlockId] : []
                if (targetIds.length === 0) return
                e.preventDefault()
                copyBlocksToClipboard(allBlocks.filter(b => targetIds.includes(b.id)))
                if (hasMultiSelection) clearSelection()
                return
            }

            // For Duplicate / Delete, we need a valid targetIds
            const targetIds: string[] = hasMultiSelection
                ? Array.from(selectedIds)
                : activeBlockId ? [activeBlockId] : []
            if (targetIds.length === 0) return

            // ─ Cmd+D: Duplicate ─
            if (e.key === 'd' && (e.metaKey || e.ctrlKey) && !isTyping) {
                e.preventDefault()
                editor.duplicateBlocks(targetIds)
                clearSelection()
                return
            }

            // ─ Backspace / Delete: Delete (only when NOT in a text editing context) ─
            if ((e.key === 'Backspace' || e.key === 'Delete') && !isTyping) {
                e.preventDefault()
                editor.removeBlocks(targetIds)
                clearSelection()
                return
            }
        }

        window.addEventListener('keydown', handleGlobalKeyDown)
        return () => window.removeEventListener('keydown', handleGlobalKeyDown)
    }, [editor])


    return {
        // State
        blocks,
        activeBlockId,
        mode,
        slashMenu,
        slashItems,

        // Actions
        toggleMode,
        handleBlockUpdate,
        setActiveBlock,
        insertBlockAfter,
        addBlock,
        removeBlock,
        removeBlocks,
        duplicateBlocks,
        turnIntoBlock,
        reorderBlocks,
        handleOpenSlashMenu,
        handleCloseSlashMenu,
        handleSlashItemHover,
        handleBackgroundClick
    }
}
