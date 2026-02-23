'use client'

import React, { useRef, useEffect } from 'react'
import { HeaderBlock as HeaderBlockType } from '@/entities/block/model/types'
import { EditableBlock } from '../EditableBlock'
import { PLACEHOLDER_TEXT } from '@/entities/block/config/constants'
import styles from './HeaderBlock.module.css'
import { markdownToHtml, htmlToMarkdown, getSmartCursorPosition } from '@/shared/lib/markdown/simpleConverter'
import { useSelectionStore } from '@/entities/block/model/useSelectionStore'

interface HeaderBlockProps {
    block: HeaderBlockType
    isActive: boolean
    onUpdate: (updates: Partial<HeaderBlockType>) => void
    onFocus: () => void
    onBlur: () => void
    onKeyDown: (e: React.KeyboardEvent) => void
    onOpenSlashMenu: (rect: DOMRect) => void
}

export function HeaderBlock({
    block,
    isActive,
    onUpdate,
    onFocus,
    onBlur,
    onKeyDown,
    onOpenSlashMenu,
}: HeaderBlockProps) {
    const contentRef = useRef<HTMLHeadingElement>(null)
    const [isComposing, setIsComposing] = React.useState(false)
    const isLocalUpdate = useRef(false) // Loop breaker for local edits

    const isSelected = useSelectionStore(state => state.selectedIds.has(block.id))

    // Store → DOM Sync
    React.useLayoutEffect(() => {
        if (!contentRef.current) return
        if (isComposing) return

        // If this update was triggered by OUR OWN handleInput, DO NOT SYNC.
        // The DOM is already correct (user typed it).
        if (isLocalUpdate.current) {
            isLocalUpdate.current = false
            return
        }

        const targetMarkdown = block.content || ''
        const expectedHtml = markdownToHtml(targetMarkdown)

        // Optimization: logic to avoid cursor jumping and unnecessary updates

        // Critical check: if innerHTML is ALREADY what we expect, do nothing.
        if (contentRef.current.innerHTML === expectedHtml) {
            return
        }

        // Additional check for "Empty State":
        // Browser puts <br> when contentEditable is empty.
        // If we expect empty string, and DOM has <br>, THAT IS FINE. MATCHED.
        // Do NOT overwrite with '' because that removes the <br> and collapses the line or moves cursor.
        if (!expectedHtml && contentRef.current.innerHTML === '<br>') {
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

        // Force update
        contentRef.current.innerHTML = expectedHtml

        // Restore cursor
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

    // Attribute Management
    useEffect(() => {
        if (!contentRef.current) return

        // Notion-like behavior: If a block is "selected" (blue Box selection), it's NOT editable.
        // Otherwise, it's ALWAYS editable, so users can natively drag-to-highlight text before activating it!
        contentRef.current.contentEditable = isSelected ? 'false' : 'true'
        // Note: We NO LONGER toggle styles.markdownPreview. It is always applied for consistency.
    }, [isSelected])

    // Focus management
    useEffect(() => {
        if (contentRef.current && isActive) {
            if (document.activeElement !== contentRef.current) {
                contentRef.current.focus()
            }
        }
    }, [isActive, block.id]) // Depend on block.id to refocus if blocks are reordered? mostly just isActive.

    const handleInput = () => {
        if (contentRef.current) {
            isLocalUpdate.current = true // Flag start

            let html = contentRef.current.innerHTML

            // Fix: Browser adds <br> when empty. If only <br> remains, treat as empty.
            if (html === '<br>') {
                // We don't force-clear DOM here to avoid cursor issues, but we convert to empty markdown.
            }

            // If empty, markdown is empty string
            const markdown = (html === '<br>' || html === '') ? '' : htmlToMarkdown(html)

            if (markdown !== block.content) {
                onUpdate({ content: markdown })
            }

            const text = contentRef.current.innerText || ''

            if (text === '/') {
                const selection = window.getSelection()
                if (selection && selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0)
                    const rect = range.getBoundingClientRect()
                    onOpenSlashMenu(rect)
                } else {
                    const rect = contentRef.current.getBoundingClientRect()
                    onOpenSlashMenu(rect)
                }
            }
        }
    }

    const handleClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement
        const anchor = target.closest('a')

        if (anchor && anchor.getAttribute('href')) {
            window.open(anchor.getAttribute('href')!, '_blank', 'noopener,noreferrer')
            e.preventDefault()
            e.stopPropagation()
            return
        }

        const selection = window.getSelection()
        const isTextSelected = selection && selection.toString().length > 0

        if (!isActive && !isTextSelected) {
            onFocus()
        }
    }

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault()
        const text = e.clipboardData.getData('text/plain')
        document.execCommand('insertText', false, text)
    }

    return (
        <EditableBlock
            block={block}
            isActive={isActive}
            onUpdate={onUpdate}
            onFocus={onFocus}
            onBlur={onBlur}
        >
            <React.Fragment>
                {(() => {
                    const Tag = `h${block.level}` as React.ElementType
                    const isEmpty = !block.content || block.content === '\n'
                    // We render a "static" element as much as possible to let useLayoutEffect and manual refs handle the DOM.
                    // We DO need to handle onClick for focus when inactive.
                    return (
                        <Tag
                            ref={contentRef}
                            className={`${styles.header} ${isEmpty ? styles.empty : ''} ${styles.markdownPreview}`}
                            suppressContentEditableWarning
                            onInput={handleInput}
                            onCompositionStart={() => setIsComposing(true)}
                            onCompositionEnd={() => setIsComposing(false)}
                            onBlur={onBlur}
                            onKeyDown={onKeyDown}
                            onPaste={handlePaste}
                            onClick={(e: React.MouseEvent) => {
                                // Prevent Shift-Click from triggering focus and moving the anchor point
                                if (e.shiftKey) return
                                if (!isActive) onFocus()
                            }}
                            data-placeholder={isEmpty ? PLACEHOLDER_TEXT.HEADER : ''}
                            id={`block-${block.id}`}
                            style={{ outline: 'none' }}
                        />
                    )
                })()}
            </React.Fragment>
        </EditableBlock>
    )
}
