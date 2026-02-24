'use client'

import { Block } from '@/entities/block/model/types'
import { createTextBlock } from '@/entities/block/model/blockUtils'
import { HeaderBlock } from '@/entities/block/ui/HeaderBlock'
import { TextBlock } from '@/entities/block/ui/TextBlock'
import { DividerBlock } from '@/entities/block/ui/DividerBlock'
import { BulletBlock } from '@/entities/block/ui/BulletBlock/BulletBlock'
import { useBlockEvents } from '@/features/block-interaction/model/useBlockEvents'
import { BLOCK_TYPES } from '@/entities/block/config/constants'
import { WeeklyLanguagePreview } from '@/features/section-stats/ui/WeeklyLanguagePreview/WeeklyLanguagePreview'
import { WeeklyProjectsPreview } from '@/features/section-stats/ui/WeeklyProjectsPreview/WeeklyProjectsPreview'
import { ActivityGraphPreview } from '@/features/section-stats/ui/ActivityGraphPreview/ActivityGraphPreview'
import { ProductiveTimePreview } from '@/features/section-stats/ui/ProductiveTimePreview/ProductiveTimePreview'
import { markdownToHtml, htmlToMarkdown } from '@/shared/lib/markdown/simpleConverter'
import { copyBlocksToClipboard, getBlockClipboard } from '@/entities/block/model/blockClipboard'
import { SortableBlock } from '@/entities/block/ui/SortableBlock'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent,
    DragOverlay
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy
} from '@dnd-kit/sortable'
import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useSelectionStore } from '@/entities/block/model/useSelectionStore'
import { useBlockStore } from '@/entities/block/model/useBlockStore'
import styles from './GlassCanvas.module.css'

interface GlassCanvasProps {
    blocks: Block[]
    activeBlockId: string | null
    onUpdateBlock: (blockId: string, updates: Partial<Block>) => void
    onSetActiveBlock: (blockId: string | null) => void
    onInsertBlockAfter: (prevBlockId: string, newBlock: Block, shouldFocus?: boolean) => void
    onAddBlock: (block: Block, index?: number, shouldFocus?: boolean) => void
    onRemoveBlock: (blockId: string) => void
    onRemoveBlocks: (blockIds: string[]) => void
    onDuplicateBlocks: (blockIds: string[]) => void
    onTurnIntoBlock: (blockId: string, newTypeBlock: Block, maintainContent?: boolean) => void
    onOpenSlashMenu: (rect: DOMRect, blockId: string) => void
    onBackgroundClick: (e: React.MouseEvent) => void
    onReorderBlocks: (newBlocks: Block[]) => void
    isScrollLocked?: boolean
}

export function GlassCanvas({
    blocks,
    activeBlockId,
    onUpdateBlock,
    onSetActiveBlock,
    onInsertBlockAfter,
    onAddBlock,
    onRemoveBlock,
    onRemoveBlocks,
    onDuplicateBlocks,
    onTurnIntoBlock,
    onOpenSlashMenu,
    onBackgroundClick,
    onReorderBlocks,
    isScrollLocked = false,
}: GlassCanvasProps) {
    const [activeDragId, setActiveDragId] = useState<string | null>(null)
    const { selectedIds, setIsSelecting, setSelection, clearSelection } = useSelectionStore()

    // --- Drag to Select State ---
    const [selectionBox, setSelectionBox] = useState<{ startX: number, startY: number, currentX: number, currentY: number } | null>(null)
    const [dragOffsetY, setDragOffsetY] = useState(0)
    const [activeOverId, setActiveOverId] = useState<string | null>(null)
    const [dropDirection, setDropDirection] = useState<'top' | 'bottom'>('bottom')
    const canvasRef = React.useRef<HTMLDivElement>(null)
    // Track live pointer Y during drag
    const mouseYRef = React.useRef<number>(0)
    // Track current drop target ID independently of dnd-kit collision
    const activeOverIdRef = React.useRef<string | null>(null)

    const handlePointerDown = (e: React.PointerEvent) => {
        const target = e.target as HTMLElement
        const isInteractive = target.closest('button, a, input, [role="button"]')
        const isHandle = target.closest('[data-block-type]') // Drag handle wrapper

        // CRITERIA FOR SELECTION MODES:
        // 1. Start inside a block's TEXT AREA -> Native Text Selection.
        // 2. Start on empty space (or right/left block margins) -> Block Selection (Selection Box).
        const isTextArea = target.closest('[data-placeholder]') !== null

        const startX = e.clientX
        const startY = e.clientY
        let isBlockSelecting = false

        // BUG: We were clearing the selection EVERY TIME the user clicked the mouse down,
        // even if they were just clicking into a text block to start dragging text.
        // FIX: ONLY clear the Blue Block Selection state if we click EMPTY space without modifiers.
        // DO NOT clear if they are clicking a handle to start a multi-drag!
        if (!isTextArea && !isHandle && !e.metaKey && !e.shiftKey && !e.ctrlKey) {
            clearSelection()
        }

        const handleGlobalPointerMove = (moveEvent: PointerEvent) => {
            const dx = Math.abs(moveEvent.clientX - startX)
            const dy = Math.abs(moveEvent.clientY - startY)

            // ONLY trigger Selection Box if starting from EMPTY SPACE or MARGINS
            if (!isBlockSelecting && !isTextArea && (dx > 3 || dy > 3)) {
                isBlockSelecting = true
                setIsSelecting(true)
                document.body.style.userSelect = 'none' // Prevent native text highlighting
                window.getSelection()?.removeAllRanges() // Clear accidental text selection
            }

            if (isBlockSelecting) {
                setSelectionBox({
                    startX,
                    startY,
                    currentX: moveEvent.clientX,
                    currentY: moveEvent.clientY
                })
                calculateIntersections(startX, startY, moveEvent.clientX, moveEvent.clientY)
            } else if (isTextArea && (dx > 3 || dy > 3)) {
                // NATIVE TEXT SELECTION MODE
                // FIX: Browsers sandbox native text selection to a single `contenteditable=true` div.
                // If a user drags to another block, the selection gets stuck. ("드래그해서 선택이 한줄밖에 안돼")
                // We use document.caretRangeFromPoint to manually break the sandbox and extend selection!
                const sel = window.getSelection()
                if (sel && sel.anchorNode && typeof document !== 'undefined') {
                    let range: Range | null = null
                    if (document.caretRangeFromPoint) {
                        range = document.caretRangeFromPoint(moveEvent.clientX, moveEvent.clientY)
                    } else if ((document as any).caretPositionFromPoint) {
                        const pos = (document as any).caretPositionFromPoint(moveEvent.clientX, moveEvent.clientY)
                        if (pos) {
                            range = document.createRange()
                            range.setStart(pos.offsetNode, pos.offset)
                        }
                    }

                    if (range && range.startContainer) {
                        const anchorElement = sel.anchorNode.nodeType === Node.TEXT_NODE
                            ? sel.anchorNode.parentElement
                            : sel.anchorNode as HTMLElement
                        const currentElement = range.startContainer.nodeType === Node.TEXT_NODE
                            ? range.startContainer.parentElement
                            : range.startContainer as HTMLElement

                        const anchorBlock = anchorElement?.closest('.block-wrapper-with-handle')
                        const currentBlock = currentElement?.closest('.block-wrapper-with-handle')

                        // If we dragged OUTSIDE the original block, force the browser to extend the text selection natively!
                        if (anchorBlock && currentBlock && anchorBlock !== currentBlock) {
                            sel.setBaseAndExtent(sel.anchorNode, sel.anchorOffset, range.startContainer, range.startOffset)
                        }
                    }
                }
            }
        }

        const handleGlobalPointerUp = () => {
            cleanup()
        }

        const cleanup = () => {
            window.removeEventListener('pointermove', handleGlobalPointerMove)
            window.removeEventListener('pointerup', handleGlobalPointerUp)

            if (isBlockSelecting) {
                document.body.style.userSelect = ''
                setIsSelecting(false)
                setSelectionBox(null)
            }
        }

        // If clicking a drag handle, let dnd-kit handle the entire pointer lifecycle.
        // Attaching global pointer events here conflicts with dnd-kit's drag sensors.
        if (!isHandle) {
            window.addEventListener('pointermove', handleGlobalPointerMove)
            window.addEventListener('pointerup', handleGlobalPointerUp)
        }
    }

    const calculateIntersections = (sx: number, sy: number, cx: number, cy: number) => {
        if (!canvasRef.current) return

        // Selection Box Rect
        const selLeft = Math.min(sx, cx)
        const selRight = Math.max(sx, cx)
        const selTop = Math.min(sy, cy)
        const selBottom = Math.max(sy, cy)

        const blockElements = canvasRef.current.querySelectorAll('.block-wrapper-with-handle')
        const intersectedIds: string[] = []

        blockElements.forEach(el => {
            const rect = el.getBoundingClientRect()

            // Check standard AABB (Axis-Aligned Bounding Box) intersection
            // FIX: For a single-column layout, if the user drags in the far left/right margins,
            // their selection box won't touch the block's physical X coordinates.
            // By ignoring `rect.left` and `rect.right`, dragging in the horizontal margins
            // will correctly select any blocks within that vertical Y space, just like Notion.
            const isIntersecting = !(
                rect.bottom < selTop ||
                rect.top > selBottom
            )

            if (isIntersecting) {
                // Determine blockId somehow. Assuming data-block-id is available or we can extract from DOM.
                // We should add data-block-id to SortableBlock to make this robust.
                const blockId = el.getAttribute('data-block-id')
                if (blockId) intersectedIds.push(blockId)
            }
        })

        if (intersectedIds.length > 0) {
            setSelection(intersectedIds)
        }
    }
    // -----------------------------

    // -----------------------------
    // Block Action Handlers (Single + Bulk)
    // -----------------------------
    const handleDeleteBlock = (blockId: string) => {
        const { selectedIds, clearSelection } = useSelectionStore.getState()

        // BULK: If the clicked block is part of a multi-selection, delete ALL selected
        if (selectedIds.size > 1 && selectedIds.has(blockId)) {
            onRemoveBlocks(Array.from(selectedIds))
            clearSelection()
            return
        }

        // SINGLE: default single-block delete
        onRemoveBlock(blockId)
        clearSelection()
    }

    const handleDuplicateBlock = (blockId: string) => {
        const { selectedIds, clearSelection } = useSelectionStore.getState()

        // BULK: If the clicked block is part of a multi-selection, duplicate ALL selected
        if (selectedIds.size > 1 && selectedIds.has(blockId)) {
            onDuplicateBlocks(Array.from(selectedIds))
            clearSelection()
            return
        }

        // SINGLE: clone the block and insert immediately after
        const block = blocks.find(b => b.id === blockId)
        if (!block) return

        const clonedBlock = {
            ...block,
            id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            createdAt: Date.now()
        }

        const index = blocks.findIndex(b => b.id === blockId)
        if (index !== -1) {
            onAddBlock(clonedBlock as Block, index + 1, false)
        }
    }

    // ─── Copy: save to shared blockClipboard (works for ALL block types incl. widgets) ───
    const handleCopyBlock = async (block: Block) => {
        const { selectedIds } = useSelectionStore.getState()

        // Pick blocks to copy (single or multi-selection)
        const blocksToCopy: Block[] =
            selectedIds.size > 1 && selectedIds.has(block.id)
                ? blocks.filter(b => selectedIds.has(b.id))
                : [block]

        copyBlocksToClipboard(blocksToCopy)
    }


    // ─── Paste: intercept the PASTE event (not keydown) for reliable block-level paste ───
    // Using the 'paste' event is correct: e.preventDefault() here reliably stops
    // TextBlock's onPaste handler from running simultaneously.
    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            const clipboard = getBlockClipboard()
            // If we have no block clipboard data, let browser/TextBlock handle natively
            if (clipboard.length === 0) return

            e.preventDefault()
            e.stopPropagation()

            // Give each block a fresh unique ID
            const newBlocks: Block[] = clipboard.map((srcBlock: Block, i: number) => ({
                ...srcBlock,
                id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${i}`,
                createdAt: Date.now()
            }))

            // addBlocks already handles:
            // - If active block is EMPTY text → removes it and inserts blocks FROM that position
            // - If active block has content → inserts blocks AFTER it
            useBlockStore.getState().addBlocks(newBlocks)

            // Explicitly move the DOM cursor to the end of the last pasted block.
            // MUST use setTimeout (not requestAnimationFrame) so it runs strictly AFTER
            // React mounts the new block and its internal useEffect calls .focus().
            setTimeout(() => {
                const lastBlock = newBlocks[newBlocks.length - 1]
                const el = document.getElementById(`block-${lastBlock.id}`)
                if (el) {
                    el.focus()
                    const range = document.createRange()
                    range.selectNodeContents(el)
                    range.collapse(false) // collapse to END
                    const sel = window.getSelection()
                    sel?.removeAllRanges()
                    sel?.addRange(range)
                }
            }, 10)
        }

        window.addEventListener('paste', handlePaste, { capture: true })
        return () => window.removeEventListener('paste', handlePaste, { capture: true })
    }, [])


    const { handleKeyDown } = useBlockEvents({
        blocks,
        onRemoveBlock,
        onSetActiveBlock,
        onInsertBlockAfter,
        onAddBlock,
        onUpdateBlock,
        onTurnIntoBlock
    })

    // DnD Kit sensors for drag and drop
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Require 8px movement before drag starts
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const handleDragStart = (event: DragStartEvent) => {
        const id = event.active.id as string
        setActiveDragId(id)

        // Start tracking real mouse Y + scanning block rects for instant indicator placement.
        // We bypass dnd-kit collision detection entirely — it uses dragged element rect (frozen),
        // not the cursor, so it fires late. Our scan fires the instant cursor enters a block.
        const trackPointer = (e: PointerEvent) => {
            mouseYRef.current = e.clientY
            const currentSelectedIds = useSelectionStore.getState().selectedIds
            const blockEls = document.querySelectorAll('[data-block-id]')
            let foundId: string | null = null
            let foundDirection: 'top' | 'bottom' = 'bottom'

            for (const el of Array.from(blockEls)) {
                const blockId = el.getAttribute('data-block-id')
                if (!blockId || currentSelectedIds.has(blockId)) continue
                const rect = (el as HTMLElement).getBoundingClientRect()
                if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
                    foundId = blockId
                    foundDirection = e.clientY < rect.top + rect.height / 2 ? 'top' : 'bottom'
                    break
                }
            }

            activeOverIdRef.current = foundId
            setActiveOverId(foundId)
            setDropDirection(foundDirection)
        }
        window.addEventListener('pointermove', trackPointer)
            ; (mouseYRef as any)._cleanup = trackPointer

        // Multi-Drag Prep: If hovering unselected block, select it first
        const state = useSelectionStore.getState()
        let currentSelected = state.selectedIds
        if (!currentSelected.has(id)) {
            state.setSelection([id])
            currentSelected = new Set([id])
        }

        // Calculate Y-offset to perfectly align the multi-block overlay stack under the cursor
        if (currentSelected.size > 1) {
            const selectedArray = blocks.filter(b => currentSelected.has(b.id))
            const firstId = selectedArray[0].id
            const activeEl = document.querySelector(`[data-block-id="${id}"]`) as HTMLElement
            const firstEl = document.querySelector(`[data-block-id="${firstId}"]`) as HTMLElement

            if (activeEl && firstEl) {
                const activeRect = activeEl.getBoundingClientRect()
                const firstRect = firstEl.getBoundingClientRect()
                setDragOffsetY(activeRect.top - firstRect.top)
            }
        } else {
            setDragOffsetY(0)
        }
    }

    // handleDragOver is a no-op: pointermove in trackPointer handles everything
    const handleDragOver = (_event: any) => { }

    const stopTrackingPointer = () => {
        if ((mouseYRef as any)._cleanup) {
            window.removeEventListener('pointermove', (mouseYRef as any)._cleanup)
                ; (mouseYRef as any)._cleanup = null
        }
    }

    const handleDragCancel = () => {
        stopTrackingPointer()
        setActiveDragId(null)
        setActiveOverId(null)
        setDropDirection('bottom')
    }

    // Handle drag end to reorder blocks
    const handleDragEnd = (event: DragEndEvent) => {
        stopTrackingPointer()
        const { active } = event
        const overId = activeOverIdRef.current  // Use our own tracked target, not dnd-kit's event.over
        const currentDropDirection = dropDirection
        setActiveDragId(null)
        setActiveOverId(null)
        setDropDirection('bottom')
        activeOverIdRef.current = null

        if (!overId) return

        const state = useSelectionStore.getState()
        const selectedIds = state.selectedIds

        const activeIndex = blocks.findIndex((b) => b.id === active.id)
        const overIndex = blocks.findIndex((b) => b.id === overId)

        if (activeIndex === -1 || overIndex === -1) return

        // 1. Single Item Drag
        if (selectedIds.size <= 1) {
            if (active.id !== overId) {
                let targetIndex = overIndex
                if (currentDropDirection === 'bottom' && activeIndex < overIndex) {
                    targetIndex = overIndex
                } else if (currentDropDirection === 'bottom' && activeIndex > overIndex) {
                    targetIndex = overIndex + 1
                } else if (currentDropDirection === 'top' && activeIndex < overIndex) {
                    targetIndex = overIndex - 1
                } else {
                    targetIndex = overIndex
                }
                const newBlocks = arrayMove(blocks, activeIndex, targetIndex)
                onReorderBlocks(newBlocks)
            }
            return
        }

        // 2. Multi-Item Drag
        if (selectedIds.has(overId)) return

        const draggedBlocks = blocks.filter(b => selectedIds.has(b.id))
        const remainingBlocks = blocks.filter(b => !selectedIds.has(b.id))
        const newOverIndex = remainingBlocks.findIndex(b => b.id === overId)
        if (newOverIndex === -1) return

        const insertIndex = currentDropDirection === 'bottom' ? newOverIndex + 1 : newOverIndex
        const newBlocks = [...remainingBlocks]
        newBlocks.splice(insertIndex, 0, ...draggedBlocks)
        onReorderBlocks(newBlocks)
    }

    const renderBlock = (block: Block) => {
        const isActive = block.id === activeBlockId
        const onFocus = () => onSetActiveBlock(block.id)
        const onBlur = () => { }
        const onUpdate = (updates: Partial<Block>) => onUpdateBlock(block.id, updates)
        const onKeyDown = (e: React.KeyboardEvent) => handleKeyDown(e, block)

        switch (block.type) {
            case BLOCK_TYPES.HEADER:
                return (
                    <HeaderBlock
                        key={block.id}
                        block={block}
                        isActive={isActive}
                        onUpdate={onUpdate}
                        onFocus={onFocus}
                        onBlur={onBlur}
                        onKeyDown={onKeyDown}
                        onOpenSlashMenu={(rect) => onOpenSlashMenu(rect, block.id)}
                    />
                )
            case BLOCK_TYPES.TEXT:
                // Check for "Empty Page State": Only 1 block total, and it is empty.
                const isSolitaryAndEmpty = blocks.length === 1 && (block as any).content === ''

                return (
                    <TextBlock
                        key={block.id}
                        block={block}
                        isActive={isActive}
                        onUpdate={onUpdate}
                        onFocus={onFocus}
                        onBlur={onBlur}
                        onKeyDown={onKeyDown}
                        onOpenSlashMenu={(rect) => onOpenSlashMenu(rect, block.id)}
                        showPlaceholderAlways={isSolitaryAndEmpty}
                        onTurnIntoBlock={(blockId, newBlock, maintainContent) => onTurnIntoBlock(blockId, newBlock as any, maintainContent)}
                    />
                )
            case BLOCK_TYPES.BULLET:
                return (
                    <BulletBlock
                        key={block.id}
                        block={block}
                        isActive={isActive}
                        onUpdate={onUpdate}
                        onFocus={onFocus}
                        onBlur={onBlur}
                        onKeyDown={onKeyDown}
                        onOpenSlashMenu={(rect) => onOpenSlashMenu(rect, block.id)}
                    />
                )
            case BLOCK_TYPES.DIVIDER:
                return (
                    <DividerBlock
                        key={block.id}
                        block={block}
                        isActive={isActive}
                        onUpdate={onUpdate}
                        onFocus={onFocus}
                        onBlur={onBlur}
                        onKeyDown={onKeyDown}
                    />
                )
            case BLOCK_TYPES.WIDGET:
                const widgetType = (block as any).widgetType
                if (widgetType === 'bio') {
                    return (
                        <div key={block.id} className={styles.widgetWrapper}>
                            <div style={{ padding: '20px', border: '1px dashed white', color: 'white' }}>
                                바이오 위젯 영역입니다 (테스트용)
                            </div>
                        </div>
                    )
                }
                if (widgetType === 'weekly-languages') {
                    return <WeeklyLanguagePreview key={block.id} block={block} />
                }
                if (widgetType === 'weekly-projects') {
                    // Dynamic import or direct import if already imported at top
                    // Assuming we will add import at top
                    return <WeeklyProjectsPreview key={block.id} block={block} />
                }
                if (widgetType === 'activity-graph') {
                    return <ActivityGraphPreview key={block.id} block={block} />
                }
                if (widgetType === 'productive-time') {
                    return <ProductiveTimePreview key={block.id} block={block} />
                }
                return null
        }
    }

    // Helper to render a block exactly as it appears in the list (including the handle spacing) for the DragOverlay
    const renderOverlayBlock = (block: Block) => {
        return (
            <div className="block-wrapper-with-handle" style={{ position: 'relative', background: 'transparent' }}>
                <div style={{
                    position: 'absolute',
                    left: '-40px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    paddingRight: '16px',
                    opacity: 1, // Always visible in overlay
                    pointerEvents: 'none'
                }}>
                    <div style={{
                        width: '16px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'rgba(255,255,255,0.4)'
                    }}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                            <path d="M4.5 3C4.5 3.82843 3.82843 4.5 3 4.5C2.17157 4.5 1.5 3.82843 1.5 3C1.5 2.17157 2.17157 1.5 3 1.5C3.82843 1.5 4.5 2.17157 4.5 3ZM11 3C11 3.82843 10.3284 4.5 9.5 4.5C8.67157 4.5 8 3.82843 8 3C8 2.17157 8.67157 1.5 9.5 1.5C10.3284 1.5 11 2.17157 11 3ZM3 8.5C3.82843 8.5 4.5 7.82843 4.5 7C4.5 6.17157 3.82843 5.5 3 5.5C2.17157 5.5 1.5 6.17157 1.5 7C1.5 7.82843 2.17157 8.5 3 8.5ZM9.5 8.5C10.3284 8.5 11 7.82843 11 7C11 6.17157 10.3284 5.5 9.5 5.5C8.67157 5.5 8 6.17157 8 7C8 7.82843 8.67157 8.5 9.5 8.5ZM3 12.5C3.82843 12.5 4.5 11.8284 4.5 11C4.5 10.1716 3.82843 9.5 3 9.5C2.17157 9.5 1.5 10.1716 1.5 11C1.5 11.8284 2.17157 12.5 3 12.5ZM9.5 12.5C10.3284 12.5 11 11.8284 11 11C11 10.1716 10.3284 9.5 9.5 9.5C8.67157 9.5 8 10.1716 8 11C8 11.8284 8.67157 12.5 9.5 12.5Z" />
                        </svg>
                    </div>
                </div>
                {renderBlock(block)}
            </div>
        )
    }

    // Custom collision detection: skip selected blocks so the indicator appears
    // on the first NON-selected block immediately, not 2-3 blocks away.
    const collisionDetectionStrategy = React.useCallback(
        (args: Parameters<typeof closestCenter>[0]) => {
            const currentSelectedIds = useSelectionStore.getState().selectedIds
            // Keep the active block itself so dnd-kit doesn't lose track of it.
            // Remove all other selected (ghosted) blocks from the candidate list.
            const filteredContainers = args.droppableContainers.filter(
                (container) =>
                    !currentSelectedIds.has(container.id as string) ||
                    container.id === activeDragId
            )
            return closestCenter({ ...args, droppableContainers: filteredContainers })
        },
        [activeDragId]
    )

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={() => []}  // Disabled — our pointermove scanner handles target detection
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
        >
            <SortableContext
                items={blocks.map(b => b.id)}
                strategy={() => null}
            >
                <div
                    ref={canvasRef}
                    className={styles.canvasContainer}
                    onClick={onBackgroundClick}
                    onPointerDown={handlePointerDown}
                    style={{ overflowY: isScrollLocked ? 'hidden' : 'auto' }}
                >
                    <div className={styles.canvasContent}>
                        {blocks.length === 0 ? (
                            <div className={styles.emptyState} onClick={() => {
                                // Empty state click handling if needed
                            }}>
                                <p>Click to start writing...</p>
                            </div>
                        ) : (
                            blocks.map(block => (
                                <div
                                    key={block.id}
                                    onPointerDown={(e) => {
                                        // Tell the store to ignore the upcoming focus event's attempt to move the anchor!
                                        if (e.shiftKey) {
                                            useSelectionStore.getState().setIgnoreNextAnchorSync(true)
                                        }
                                    }}
                                    onClick={(e) => {
                                        if (e.shiftKey) {
                                            // Instantly clear the native text selection that the browser just made, 
                                            // instead of completely blocking the event stream with preventDefault()
                                            window.getSelection()?.removeAllRanges()
                                            const fallbackAnchor = useBlockStore.getState().activeBlockId
                                            useSelectionStore.getState().selectRange(block.id, blocks.map(b => b.id), fallbackAnchor)
                                        } else if (e.metaKey || e.ctrlKey) {
                                            window.getSelection()?.removeAllRanges()
                                            useSelectionStore.getState().toggleSelection(block.id, true)
                                        }
                                    }}
                                >
                                    <SortableBlock
                                        blockId={block.id}
                                        blockType={block.type}
                                        onDelete={() => handleDeleteBlock(block.id)}
                                        onDuplicate={() => handleDuplicateBlock(block.id)}
                                        onCopy={() => handleCopyBlock(block)}
                                        isDraggingAny={activeDragId !== null}
                                        isSelected={useSelectionStore.getState().selectedIds.has(block.id)}
                                        isDropTarget={
                                            // Don't show drop indicator when hovering over a selected block
                                            // (selected blocks move together, so they aren't valid targets within the group)
                                            activeOverId === block.id &&
                                            !useSelectionStore.getState().selectedIds.has(block.id)
                                        }
                                        dropDirection={dropDirection}
                                    >
                                        {renderBlock(block)}
                                    </SortableBlock>
                                </div>
                            ))
                        )}

                        {/* Trailing phantom row — ensures there is always an empty line below the last block
                             so the user can always click underneath to continue writing */}
                        {blocks.length > 0 && (
                            <div
                                style={{ minHeight: '40px', cursor: 'text' }}
                                onClick={() => {
                                    // Focus the last block if it's already an empty text block,
                                    // otherwise insert a new empty text block at the end
                                    const lastBlock = blocks[blocks.length - 1]
                                    if (lastBlock && lastBlock.type === 'text' && !(lastBlock as any).content) {
                                        onSetActiveBlock(lastBlock.id)
                                    } else {
                                        const newBlock = createTextBlock()
                                        onAddBlock(newBlock, blocks.length, true)
                                    }
                                }}
                            />
                        )}

                        <div
                            className={styles.clickArea}
                            onClick={onBackgroundClick}
                        />
                    </div>
                </div>

                {/* Render Selection Box Overlay via Portal to prevent transform stacking context issues */}
                {selectionBox && typeof document !== 'undefined' && createPortal(
                    <div
                        className={styles.selectionBox}
                        style={{
                            left: Math.min(selectionBox.startX, selectionBox.currentX),
                            top: Math.min(selectionBox.startY, selectionBox.currentY),
                            width: Math.abs(selectionBox.currentX - selectionBox.startX),
                            height: Math.abs(selectionBox.currentY - selectionBox.startY)
                        }}
                    />,
                    document.body
                )}
            </SortableContext>

            {/* Drag Overlay - shows the dragged blocks dynamically */}
            <DragOverlay dropAnimation={{
                duration: 200,
                easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)'
            }}>
                {activeDragId ? (
                    <div className={styles.dragOverlay} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '6px', padding: '4px', marginTop: `-${dragOffsetY}px` }}>
                        {selectedIds.size > 1
                            ? blocks.filter(b => selectedIds.has(b.id)).map(b => (
                                <div key={`overlay-${b.id}`} style={{ width: '100%', pointerEvents: 'none' }}>
                                    {renderOverlayBlock(b)}
                                </div>
                            ))
                            : (
                                <div style={{ width: '100%', pointerEvents: 'none' }}>
                                    {renderOverlayBlock(blocks.find(b => b.id === activeDragId)!)}
                                </div>
                            )
                        }
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    )
}
