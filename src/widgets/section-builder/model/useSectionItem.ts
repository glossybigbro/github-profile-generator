import { useState, useRef, useEffect } from 'react'
import { useOnClickOutside } from '@/shared/lib/hooks/useOnClickOutside'
import { CUSTOMIZABLE_SECTION_IDS } from '../config/sectionConstants'
import { Section } from '@/entities/profile/model/sections'
import { useBlockStore } from '@/entities/block/model/useBlockStore'
import { useProfileStore } from '@/entities/profile/model/useProfileStore'
import { createBioTemplate, createTextBlock } from '@/entities/block/model/blockUtils'

interface UseSectionItemProps {
    section: Section
    isLocked: boolean
    onToggle: () => void
    onAdd?: () => void
    onFinalize?: (sectionId: string) => void
}

export function useSectionItem({ section, isLocked, onToggle, onAdd, onFinalize }: UseSectionItemProps) {
    const isCustomizable = !isLocked && CUSTOMIZABLE_SECTION_IDS.includes(section.id as any)

    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const [wasToggled, setWasToggled] = useState(false)
    const [activeWidgetBlockId, setActiveWidgetBlockId] = useState<string | null>(null)
    const popoverRef = useRef<HTMLDivElement>(null)

    // Access block store safely
    const { blocks, addBlocks, removeBlocksByPreviewId, replaceBlocksByPreviewId, commitPreviewBlocks } = useBlockStore()

    // State to track Bio preview transaction
    const [bioPreviewId, setBioPreviewId] = useState<string | null>(null)

    // Listen for Add button click from settings panel
    useEffect(() => {
        const handleAdd = (e: Event) => {
            const eventType = e.type // 'weekly-languages-add' or 'weekly-projects-add'

            let targetSectionId = ''
            if (eventType === 'weekly-languages-add') targetSectionId = 'weekly-languages'
            if (eventType === 'weekly-projects-add') targetSectionId = 'weekly-projects'
            if (eventType === 'activity-graph-add') targetSectionId = 'activity-graph'
            if (eventType === 'productive-time-add') targetSectionId = 'productive-time'
            if (eventType === 'waka-10k-hours-add') targetSectionId = 'waka-10k-hours'

            // Bio has its own Confirm logic handled inside BioSettings or separate event
            // But if we reuse this handler for Bio (e.g. 'bio-add'), we should handle it.
            // For now, let's assume Bio uses the same 'Confirm' button pattern if applicable.
            if (eventType === 'bio-add') targetSectionId = 'yaml-bio'

            if (isSettingsOpen && section.id === targetSectionId) {
                setIsSettingsOpen(false)
                setWasToggled(false) // Finalize widget

                // Clear preview ID as it's now committed
                if (section.id === 'yaml-bio') {
                    if (bioPreviewId) {
                        commitPreviewBlocks(bioPreviewId)
                    }
                    setBioPreviewId(null)
                }

                // Call finalize to add empty line if needed
                if (onFinalize) {
                    onFinalize(section.id)
                }

                // Dispatch event to focus title
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('focus-widget-title', {
                        detail: { widgetType: section.id }
                    }))
                }, 100) // Small delay to ensure DOM is ready
            }
        }

        window.addEventListener('weekly-languages-add', handleAdd)
        window.addEventListener('weekly-projects-add', handleAdd)
        window.addEventListener('activity-graph-add', handleAdd)
        window.addEventListener('productive-time-add', handleAdd)
        window.addEventListener('waka-10k-hours-add', handleAdd)
        window.addEventListener('bio-add', handleAdd) // Add bio event listener
        return () => {
            window.removeEventListener('weekly-languages-add', handleAdd)
            window.removeEventListener('weekly-projects-add', handleAdd)
            window.removeEventListener('activity-graph-add', handleAdd)
            window.removeEventListener('productive-time-add', handleAdd)
            window.removeEventListener('waka-10k-hours-add', handleAdd)
        }
    }, [isSettingsOpen, section.id, onFinalize, bioPreviewId, commitPreviewBlocks])

    // Cancel: Close panel and rollback preview
    useOnClickOutside(popoverRef, () => {
        if (isSettingsOpen && isCustomizable) {
            setIsSettingsOpen(false)

            // Rollback for Single Widgets
            if (wasToggled && activeWidgetBlockId) {
                const store = useBlockStore.getState()
                const blocks = store.blocks
                const widgetIndex = blocks.findIndex(b => b.id === activeWidgetBlockId)

                if (widgetIndex !== -1) {
                    // Check if the widget is immediately before the auto-generated empty end block
                    const isSecondToLast = widgetIndex === blocks.length - 2
                    const lastBlock = blocks[blocks.length - 1]
                    const isLastEmptyText = lastBlock && lastBlock.type === 'text' &&
                        (!(lastBlock as any).content || (lastBlock as any).content.trim() === '')

                    if (isSecondToLast && isLastEmptyText) {
                        // If it's at the end, just remove it. The auto-generated empty line acts as the space.
                        store.removeBlock(activeWidgetBlockId)
                    } else {
                        // If it's in the middle of the document, turn it back into an empty text block to preserve the gap.
                        store.turnIntoBlock(activeWidgetBlockId, createTextBlock(), false)
                    }
                }
                setWasToggled(false)
            }

            // Rollback for Bio Transaction
            if (section.id === 'yaml-bio' && bioPreviewId) {
                removeBlocksByPreviewId(bioPreviewId, true)
                setBioPreviewId(null)
                setWasToggled(false)
            }

            setActiveWidgetBlockId(null)
        }
    })

    // Reset wasToggled when section is disabled from outside (e.g., after block deletion)
    useEffect(() => {
        if (!section.enabled) {
            setWasToggled(false)
            setIsSettingsOpen(false)
        }
    }, [section.enabled])

    const handleToggleSettings = (e: React.MouseEvent) => {
        if (isCustomizable) {
            if (!isSettingsOpen) {
                // Opening settings - use onAdd for duplicates!
                setIsSettingsOpen(true)

                if (onAdd) {
                    // Special Handling for Bio: Multi-Block Transaction
                    if (section.id === 'yaml-bio') {
                        const bioData = useProfileStore.getState().bio
                        const previewId = `bio-preview-${Date.now()}`
                        setBioPreviewId(previewId)

                        // Insert multiple blocks template with ACTUAL DATA
                        // Pass 'false' to shouldFocus so blocks start in View Mode (Rendered)
                        addBlocks(createBioTemplate(previewId, bioData), undefined, false)
                        setWasToggled(true)
                        return
                    }

                    onAdd() // Standard single-block widget add

                    // Find the widget block we just added
                    setTimeout(() => {
                        const currentBlocks = useBlockStore.getState().blocks
                        const widgetBlocks = currentBlocks.filter(
                            (b: any) => b.type === 'widget' && b.widgetType === section.id
                        )
                        if (widgetBlocks.length > 0) {
                            const lastWidget = widgetBlocks[widgetBlocks.length - 1]
                            setActiveWidgetBlockId(lastWidget.id)
                        }
                    }, 50)
                } else {
                    onToggle() // Fallback
                }
                setWasToggled(true)
            } else {
                // Closing settings without Add button - cancel operation
                setIsSettingsOpen(false)

                // Rollback Single Widget
                if (wasToggled && activeWidgetBlockId) {
                    useBlockStore.getState().turnIntoBlock(activeWidgetBlockId, createTextBlock(), false)
                    setWasToggled(false)
                }

                // Rollback for Bio Transaction
                if (section.id === 'yaml-bio' && bioPreviewId) {
                    removeBlocksByPreviewId(bioPreviewId, true)
                    setBioPreviewId(null)
                    setWasToggled(false)
                }

                setActiveWidgetBlockId(null)
            }
        } else {
            e.stopPropagation()
            onToggle()
        }
    }

    const handleOpenSettings = (e: React.MouseEvent | React.KeyboardEvent) => {
        e.stopPropagation()
        if ('key' in e && (e.key !== 'Enter' && e.key !== ' ')) {
            return
        }
        if ('key' in e) {
            e.preventDefault()
        }
        setIsSettingsOpen(true)
    }

    // Reactive Preview Effect for Bio
    useEffect(() => {
        if (section.id === 'yaml-bio' && bioPreviewId && isSettingsOpen) {
            // Standard Zustand subscribe
            const unsub = useProfileStore.subscribe((state: any, prevState: any) => {
                if (state.bio !== prevState.bio) {
                    // Atomic Replace
                    replaceBlocksByPreviewId(bioPreviewId, createBioTemplate(bioPreviewId, state.bio))
                }
            })

            return () => unsub()
        }
    }, [section.id, bioPreviewId, isSettingsOpen, replaceBlocksByPreviewId])

    // 1. Determine if it visually needs an API key lock
    const isWakaTimeLocked = section.requires === 'wakatime' && !useProfileStore(state => state.wakatimeKey)
    const isGitHubTokenLocked = section.requires === 'github-token' && !useProfileStore(state => state.githubToken)
    const isApiKeyLocked = isWakaTimeLocked || isGitHubTokenLocked
    const sectionOpacity = isLocked ? 0.5 : 1
    const shouldShowAddButton = isSettingsOpen

    return {
        isSettingsOpen,
        popoverRef,
        isCustomizable,
        shouldShowAddButton,
        activeWidgetBlockId,
        handleToggleSettings,
        sectionOpacity,
        isWakaTimeLocked,
        isGitHubTokenLocked,
        isApiKeyLocked
    }
}
