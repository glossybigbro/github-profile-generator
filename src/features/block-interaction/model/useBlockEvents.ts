import { useCallback } from 'react'
import { Block } from '@/entities/block/model/types'
import {
    handleArrowNavigation,
    handleEnterKey,
    handleBackspace,
    handleDividerEvents,
    handleTab,
    BlockEventContext
} from './index' // Importing from aggregated index

interface UseBlockEventsProps {
    blocks: Block[]
    onRemoveBlock: (blockId: string) => void
    onSetActiveBlock: (blockId: string | null) => void
    onInsertBlockAfter: (prevBlockId: string, newBlock: Block, shouldFocus?: boolean) => void
    onAddBlock: (block: Block, index?: number, shouldFocus?: boolean) => void
    onUpdateBlock: (blockId: string, updates: Partial<Block>) => void
    onTurnIntoBlock: (blockId: string, newBlock: Block, maintainContent?: boolean) => void
}

export function useBlockEvents(props: UseBlockEventsProps) { // Use 'props' grouping to easily pass context

    const handleKeyDown = useCallback((e: React.KeyboardEvent, block: Block) => {
        // IME Composition Fix
        if (e.nativeEvent.isComposing) {
            return
        }

        // Create Context Object
        const ctx: BlockEventContext = {
            ...props,
            block // Add current block to context
        }

        // 1. Divider Specific Logic
        if (handleDividerEvents(e, ctx)) {
            return
        }

        // 2. Tab / Shift+Tab (Bullet indent/outdent)
        handleTab(e, ctx)

        // 3. General Block Logic (Enter)
        handleEnterKey(e, ctx)

        // 4. Navigation (Arrow Up/Down)
        handleArrowNavigation(e, ctx)

        // 5. Deletion / Merging (Backspace)
        handleBackspace(e, ctx)

    }, [props]) // Dependency on props object (React keeps props stable if not destructured, but better to check individual deps if needed. 
    // Here 'props' contains functions which should ideally be stable cached in parent. 
    // For strictness, we might want: [props.blocks, props.onRemoveBlock, ...] 
    // But passing 'props' spread into 'ctx' is cleaner for code. 
    // We assume parent passes stable references.

    return { handleKeyDown }
}
