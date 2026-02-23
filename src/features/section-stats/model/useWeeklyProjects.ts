import { useProfileStore } from '@/entities/profile/model/useProfileStore'
import { useBlockStore } from '@/entities/block/model/useBlockStore'

export function useWeeklyProjects(blockId?: string) {
    // Global state (used as default/template)
    const globalWeeklyProjects = useProfileStore(state => state.weeklyProjects)

    // Block-specific state
    const blocks = useBlockStore(state => state.blocks)
    const updateBlock = useBlockStore(state => state.updateBlock)

    // Find the current block if blockId is provided
    const block = blockId ? blocks.find(b => b.id === blockId) : null
    const blockConfig = block && block.type === 'widget' ? (block as any).config : {}

    // Use block config if available, otherwise fallback to global
    const weeklyProjects = blockConfig.weeklyProjects || globalWeeklyProjects

    const setConfig = (newConfig: Partial<typeof weeklyProjects>) => {
        if (blockId && block) {
            // Update block config
            updateBlock(blockId, {
                config: {
                    ...blockConfig,
                    weeklyProjects: {
                        ...weeklyProjects,
                        ...newConfig
                    }
                }
            })
        } else {
            // Fallback to updating global store (for templates or backward compatibility)
            useProfileStore.getState().setWeeklyProjects(newConfig)
        }
    }

    return {
        weeklyProjects,
        setWeeklyProjects: setConfig,
        setConfig // Alias for consistency
    }
}
