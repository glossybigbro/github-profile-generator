import { useBlockStore } from '@/entities/block/model/useBlockStore'
import { useProfileStore } from '@/entities/profile/model/useProfileStore'

export function useWeeklyLanguages(blockId?: string) {
    // If blockId provided, use block-specific settings
    // Otherwise, use global settings (for defaults)
    const blocks = useBlockStore(state => state.blocks)
    const updateBlock = useBlockStore(state => state.updateBlock)

    const globalWeeklyLanguages = useProfileStore(state => state.weeklyLanguages)
    const setGlobalWeeklyLanguages = useProfileStore(state => state.setWeeklyLanguages)

    // Get settings from block or global
    const block = blockId ? blocks.find(b => b.id === blockId) : null
    const blockConfig = block && block.type === 'widget' ? (block as any).config : null
    const weeklyLanguages = blockId && blockConfig?.weeklyLanguages
        ? blockConfig.weeklyLanguages
        : globalWeeklyLanguages

    const toggleLanguage = (lang: string) => {
        if (!weeklyLanguages) return

        const excluded = weeklyLanguages.excludeLanguages || []

        // CRITICAL: Create new array to trigger update
        const newExcluded = excluded.includes(lang)
            ? excluded.filter((l: string) => l !== lang)
            : [...excluded, lang]

        const newConfig = { excludeLanguages: newExcluded }

        // Update block-specific or global
        if (blockId) {
            const currentConfig = blockConfig || {}
            updateBlock(blockId, {
                config: {
                    ...currentConfig,
                    weeklyLanguages: { ...weeklyLanguages, ...newConfig }
                }
            })
        } else {
            setGlobalWeeklyLanguages(newConfig)
        }
    }

    const setConfig = (newConfig: Partial<typeof weeklyLanguages>) => {
        if (blockId) {
            const currentConfig = blockConfig || {}
            updateBlock(blockId, {
                config: {
                    ...currentConfig,
                    weeklyLanguages: { ...weeklyLanguages, ...newConfig }
                }
            })
        } else {
            setGlobalWeeklyLanguages(newConfig)
        }
    }

    return {
        weeklyLanguages,
        toggleLanguage,
        setConfig
    }
}
