'use client'

import { useState, useRef, useEffect } from 'react'
import styles from './BlockHandle.module.css'

interface BlockHandleProps {
    blockId: string
    blockType: string
    onDelete: () => void
    onDuplicate?: () => void
    onCopy?: () => void
    showHandle?: boolean
    dragHandleProps?: any // DnD Kit listeners and attributes
}

export function BlockHandle({
    blockId,
    blockType,
    onDelete,
    onDuplicate,
    onCopy,
    showHandle = true,
    dragHandleProps
}: BlockHandleProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false)
            }
        }

        if (isMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside)
            return () => document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isMenuOpen])

    if (!showHandle) return null

    const handleMenuToggle = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsMenuOpen(!isMenuOpen)
    }

    const handleMenuAction = (action: () => void) => {
        action()
        setIsMenuOpen(false)
    }

    return (
        <div
            className={`${styles.handleWrapper} ${blockType === 'widget' ? styles.widgetHandle : ''}`}
            ref={menuRef}
            data-block-type={blockType}
        >
            {/* Drag Handle - entire area is draggable */}
            <div
                className={styles.dragHandle}
                {...dragHandleProps}
            >
                {/* Click button overlaid on drag handle */}
                <button
                    className={styles.menuButton}
                    onClick={handleMenuToggle}
                    onMouseDown={(e) => {
                        // Prevent drag from starting when clicking the button
                        e.stopPropagation()
                    }}
                    aria-label="Block options"
                    type="button"
                >
                    <span className={styles.dragIcon}>⋮⋮</span>
                </button>
            </div>

            {/* Dropdown Menu */}
            {isMenuOpen && (
                <div className={styles.menu}>
                    <button
                        className={styles.menuItem}
                        onClick={(e) => {
                            e.stopPropagation()
                            handleMenuAction(onDelete)
                        }}
                        type="button"
                    >
                        <span className={styles.menuIcon}>🗑️</span>
                        <span>Delete</span>
                    </button>

                    {onDuplicate && (
                        <button
                            className={styles.menuItem}
                            onClick={(e) => {
                                e.stopPropagation()
                                handleMenuAction(onDuplicate)
                            }}
                            type="button"
                        >
                            <span className={styles.menuIcon}>📋</span>
                            <span>Duplicate</span>
                        </button>
                    )}

                    {onCopy && (
                        <button
                            className={styles.menuItem}
                            onClick={(e) => {
                                e.stopPropagation()
                                handleMenuAction(onCopy)
                            }}
                            type="button"
                        >
                            <span className={styles.menuIcon}>📄</span>
                            <span>Copy</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}
