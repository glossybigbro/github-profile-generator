import { useEffect } from 'react'
import { useBlockStore } from '@/entities/block/model/useBlockStore'
import { createTextBlock } from '@/entities/block/model/blockUtils'

export function useCanvasEditor() {
    const store = useBlockStore()

    // Integrity Rule: Divider should NEVER be the last block.
    // Reactive check to ensure a text block always follows a divider at the end.
    useEffect(() => {
        const blocks = store.blocks
        if (blocks.length > 0) {
            const lastBlock = blocks[blocks.length - 1]
            if (lastBlock.type === 'divider') {
                store.addBlock(createTextBlock(), blocks.length, false)
            }
        }
    }, [store.blocks, store.addBlock])

    // UX Rule: Auto-focus on the first block when entering the editor.
    useEffect(() => {
        if (!store.activeBlockId && store.blocks.length > 0) {
            store.setActiveBlock(store.blocks[0].id)
        }
    }, []) // Run only once on mount

    // expose bulk actions explicitly from the store if needed (actually, store already contains it)
    return store
}
