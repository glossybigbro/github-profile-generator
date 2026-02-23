'use client'

import React, { useRef, useEffect, useLayoutEffect, useState } from 'react'
import { BulletBlock as BulletBlockType } from '@/entities/block/model/types'
import { EditableBlock } from '../EditableBlock'
import { PLACEHOLDER_TEXT, SLASH_TRIGGER_CHAR } from '@/entities/block/config/constants'
import styles from './BulletBlock.module.css'
import { markdownToHtml, htmlToMarkdown, getSmartCursorPosition } from '@/shared/lib/markdown/simpleConverter'
import { useSelectionStore } from '@/entities/block/model/useSelectionStore'

interface BulletBlockProps {
    block: BulletBlockType
    isActive: boolean
    onUpdate: (updates: Partial<BulletBlockType>) => void
    onFocus: () => void
    onBlur: () => void
    onKeyDown: (e: React.KeyboardEvent) => void
    onOpenSlashMenu: (rect: DOMRect) => void
}

// Bullet marker by indent level (Notion-style)
const BULLET_MARKERS = ['•', '◦', '▪', '▪']

export function BulletBlock({
    block,
    isActive,
    onUpdate,
    onFocus,
    onBlur,
    onKeyDown,
    onOpenSlashMenu,
}: BulletBlockProps) {
    const contentRef = useRef<HTMLDivElement>(null)
    const indentLevel = block.indent || 0
    const [isComposing, setIsComposing] = useState(false)
    const isLocalUpdate = useRef(false) // Loop breaker

    const isSelected = useSelectionStore(state => state.selectedIds.has(block.id))

    // Store → DOM Sync (WYSIWYG)
    useLayoutEffect(() => {
        if (!contentRef.current) return
        if (isComposing) return

        if (isLocalUpdate.current) {
            isLocalUpdate.current = false
            return
        }

        const targetMarkdown = block.content || ''
        const expectedHtml = markdownToHtml(targetMarkdown)

        if (contentRef.current.innerHTML === expectedHtml) {
            return
        }

        if (!targetMarkdown && contentRef.current.innerHTML === '<br>') {
            return
        }

        // Smart Cursor Logic
        const selection = window.getSelection()
        let rawCursorOffset = 0
        if (selection && selection.rangeCount > 0 && contentRef.current.contains(selection.anchorNode)) {
            const range = selection.getRangeAt(0)
            const preRange = document.createRange()
            preRange.selectNodeContents(contentRef.current)
            preRange.setEnd(range.endContainer, range.endOffset)
            rawCursorOffset = preRange.toString().length
        }

        const targetOffset = getSmartCursorPosition(targetMarkdown, rawCursorOffset)

        contentRef.current.innerHTML = expectedHtml

        // Restore cursor to end if active
        if (isActive) {
            try {
                const walker = document.createTreeWalker(contentRef.current, NodeFilter.SHOW_TEXT, null)
                let currentPos = 0
                let targetNode = null
                let targetLocalOffset = 0

                while (walker.nextNode()) {
                    const node = walker.currentNode
                    const length = node.textContent?.length || 0

                    if (currentPos + length >= targetOffset) {
                        targetNode = node
                        targetLocalOffset = targetOffset - currentPos
                        break
                    }
                    currentPos += length
                }

                if (targetNode) {
                    const newRange = document.createRange()
                    const safeOffset = Math.min(targetLocalOffset, targetNode.textContent?.length || 0)
                    newRange.setStart(targetNode, safeOffset)
                    newRange.collapse(true)
                    const sel = window.getSelection()
                    sel?.removeAllRanges()
                    sel?.addRange(newRange)
                } else {
                    // Fallback to end
                    const range = document.createRange()
                    range.selectNodeContents(contentRef.current)
                    range.collapse(false)
                    const sel = window.getSelection()
                    sel?.removeAllRanges()
                    sel?.addRange(range)
                }
            } catch (e) {
                // Ignore
            }
        }
    }, [block.content, isActive, isComposing])

    // Attribute & Class Management (Manual)
    useEffect(() => {
        if (!contentRef.current) return

        // Notion-like behavior: If a block is "selected" (blue Box selection), it's NOT editable.
        // Otherwise, it's ALWAYS editable, so users can natively drag-to-highlight text before activating it!
        contentRef.current.contentEditable = isSelected ? 'false' : 'true'
        // Always keep styles.markdownPreview applied
    }, [isSelected])

    // Auto-focus and cursor-to-end when activated
    useEffect(() => {
        if (contentRef.current && isActive) {
            // Only focus if not already focused
            if (document.activeElement !== contentRef.current) {
                contentRef.current.focus()
            }
        }
    }, [isActive, block.id])

    const handleInput = () => {
        if (contentRef.current) {
            isLocalUpdate.current = true

            const html = contentRef.current.innerHTML
            // Fix: Browser adds <br> when empty.
            if (html === '<br>') {
                // treat as empty
            }

            const markdown = (html === '<br>' || html === '') ? '' : htmlToMarkdown(html)

            if (markdown !== block.content) {
                onUpdate({ content: markdown })
            }

            const text = contentRef.current.innerText || ''

            if (text === SLASH_TRIGGER_CHAR) {
                const rect = contentRef.current.getBoundingClientRect()
                onOpenSlashMenu(rect)
            }
        }
    }

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault()
        const text = e.clipboardData.getData('text/plain')
        document.execCommand('insertText', false, text)
    }

    // Indent CSS class
    const indentClass = styles[`indent${Math.min(indentLevel, 3)}`] || ''
    const handleClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement
        const anchor = target.closest('a')

        if (anchor && anchor.getAttribute('href')) {
            window.open(anchor.getAttribute('href')!, '_blank', 'noopener,noreferrer')
            e.preventDefault()
            e.stopPropagation()
            return
        }

        // Prevent Shift-Click from triggering focus and moving the anchor point
        if (e.shiftKey) return

        const selection = window.getSelection()
        const isTextSelected = selection && selection.toString().length > 0

        if (!isActive && !isTextSelected) {
            onFocus()
        }
    }

    const isEmpty = !block.content || block.content === '\n'

    return (
        <EditableBlock
            block={block}
            isActive={isActive}
            onUpdate={onUpdate}
            onFocus={onFocus}
            onBlur={onBlur}
        >
            <div className={`${styles.bulletWrapper} ${indentClass}`}>
                <div className={styles.bulletMarker}>
                    {BULLET_MARKERS[Math.min(indentLevel, 3)]}
                </div>
                <div style={{ flex: 1, position: 'relative' }}>
                    <div
                        ref={contentRef}
                        className={`${styles.text} ${isEmpty ? styles.empty : ''} ${styles.markdownPreview}`}
                        suppressContentEditableWarning
                        onInput={handleInput}
                        onCompositionStart={() => setIsComposing(true)}
                        onCompositionEnd={() => setIsComposing(false)}
                        onBlur={onBlur}
                        onKeyDown={onKeyDown}
                        onPaste={handlePaste}
                        onClick={handleClick}
                        data-placeholder={PLACEHOLDER_TEXT.TEXT}
                        id={`block-${block.id}`}
                        style={{ outline: 'none' }}
                    />
                </div>
            </div>
        </EditableBlock>
    )
}
