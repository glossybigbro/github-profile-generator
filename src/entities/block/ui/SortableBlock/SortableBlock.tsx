'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { BlockHandle } from '../BlockHandle'
import { ReactNode } from 'react'

interface SortableBlockProps {
    blockId: string
    blockType: string
    onDelete: () => void
    onDuplicate?: () => void
    onCopy?: () => void
    children: ReactNode
    isDraggingAny?: boolean
    isSelected?: boolean
    isDropTarget?: boolean
    dropDirection?: 'top' | 'bottom'
}

export function SortableBlock({
    blockId,
    blockType,
    onDelete,
    onDuplicate,
    onCopy,
    children,
    isDraggingAny = false,
    isSelected = false,
    isDropTarget = false,
    dropDirection = 'bottom'
}: SortableBlockProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: blockId })

    const isGhost = isSelected && isDraggingAny && !isDragging

    let currentOpacity = 1
    if (isDragging) currentOpacity = 0.3 // Keep visible but dimmed; DragOverlay shows the full-opacity copy
    else if (isGhost) currentOpacity = 0.3 // Other selected items are also dimmed

    // Force the list to remain completely static during drag to mimic Notion.
    // Notion doesn't shift items apart; it just relies on a blue drop-indicator line.
    const shouldFreezeTransform = isDraggingAny

    const style: React.CSSProperties = {
        transform: shouldFreezeTransform ? undefined : CSS.Transform.toString(transform),
        transition: shouldFreezeTransform ? undefined : transition,
        opacity: currentOpacity,
        pointerEvents: isGhost ? 'none' : undefined,
    }

    return (
        <div
            ref={setNodeRef}
            className={`block-wrapper-with-handle ${isSelected ? 'selected' : ''}`}
            style={style}
            data-is-dragging={isDraggingAny ? 'true' : 'false'}
            data-is-selected={isSelected ? 'true' : 'false'}
            data-block-id={blockId}
        >
            <BlockHandle
                blockId={blockId}
                blockType={blockType}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
                onCopy={onCopy}
                dragHandleProps={{ ...attributes, ...listeners }}
                showHandle={!isDraggingAny}
            />
            {children}
            {isDropTarget && (
                <div
                    className="sortable-drop-indicator"
                    style={{
                        top: dropDirection === 'top' ? '-2px' : undefined,
                        bottom: dropDirection === 'bottom' ? '-2px' : undefined
                    }}
                />
            )}
        </div>
    )
}
