import { Block } from '@/entities/block/model/types'

export interface BlockEventContext {
    blocks: Block[]
    block: Block
    onRemoveBlock: (id: string) => void
    onSetActiveBlock: (id: string | null) => void
    onInsertBlockAfter: (prevId: string, newBlock: Block, shouldFocus?: boolean) => void
    onAddBlock: (block: Block, index?: number, shouldFocus?: boolean) => void
    onUpdateBlock: (id: string, updates: Partial<Block>) => void
    onTurnIntoBlock: (id: string, newBlock: Block, maintainContent?: boolean) => void
}
