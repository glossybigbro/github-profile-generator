import { Block } from '@/entities/block/model/types'
import styles from './EditableBlock.module.css'

interface EditableBlockProps<T extends Block> {
    block: T
    isActive: boolean
    onUpdate: (updates: Partial<T>) => void
    onFocus: () => void
    onBlur: () => void
    children: React.ReactNode
}

export function EditableBlock<T extends Block>({
    block,
    isActive,
    onUpdate,
    onFocus,
    onBlur,
    children,
    tabIndex,
    onKeyDown,
    domRef,
    style,
}: EditableBlockProps<T> & {
    tabIndex?: number
    onKeyDown?: React.KeyboardEventHandler
    domRef?: React.Ref<HTMLDivElement>
    style?: React.CSSProperties
}) {
    const handleClick = (e: React.MouseEvent) => {
        // If the user is Shift+Clicking, they are performing a range selection.
        // We MUST NOT overwrite the anchor point here, otherwise the range will be 1 block.
        // The wrapper in GlassCanvas.tsx will handle the actual range selection logic.
        if (e.shiftKey) return

        // Focus Logic
        // Only trigger focus if there's no active text selection
        // This prevents drag-to-select from abruptly clearing due to an immediate re-render
        const selection = window.getSelection()
        const isTextSelected = selection && selection.toString().length > 0

        if (!isActive && !isTextSelected) {
            onFocus()
        }
    }

    return (
        <div
            ref={domRef}
            className={`${styles.block} ${isActive ? styles.active : ''}`}
            onClick={handleClick}
            data-block-id={block.id}
            tabIndex={tabIndex}
            onKeyDown={onKeyDown}
            style={{ ...block.style, ...style }}
        >
            {children}
        </div>
    )
}
