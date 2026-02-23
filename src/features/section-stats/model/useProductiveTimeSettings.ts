import { useState } from 'react'
import { getUserProductiveTime } from '@/entities/profile/api/profile-api'
import { useProfileStore } from '@/entities/profile/model/useProfileStore'
import { useBlockStore } from '@/entities/block/model/useBlockStore'
import { hexToRgba } from '@/shared/lib/utils/styleUtils'

export function useProductiveTimeSettings(blockId?: string) {
    const profileStore = useProfileStore()
    const { updateBlock } = useBlockStore()

    // Block Store Access (Conditional)
    const block = useBlockStore(state =>
        blockId ? state.blocks.find(b => b.id === blockId) : null
    )

    const [isAnalyzing, setIsAnalyzing] = useState(false)

    // Helper: Get Productive Time State
    const productiveTime = block && block.type === 'widget' && (block as any).config?.productiveTime
        ? (block as any).config.productiveTime
        : profileStore.productiveTime

    // Helper: Update Productive Time State
    const updateProductiveTime = (updates: Partial<typeof productiveTime>) => {
        if (blockId) {
            const currentConfig = (block as any)?.config || {}
            updateBlock(blockId, {
                config: {
                    ...currentConfig,
                    productiveTime: { ...productiveTime, ...updates }
                }
            })
        } else {
            // Global Store Update
            if (updates.style) profileStore.setProductiveTimeStyle(updates.style)
            if (updates.stats) profileStore.setProductiveTimeStats(updates.stats)
        }
    }

    const setProductiveTimeStyle = (style: string) => updateProductiveTime({ style })
    const setProductiveTimeStats = (stats: any) => updateProductiveTime({ stats, isAnalyzed: true })

    // Style helper
    const getSelectedStyle = (color: string) => ({
        background: hexToRgba(color, 0.1),
        borderColor: hexToRgba(color, 0.5),
        color: color,
        boxShadow: `0 0 15px ${hexToRgba(color, 0.2)}`,
        textShadow: `0 0 8px ${hexToRgba(color, 0.5)}`,
    })

    const handleAnalyze = async () => {
        const username = profileStore.username
        if (!username) return

        setIsAnalyzing(true)
        // Reset stats first
        const emptyStats = {
            morning: 0, daytime: 0, evening: 0, night: 0,
            commits: { morning: 0, daytime: 0, evening: 0, night: 0 }
        }
        setProductiveTimeStats(emptyStats)

        try {
            const stats = await getUserProductiveTime(username)
            await new Promise(resolve => setTimeout(resolve, 800))

            // Update with result
            if (blockId) {
                const currentConfig = (block as any)?.config || {}
                updateBlock(blockId, {
                    config: {
                        ...currentConfig,
                        productiveTime: {
                            ...productiveTime,
                            stats,
                            isAnalyzed: true
                        }
                    }
                })
            } else {
                profileStore.setProductiveTimeStats(stats)
            }
        } catch (error) {
            console.error('Analysis failed:', error)
            setProductiveTimeStats(emptyStats)
        } finally {
            setIsAnalyzing(false)
        }
    }

    return {
        accentColor: profileStore.accentColor,
        productiveTime,
        setProductiveTimeStyle,
        isAnalyzing,
        handleAnalyze,
        getSelectedStyle,
        username: profileStore.username
    }
}
