import { useMemo, useCallback, useEffect } from 'react'
import { useCanvasEditor } from './useCanvasEditor'
import { useSlashMenuLogic } from '@/features/slash-command/model/useSlashMenuLogic'
import { useSlashNavigation } from '@/features/slash-command/model/useSlashNavigation'
import { SLASH_MENU_ITEMS } from '@/entities/block/config/constants'
import { Block } from '@/entities/block/model/types'

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

    // 6. Bulk Actions Keyboard Listener
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            const { selectedIds, clearSelection } = import('@/entities/block/model/useSelectionStore').then(m => m.useSelectionStore.getState()) as any // We will import directly above
            // Use direct state read to avoid reactivity loops on every keydown
            import('@/entities/block/model/useSelectionStore').then(({ useSelectionStore }) => {
                const state = useSelectionStore.getState()
                if (state.selectedIds.size === 0) return

                const idsArray = Array.from(state.selectedIds)

                // Bulk Delete
                if (e.key === 'Backspace' || e.key === 'Delete') {
                    // Prevent default backspace navigation if somehow active
                    e.preventDefault()
                    editor.removeBlocks(idsArray)
                    state.clearSelection()
                }

                // Bulk Duplicate (Cmd/Ctrl + D)
                if (e.key === 'd' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault()
                    editor.duplicateBlocks(idsArray)
                    state.clearSelection()
                }
            })
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
        turnIntoBlock,
        reorderBlocks,
        handleOpenSlashMenu,
        handleCloseSlashMenu,
        handleSlashItemHover,
        handleBackgroundClick
    }
}
