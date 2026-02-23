import { useState, useCallback, useEffect } from 'react'
import { generateMarkdown } from '@/entities/profile/lib/markdown/generator'
import { transformStoreToConfig } from '@/entities/profile/lib/mappers'
import { useProfileStore } from '@/entities/profile/model/useProfileStore'
import { useBlockStore } from '@/entities/block/model/useBlockStore'

const EXPORT_CONFIG = {
    FILENAME: 'README.md',
    MIME_TYPE: 'text/markdown'
} as const

export function useProfileExport() {

    const [isCopied, setIsCopied] = useState(false)

    // Generate markdown for preview
    const [markdown, setMarkdown] = useState('')

    // Update markdown when hook is called (or we could use useEffect to sync with store changes)
    const store = useProfileStore()
    const blocks = useBlockStore((state) => state.blocks)

    useEffect(() => {
        const config = {
            ...transformStoreToConfig(store),
            blocks
        }
        setMarkdown(generateMarkdown(config))
    }, [store, blocks])

    // Check for dynamic features (Weekly Projects, Languages, Activity Graph, Productive Time)
    const hasDynamicFeatures = blocks.some(block =>
        ['weekly-projects', 'weekly-languages', 'productive-time', 'activity-graph'].includes(block.type)
    )

    const copyToClipboard = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(markdown)
            setIsCopied(true)
            setTimeout(() => setIsCopied(false), 2000)
        } catch (err) {
            console.error('Failed to copy to clipboard:', err)
        }
    }, [markdown])

    const handleDownload = useCallback(async () => {
        try {
            // Lazy import modules
            const { saveAs } = await import('file-saver')

            if (!hasDynamicFeatures) {
                // Static Mode: Download single README.md
                const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" })
                saveAs(blob, "README.md")
                return
            }

            // Dynamic Mode: Generate ZIP with Workflow & Config
            const JSZip = (await import('jszip')).default
            const { generateProfileUpdateWorkflow } = await import('./workflowGenerator')

            const zip = new JSZip()

            // 1. Add README.md
            zip.file("README.md", markdown)

            // 2. Add Config (Glossy Config) - Persist settings!
            const config = {
                ...transformStoreToConfig(store),
                blocks
            }
            zip.file("glossy-config.json", JSON.stringify(config, null, 2))

            // 3. Add GitHub Actions Workflow
            const username = store.username || 'your-username'
            const workflow = generateProfileUpdateWorkflow(username)
            zip.file(".github/workflows/update-profile.yml", workflow)

            // 4. Generate and Download
            const content = await zip.generateAsync({ type: "blob" })
            saveAs(content, `${username}-profile-kit.zip`)

        } catch (err) {
            console.error('Failed to download:', err)
            alert('Failed to generate export. Please try again.')
        }
    }, [markdown, store, blocks, hasDynamicFeatures])

    return { markdown, copyToClipboard, handleDownload, isCopied, hasDynamicFeatures }
}
