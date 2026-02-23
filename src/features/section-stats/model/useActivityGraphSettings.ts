import { useProfileStore } from '@/entities/profile/model/useProfileStore'
import { useBlockStore } from '@/entities/block/model/useBlockStore'

export function useActivityGraphSettings(blockId?: string) {
    // 1. Global Store Access
    const profileStore = useProfileStore()

    // 2. Block Store Access (Conditional)
    const block = useBlockStore(state =>
        blockId ? state.blocks.find(b => b.id === blockId) : null
    )
    const updateBlock = useBlockStore(state => state.updateBlock)

    // Helper to get value (Block Config > Global Store)
    const getValue = <K extends keyof typeof profileStore>(key: K) => {
        if (block && block.type === 'widget') {
            const config = (block as any).config || {}
            return config[key] !== undefined ? config[key] : profileStore[key]
        }
        return profileStore[key]
    }

    // Helper to set value (Block Config vs Global Store)
    const setValue = (key: string, value: any) => {
        if (blockId) {
            const currentConfig = (block as any)?.config || {}
            updateBlock(blockId, {
                config: { ...currentConfig, [key]: value }
            })
        } else {
            // Dynamic dispatch to profile store setters
            // Capitalize first letter for setter name: "set" + "ActivityGraphTheme"
            const setterName = `set${key.charAt(0).toUpperCase() + key.slice(1)}` as keyof typeof profileStore
            const setter = profileStore[setterName] as Function
            if (typeof setter === 'function') {
                setter(value)
            }
        }
    }

    return {
        activityGraphTheme: getValue('activityGraphTheme'),
        setActivityGraphTheme: (v: string) => setValue('activityGraphTheme', v),

        activityGraphAreaFill: getValue('activityGraphAreaFill'),
        setActivityGraphAreaFill: (v: boolean) => setValue('activityGraphAreaFill', v),

        activityGraphHideBorder: getValue('activityGraphHideBorder'),
        setActivityGraphHideBorder: (v: boolean) => setValue('activityGraphHideBorder', v),

        activityGraphHideTitle: getValue('activityGraphHideTitle'),
        setActivityGraphHideTitle: (v: boolean) => setValue('activityGraphHideTitle', v),

        activityGraphGrid: getValue('activityGraphGrid'),
        setActivityGraphGrid: (v: boolean) => setValue('activityGraphGrid', v),

        activityGraphDays: getValue('activityGraphDays'),
        setActivityGraphDays: (v: number) => setValue('activityGraphDays', v),

        activityGraphRadius: getValue('activityGraphRadius'),
        setActivityGraphRadius: (v: number) => setValue('activityGraphRadius', v),

        activityGraphCustomTitle: getValue('activityGraphCustomTitle'),
        setActivityGraphCustomTitle: (v: string) => setValue('activityGraphCustomTitle', v),
    }
}
