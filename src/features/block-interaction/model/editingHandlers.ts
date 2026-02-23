import { KeyboardEvent } from 'react'
import { mapHtmlOffsetToMarkdownOffset, getSmartCursorPosition } from '@/shared/lib/markdown/simpleConverter'
import { Block, TextBlock, BulletBlock } from '@/entities/block/model/types'
import { createTextBlock, createBulletBlock } from '@/entities/block/model/blockUtils'
import { BLOCK_TYPES } from '@/entities/block/config/constants'
import type { BlockEventContext } from '@/features/block-interaction/model/types'

// ────────────────────────────────────────────────
// Enter Key Handler
// ────────────────────────────────────────────────

export const handleEnterKey = (e: KeyboardEvent, ctx: BlockEventContext) => {
    if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return

    e.preventDefault()

    const { blocks, block, onTurnIntoBlock, onAddBlock, onInsertBlockAfter, onUpdateBlock } = ctx

    const content = 'content' in block ? (block as TextBlock).content : ''
    const isEmpty = !content || content === '' || content === '\n'

    // ── Scenario A: Empty Header → Turn into Text ──
    if (block.type === BLOCK_TYPES.HEADER && isEmpty) {
        const resetBlock = createTextBlock()
        onTurnIntoBlock(block.id, resetBlock)
        return
    }

    // ── Scenario B: Bullet Block ──
    if (block.type === BLOCK_TYPES.BULLET) {
        const bulletBlock = block as BulletBlock
        const currentIndent = bulletBlock.indent || 0

        // B-1: Empty bullet
        if (isEmpty) {
            // indent > 0 → Shift+Tab처럼 한 단계 outdent (Notion 스타일)
            if (currentIndent > 0) {
                onUpdateBlock(block.id, { indent: currentIndent - 1 })
                return
            }
            // indent === 0 → 텍스트 블록으로 전환 (리스트 탈출)
            const textBlock = createTextBlock()
            onTurnIntoBlock(block.id, textBlock, false)
            return
        }

        // B-2: Non-empty bullet → split text at cursor, continue bullet list
        const selection = window.getSelection()
        let cursorOffset = content.length // default: end

        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0)
            // Calculate offset from the start of the contentEditable
            const el = document.getElementById(`block-${block.id}`)
            if (el) {
                const preRange = document.createRange()
                preRange.selectNodeContents(el)
                preRange.setEnd(range.startContainer, range.startOffset)

                // Fix: Map visual offset to markdown offset to prevent breaking links/syntax
                const visualOffset = preRange.toString().length
                cursorOffset = mapHtmlOffsetToMarkdownOffset(content, visualOffset)
            }
        }

        const beforeCursor = content.slice(0, cursorOffset)
        const afterCursor = content.slice(cursorOffset)

        // Update current block with text before cursor
        onUpdateBlock(block.id, { content: beforeCursor })

        // Create new bullet block with text after cursor, inheriting indent level
        const newBullet = createBulletBlock(afterCursor, currentIndent)
        onInsertBlockAfter(block.id, newBullet)

        // Focus the new bullet and set cursor to start
        requestAnimationFrame(() => {
            const el = document.getElementById(`block-${newBullet.id}`)
            if (el) {
                el.focus()
                const range = document.createRange()
                range.selectNodeContents(el)
                range.collapse(true) // cursor to start
                const sel = window.getSelection()
                sel?.removeAllRanges()
                sel?.addRange(range)
            }
        })
        return
    }

    // ── Scenario C: Standard text/header blocks ──
    const selection = window.getSelection()
    const isAtStart = selection?.rangeCount! > 0 &&
        selection?.getRangeAt(0)?.collapsed &&
        selection?.getRangeAt(0)?.startOffset === 0

    const newBlock = createTextBlock()

    // C-1: Start of non-empty block → Prepend new block
    if (isAtStart && !isEmpty) {
        const index = blocks.findIndex(b => b.id === block.id)

        if (index === 0) {
            onAddBlock(newBlock, 0, false)
        } else {
            const prevId = blocks[index - 1].id
            onInsertBlockAfter(prevId, newBlock, false)
        }

        requestAnimationFrame(() => {
            const el = document.getElementById(`block-${block.id}`)
            setCursorPosition(el, 0)
        })
        return
    }

    // C-2: Default → Append new block after current
    onInsertBlockAfter(block.id, newBlock)
}

// ────────────────────────────────────────────────
// Backspace Key Handler
// ────────────────────────────────────────────────

/**
 * contentEditable 내에서 커서가 텍스트 시작점에 있는지 정확히 판단
 * range.startOffset === 0 만으로는 중첩 노드에서 부정확할 수 있음
 */
const isCursorAtStartOfBlock = (blockId: string): boolean => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return false

    const range = selection.getRangeAt(0)
    if (!range.collapsed) return false

    const el = document.getElementById(`block-${blockId}`)
    if (!el) return false

    // 시작점부터 현재 커서 위치까지의 텍스트 길이를 측정
    const preRange = document.createRange()
    preRange.selectNodeContents(el)
    preRange.setEnd(range.startContainer, range.startOffset)
    return preRange.toString().length === 0
}

/**
 * DOM에서 현재 블록의 실제 텍스트를 읽음 (store보다 DOM이 최신일 수 있음)
 */
const getBlockDOMContent = (blockId: string): string => {
    const el = document.getElementById(`block-${blockId}`)
    if (!el) return ''
    return el.textContent || ''
}

export const handleBackspace = (e: KeyboardEvent, ctx: BlockEventContext) => {
    if (e.key !== 'Backspace') return

    const { blocks, block, onRemoveBlock, onSetActiveBlock, onUpdateBlock, onTurnIntoBlock } = ctx

    // 커서가 블록 텍스트의 맨 앞이 아니면 기본 동작(문자 삭제) 실행
    if (!isCursorAtStartOfBlock(block.id)) return

    const index = blocks.findIndex(b => b.id === block.id)
    // Use store content for consistency and to preserve Markdown (links/formatting)
    // Fallback to DOM only if absolutely necessary, but for merging we MUST use Markdown.
    const content = 'content' in block ? (block as TextBlock).content || '' : ''
    const isEmpty = !content || content === '\n'

    // ── Scenario: Bullet block at cursor start → Revert to TextBlock ──
    if (block.type === BLOCK_TYPES.BULLET) {
        e.preventDefault()
        const textBlock = createTextBlock()
        // content를 유지하면서 텍스트 타입으로 변환
        onTurnIntoBlock(block.id, { ...textBlock, content } as any, false)

        requestAnimationFrame(() => {
            const el = document.getElementById(`block-${block.id}`)
            setCursorPosition(el, 0)
        })
        return
    }

    // ── Standard merge with previous block ──
    if (index > 0) {
        const prevBlock = blocks[index - 1]

        if (prevBlock.type === BLOCK_TYPES.DIVIDER) {
            handleDividerBackspace(e, ctx, index)
            return
        }

        if (prevBlock.type === BLOCK_TYPES.WIDGET) {
            e.preventDefault()
            return
        }

        e.preventDefault()

        // Use Markdown content from store to preserve links
        const prevContent = 'content' in prevBlock ? (prevBlock as TextBlock).content || '' : ''
        const currContent = (content === '\n') ? '' : content

        // 이전 블록에 현재 content를 병합
        const mergedContent = prevContent + currContent
        onUpdateBlock(prevBlock.id, { content: mergedContent })

        // 현재 블록 삭제 후 이전 블록 활성화
        onRemoveBlock(block.id)
        onSetActiveBlock(prevBlock.id)

        // Cursor should go to where the previous content ended
        // But we need to calculate the visual separation for the cursor?
        // Actually, if we just set it to the length of prevContent (Markdown length), 
        // setCursorPosition might be confused if we pass Markdown length to DOM offset.
        // We need to map Markdown offset to DOM offset if we want perfection.
        // But simply, let's try to find the end of the previous text.

        // However, setCursorPosition logic in this file (lines 304+) takes a simple offset.
        // If the prevContent has Markdown symbols (e.g. [link](url)), the DOM text length is shorter.
        // We need to calculate the *visual* length of prevContent.

        // Fortunately we have logic for this or we can rely on "end of previous content" 
        // by checking the DOM after update?
        // Or better: The cursor should be at the end of the text that WAS there.
        // We can just get the textContent length of the previous block DOM element BEFORE update?
        // But we are updating it.

        // Let's use simpleConverter's helper if available or estimate.
        // Actually, simply setting it to the end is not correct, we want it between the old and new content.

        const prevVisualLength = getSmartCursorPosition(prevContent, prevContent.length)

        requestAnimationFrame(() => {
            const el = document.getElementById(`block-${prevBlock.id}`)
            if (el) {
                // DOM에 merged content가 반영되었는지 확인, 아니면 강제 설정
                // We let React handle the HTML update via onUpdateBlock -> TextBlock -> useLayoutEffect
                // But we need to set cursor.
                setCursorPosition(el, prevVisualLength)
            }
        })
        return
    }

    // ── Delete empty block at start ──
    if (block.type === BLOCK_TYPES.TEXT && isEmpty) {
        const isLastBlock = index === blocks.length - 1
        const isOnlyBlock = blocks.length === 1

        if (isLastBlock || isOnlyBlock) {
            e.preventDefault()
            return
        }

        e.preventDefault()
        onRemoveBlock(block.id)
    }
}

// ────────────────────────────────────────────────
// Tab Key Handler (Bullet Indent / Outdent)
// ────────────────────────────────────────────────

export const handleTab = (e: KeyboardEvent, ctx: BlockEventContext) => {
    if (e.key !== 'Tab') return

    // Only handle Tab for bullet blocks
    if (ctx.block.type !== BLOCK_TYPES.BULLET) return

    e.preventDefault()

    const bulletBlock = ctx.block as BulletBlock
    const currentIndent = bulletBlock.indent || 0

    if (e.shiftKey) {
        // Shift+Tab → Outdent (decrease indent, min 0)
        const newIndent = Math.max(0, currentIndent - 1)
        ctx.onUpdateBlock(ctx.block.id, { indent: newIndent })
    } else {
        // Tab → Indent (increase indent, max 3)
        const newIndent = Math.min(3, currentIndent + 1)
        ctx.onUpdateBlock(ctx.block.id, { indent: newIndent })
    }
}

// ────────────────────────────────────────────────
// Divider Backspace (Skip over dividers)
// ────────────────────────────────────────────────

const handleDividerBackspace = (e: KeyboardEvent, ctx: BlockEventContext, currentIndex: number) => {
    const { blocks, block, onRemoveBlock, onSetActiveBlock } = ctx

    let targetIndex = currentIndex - 1
    while (targetIndex >= 0 && blocks[targetIndex].type === BLOCK_TYPES.DIVIDER) {
        targetIndex--
    }

    const content = 'content' in block ? (block as TextBlock).content : ''
    const isEmpty = !content || content === ''

    if (targetIndex >= 0) {
        e.preventDefault()

        if (isEmpty) {
            onRemoveBlock(block.id)
        }

        const targetBlock = blocks[targetIndex]
        onSetActiveBlock(targetBlock.id)

        requestAnimationFrame(() => {
            const el = document.getElementById(`block-${targetBlock.id}`)
            setCursorToEnd(el)
        })
    } else {
        e.preventDefault()
    }
}

// ────────────────────────────────────────────────
// Cursor Utility Helpers
// ────────────────────────────────────────────────

const setCursorPosition = (el: HTMLElement | null, offset: number) => {
    if (!el) return
    el.focus()

    if (el.childNodes.length > 0) {
        if (el.childNodes.length === 1 && el.firstChild?.nodeType === Node.TEXT_NODE) {
            try {
                const range = document.createRange()
                range.setStart(el.firstChild!, offset)
                range.collapse(true)
                const sel = window.getSelection()
                sel?.removeAllRanges()
                sel?.addRange(range)
            } catch (err) {
                setCursorToEnd(el)
            }
        } else {
            setCursorToEnd(el)
        }
    } else {
        el.focus()
    }
}

const setCursorToEnd = (el: HTMLElement | null) => {
    if (!el) return
    el.focus()
    const range = document.createRange()
    range.selectNodeContents(el)
    range.collapse(false)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
}
