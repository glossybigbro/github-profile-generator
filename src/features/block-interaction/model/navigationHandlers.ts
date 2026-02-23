import { KeyboardEvent } from 'react'
import { Block, TextBlock } from '@/entities/block/model/types'
import { BLOCK_TYPES } from '@/entities/block/config/constants'
import type { BlockEventContext } from '@/features/block-interaction/model/types'

/**
 * Handles Arrow Up/Down navigation between blocks
 */
export const handleArrowNavigation = (e: KeyboardEvent, ctx: BlockEventContext) => {
    const { blocks, block, onSetActiveBlock } = ctx

    if (e.key === 'ArrowUp') {
        const element = e.currentTarget as HTMLElement
        const selection = window.getSelection()
        if (!selection || selection.rangeCount === 0) return

        const range = selection.getRangeAt(0)
        const rect = range.getBoundingClientRect()
        const content = 'content' in block ? (block as TextBlock).content : ''
        const isEmpty = content === ''

        const checkY = rect.top - 5
        const pointElement = document.elementFromPoint(rect.left + (rect.width / 2), checkY)

        const isAtTopEdge = isEmpty || (pointElement && !element.contains(pointElement))

        if (isAtTopEdge) {
            const index = blocks.findIndex(b => b.id === block.id)
            if (index > 0) {
                e.preventDefault()
                let targetIndex = index - 1

                // Skip over dividers and widgets (non-editable blocks)
                while (targetIndex >= 0 &&
                    (blocks[targetIndex].type === BLOCK_TYPES.DIVIDER ||
                        blocks[targetIndex].type === BLOCK_TYPES.WIDGET)) {
                    targetIndex--
                }

                if (targetIndex >= 0) {
                    onSetActiveBlock(blocks[targetIndex].id)
                }
            }
        }
    }

    if (e.key === 'ArrowDown') {
        const element = e.currentTarget as HTMLElement
        const selection = window.getSelection()
        if (!selection || selection.rangeCount === 0) return

        const range = selection.getRangeAt(0)
        const rect = range.getBoundingClientRect()
        const content = 'content' in block ? (block as TextBlock).content : ''
        const isEmpty = content === ''

        const checkY = rect.bottom + 10
        const pointElement = document.elementFromPoint(rect.left + (rect.width / 2), checkY)

        const isAtBottomEdge = isEmpty || (pointElement && !element.contains(pointElement))

        if (isAtBottomEdge) {
            const index = blocks.findIndex(b => b.id === block.id)
            if (index < blocks.length - 1) {
                e.preventDefault()
                let targetIndex = index + 1

                // Skip over dividers and widgets (non-editable blocks)
                while (targetIndex < blocks.length &&
                    (blocks[targetIndex].type === BLOCK_TYPES.DIVIDER ||
                        blocks[targetIndex].type === BLOCK_TYPES.WIDGET)) {
                    targetIndex++
                }

                if (targetIndex < blocks.length) {
                    onSetActiveBlock(blocks[targetIndex].id)
                }
            }
        }
    }
}
