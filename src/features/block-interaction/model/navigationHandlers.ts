import { KeyboardEvent } from 'react'
import { Block, TextBlock } from '@/entities/block/model/types'
import { BLOCK_TYPES } from '@/entities/block/config/constants'
import type { BlockEventContext } from '@/features/block-interaction/model/types'

/**
 * Helper to set cursor based on X coordinate
 */
const setCursorAtX = (elementId: string, targetX: number, isArrowUp: boolean) => {
    // 1. Give React a moment to render the newly focused block
    requestAnimationFrame(() => {
        const el = document.getElementById(`block-${elementId}`)
        // We only focus if focus was lost, or for safety. 
        if (el) el.focus()

        // Wait a tiny bit more for layout to settle (React 18 concurrent mode)
        setTimeout(() => {
            const currentEl = document.getElementById(`block-${elementId}`)
            if (!currentEl) return

            // 2. Find the exact Y coordinate to test
            const rect = currentEl.getBoundingClientRect()
            // If ArrowUp, we came from below, so we want the BOTTOM line of the target block
            // If ArrowDown, we came from above, so we want the TOP line of the target block
            const checkY = isArrowUp ? rect.bottom - 5 : rect.top + 5

            // 3. Use CaretPosition (Gecko) or Range from Point (WebKit/Blink)
            let range: Range | null = null

            // WebKit / Blink (Chrome, Safari, new Edge)
            if (typeof document.caretRangeFromPoint === 'function') {
                range = document.caretRangeFromPoint(targetX, checkY)
            }
            // Gecko (Firefox)
            else if ('caretPositionFromPoint' in document) {
                // @ts-ignore - Firefox specific API
                const position = document.caretPositionFromPoint(targetX, checkY)
                if (position) {
                    range = document.createRange()
                    range.setStart(position.offsetNode, position.offset)
                    range.collapse(true)
                }
            }

            // 4. Fallbacks if point calculation failed
            if (!range || !currentEl.contains(range.commonAncestorContainer)) {
                range = document.createRange()
                range.selectNodeContents(currentEl)
                range.collapse(!isArrowUp) // Collapse to end if Up (bottom of text), start if Down (top of text)
            }

            // 5. Apply the selection
            const sel = window.getSelection()
            sel?.removeAllRanges()
            sel?.addRange(range)

        }, 0)
    })
}

/**
 * Handles Arrow Up/Down navigation between blocks
 */
export const handleArrowNavigation = (e: KeyboardEvent, ctx: BlockEventContext) => {
    const { blocks, block, onSetActiveBlock } = ctx

    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        const isArrowUp = e.key === 'ArrowUp'
        const element = e.currentTarget as HTMLElement
        const selection = window.getSelection()
        if (!selection || selection.rangeCount === 0) return

        const range = selection.getRangeAt(0)
        const rect = range.getBoundingClientRect()
        const content = 'content' in block ? (block as TextBlock).content : ''
        const isEmpty = content === ''

        // Calculate if we're at the very top/bottom edge of the current text element
        const checkY = isArrowUp ? rect.top - 5 : rect.bottom + 10
        const pointElement = document.elementFromPoint(rect.left + (rect.width / 2), checkY)

        // If the point is outside the element, we've hit the edge
        const isAtEdge = isEmpty || (pointElement && !element.contains(pointElement))

        if (isAtEdge) {
            const index = blocks.findIndex(b => b.id === block.id)

            // Boundary check based on direction
            if ((isArrowUp && index > 0) || (!isArrowUp && index < blocks.length - 1)) {
                e.preventDefault()

                // Save the target X coordinate
                // We use left coordinate from the caret's bounding rect
                const targetX = rect.left

                let targetIndex = isArrowUp ? index - 1 : index + 1

                // Skip over non-editable blocks like dividers or widgets
                while (
                    targetIndex >= 0 && targetIndex < blocks.length &&
                    (blocks[targetIndex].type === BLOCK_TYPES.DIVIDER ||
                        blocks[targetIndex].type === BLOCK_TYPES.WIDGET)
                ) {
                    targetIndex = isArrowUp ? targetIndex - 1 : targetIndex + 1
                }

                if (targetIndex >= 0 && targetIndex < blocks.length) {
                    const targetId = blocks[targetIndex].id
                    // 1. Set global active block
                    onSetActiveBlock(targetId)
                    // 2. Set cursor via DOM APIs maintaining horizontal X
                    setCursorAtX(targetId, targetX, isArrowUp)
                }
            }
        }
    }
}
