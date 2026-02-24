'use client'

import { useRef, useEffect, useLayoutEffect, useState } from 'react'
import { TextBlock as TextBlockType } from '@/entities/block/model/types'
import { EditableBlock } from '../EditableBlock'
import { PLACEHOLDER_TEXT, SLASH_TRIGGER_CHAR } from '@/entities/block/config/constants'
import styles from './TextBlock.module.css'

import { markdownToHtml, htmlToMarkdown, getSmartCursorPosition, mapHtmlOffsetToMarkdownOffset } from '@/shared/lib/markdown/simpleConverter'
import { useSelectionStore } from '@/entities/block/model/useSelectionStore'
import { copyBlocksToClipboard } from '@/entities/block/model/blockClipboard'

interface TextBlockProps {
    block: TextBlockType
    isActive: boolean
    onUpdate: (updates: Partial<TextBlockType>) => void
    onFocus: () => void
    onBlur: () => void
    onKeyDown: (e: React.KeyboardEvent) => void
    onOpenSlashMenu: (rect: DOMRect) => void
    showPlaceholderAlways?: boolean
    onTurnIntoBlock?: (blockId: string, newTypeBlock: any, maintainContent?: boolean) => void
}

export function TextBlock({
    block,
    isActive,
    onUpdate,
    onFocus,
    onBlur,
    onKeyDown,
    onOpenSlashMenu,
    showPlaceholderAlways,
    onTurnIntoBlock,
}: TextBlockProps) {
    const contentRef = useRef<HTMLDivElement>(null)
    const [isComposing, setIsComposing] = useState(false)
    const isLocalUpdate = useRef(false) // Loop breaker for local edits

    // Store → DOM Sync
    // Only update DOM if the content is seemingly different to avoid cursor jumps
    useLayoutEffect(() => {
        if (!contentRef.current) return

        // If composing (IME), do not touch DOM
        if (isComposing) return

        // If this update was triggered by OUR OWN handleInput, DO NOT SYNC.
        // The DOM is already correct (user typed it).
        if (isLocalUpdate.current) {
            isLocalUpdate.current = false
            return
        }

        const targetMarkdown = block.content || ''
        const expectedHtml = markdownToHtml(targetMarkdown)

        // Check if DOM matches expected HTML
        if (contentRef.current.innerHTML === expectedHtml) {
            return
        }

        // Empty state check for backspace/placeholder
        if (!targetMarkdown && contentRef.current.innerHTML === '<br>') {
            return
        }

        // Smart Cursor Logic
        const selection = window.getSelection()
        let rawCursorOffset = 0

        if (selection && selection.rangeCount > 0 && contentRef.current.contains(selection.anchorNode)) {
            // Standard text offset in current DOM
            const range = selection.getRangeAt(0)
            const preRange = document.createRange()
            preRange.selectNodeContents(contentRef.current)
            preRange.setEnd(range.endContainer, range.endOffset)
            rawCursorOffset = preRange.toString().length
        }

        const targetOffset = getSmartCursorPosition(targetMarkdown, rawCursorOffset)

        // Force update to match WYSIWYG expectation
        contentRef.current.innerHTML = expectedHtml

        if (isActive) {
            try {
                // Restore cursor to correct position
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
                    // Clamp offset to node length to be safe
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
                // Ignore selection errors
            }
        }
    }, [block.content, isActive, isComposing])

    const isSelected = useSelectionStore(state => state.selectedIds.has(block.id))

    // Attribute & Class Management (Manual)
    useEffect(() => {
        if (!contentRef.current) return

        // Notion-like behavior: If a block is "selected" (blue Box selection), it's NOT editable.
        // Otherwise, it's ALWAYS editable, so users can natively drag-to-highlight text before activating it!
        contentRef.current.contentEditable = isSelected ? 'false' : 'true'
        // Always keep styles.markdownPreview applied
    }, [isSelected])

    // Focus management
    useEffect(() => {
        if (contentRef.current && isActive) {
            // Only focus if not already focused (to prevent fighting)
            if (document.activeElement !== contentRef.current) {
                // We focus it but we do NOT manually reset the cursor range. 
                // Natively clicking it or drag-selecting text inside it already correctly places the cursor/selection!
                contentRef.current.focus()
            }
        }
    }, [isActive, block.id])

    const handleInput = () => {
        if (contentRef.current) {
            isLocalUpdate.current = true // Flag start

            // WYSIWYG Input Rule Handling
            const rawText = contentRef.current.innerText || '' // For quick triggers

            // ─── Notion-style Input Rule: Headers ───
            const headerMatch = rawText.match(/^(#{1,3})[\s\u00A0]/)
            if (onTurnIntoBlock && headerMatch) {
                const level = headerMatch[1].length
                const newContent = rawText.replace(/^(#{1,3})[\s\u00A0]/, '')

                onTurnIntoBlock(block.id, {
                    ...block,
                    type: 'header',
                    level: level as 1 | 2 | 3,
                    content: newContent,
                } as any, false)
                return
            }

            // ─── Notion-style Input Rule: "- " or "* " → Bullet Block ───
            const isBulletTrigger =
                rawText.startsWith('- ') || rawText.startsWith('-\u00A0') ||
                rawText.startsWith('* ') || rawText.startsWith('*\u00A0')

            if (onTurnIntoBlock && isBulletTrigger) {
                const newContent = rawText.replace(/^[-*][\s\u00A0]/, '')
                onTurnIntoBlock(block.id, {
                    ...block,
                    type: 'bullet',
                    content: newContent,
                } as any, false)
                return
            }

            // ─── Notion-style Input Rule: "---" → Divider Block ───
            if (onTurnIntoBlock && rawText === '---') {
                onTurnIntoBlock(block.id, {
                    ...block,
                    type: 'divider',
                } as any, false)
                return
            }

            // Standard Update
            let html = contentRef.current.innerHTML
            // Fix: Browser adds <br> when empty.
            if (html === '<br>') {
                // treat as empty
            }

            const markdown = (html === '<br>' || html === '') ? '' : htmlToMarkdown(html)

            if (markdown !== block.content) {
                onUpdate({ content: markdown })
            }

            // Slash Command Trigger
            if (rawText === SLASH_TRIGGER_CHAR) {
                const rect = contentRef.current.getBoundingClientRect()
                onOpenSlashMenu(rect)
            }
        }
    }


    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault()
        if (!contentRef.current) return

        // Prefer HTML clipboard data so bold/italic/links are preserved as markdown
        // e.g. <strong>hello</strong> → **hello**, <a href="...">link</a> → [link](...)
        const htmlData = e.clipboardData.getData('text/html')
        const plainData = e.clipboardData.getData('text/plain')

        // Convert HTML → markdown if available, otherwise fall back to plain text
        const textToInsert = htmlData ? htmlToMarkdown(htmlData) : plainData
        if (!textToInsert) return

        const currentMarkdown = block.content || ''

        // Get cursor offset in the rendered HTML (visual characters)
        const selection = window.getSelection()
        let htmlCursorOffset = 0
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0)
            const preRange = document.createRange()
            preRange.selectNodeContents(contentRef.current)
            preRange.setEnd(range.startContainer, range.startOffset)
            htmlCursorOffset = preRange.toString().length
        }

        // Map visual cursor offset → position in markdown source string
        const mdInsertOffset = mapHtmlOffsetToMarkdownOffset(currentMarkdown, htmlCursorOffset)

        // Insert the pasted markdown at the correct position
        const newMarkdown = currentMarkdown.slice(0, mdInsertOffset) + textToInsert + currentMarkdown.slice(mdInsertOffset)

        // Update store — useLayoutEffect re-renders markdown → HTML immediately
        onUpdate({ content: newMarkdown })
    }

    const isEmpty = !block.content || block.content === '\n'

    const handleClick = (e: React.MouseEvent) => {
        // 1. Link Click Handling
        const target = e.target as HTMLElement
        const anchor = target.closest('a')

        if (anchor && anchor.getAttribute('href')) {
            // Force open in new tab
            window.open(anchor.getAttribute('href')!, '_blank', 'noopener,noreferrer')
            e.preventDefault()
            e.stopPropagation()
            e.preventDefault()
            e.stopPropagation()
            return
        }

        // 2. Focus Logic
        // If the user is Shift+Clicking, they are performing a range selection.
        // We MUST NOT trigger focus here, otherwise the active block changes and the anchor moves.
        if (e.shiftKey) return

        // If the user just completed a text drag selection, DO NOT manually trigger focus.
        // Triggering focus updates the global 'activeBlockId' state, causing a re-render
        // that destroys the native browser text selection.
        const selection = window.getSelection()
        const isTextSelected = selection && selection.toString().length > 0

        if (!isActive && !isTextSelected) {
            onFocus()
        }
    }

    const handleLocalKeyDown = (e: React.KeyboardEvent) => {
        // 1. Link Protection Logic
        if (e.key === 'Backspace') {
            const selection = window.getSelection()
            if (selection && selection.isCollapsed && selection.anchorNode) {
                const anchorNode = selection.anchorNode
                // Check if we are inside a link
                const link = anchorNode.nodeType === Node.TEXT_NODE
                    ? anchorNode.parentElement?.closest('a')
                    : (anchorNode as Element).closest('a')

                if (link && anchorNode.nodeType === Node.TEXT_NODE && anchorNode.parentElement === link) {
                    const text = anchorNode.textContent || ''
                    const range = selection.getRangeAt(0)

                    // If cursor is at the end of the link text
                    if (range.endOffset === text.length && text.length > 0) {
                        // Prevent browser from unwrapping the anchor tag
                        e.preventDefault()

                        // Manual deletion of last char
                        const newText = text.slice(0, -1)
                        anchorNode.textContent = newText

                        // Restore cursor to end
                        const newRange = document.createRange()
                        newRange.setStart(anchorNode, newText.length)
                        newRange.collapse(true)
                        selection.removeAllRanges()
                        selection.addRange(newRange)

                        // Trigger input handler to sync store
                        handleInput()
                        // Don't return, let onKeyDown fire (though we prevented default)
                    }
                }
            }
        }

        // 2. Propagate to parent
        onKeyDown(e)
    }

    return (
        <EditableBlock
            block={block}
            isActive={isActive}
            onUpdate={onUpdate}
            onFocus={onFocus}
            onBlur={onBlur}
        >
            <div
                ref={contentRef}
                className={`${styles.text} ${isEmpty ? styles.empty : ''} ${styles.markdownPreview}`}
                suppressContentEditableWarning
                onInput={handleInput}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                onBlur={onBlur}
                onKeyDown={handleLocalKeyDown}
                onClick={handleClick}
                onPaste={handlePaste}
                data-placeholder={isEmpty ? PLACEHOLDER_TEXT.TEXT : ''}
                data-show-always={showPlaceholderAlways ? "true" : "false"}
                id={`block-${block.id}`}
                style={{ outline: 'none' }}
            />
        </EditableBlock>
    )
}
