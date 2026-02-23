import { useState } from 'react'
import { useProfileStore } from '@/entities/profile/model/useProfileStore'
import { transformStoreToConfig } from '@/entities/profile/lib/mappers'
import { generateMarkdown } from '@/entities/profile/lib/markdown/generator'

export const PREVIEW_TABS = {
    PREVIEW: 'preview',
    CODE: 'code'
} as const

export type PreviewTab = typeof PREVIEW_TABS[keyof typeof PREVIEW_TABS]

export function usePreviewPanel() {
    const [activeTab, setActiveTab] = useState<PreviewTab>(PREVIEW_TABS.PREVIEW)
    const store = useProfileStore()

    const generateConfig = () => {
        const { useBlockStore } = require('@/entities/block/model/useBlockStore')
        const blocks = useBlockStore.getState().blocks
        return {
            ...transformStoreToConfig(store),
            blocks
        }
    }

    const getGeneratedMarkdown = () => {
        const config = generateConfig()
        return generateMarkdown(config)
    }

    return {
        activeTab,
        setActiveTab,
        generateConfig,
        getGeneratedMarkdown
    }
}
