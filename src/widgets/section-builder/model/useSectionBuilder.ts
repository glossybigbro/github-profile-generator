import {
    useSensor,
    useSensors,
    MouseSensor,
    TouchSensor,
    KeyboardSensor,
    DragEndEvent
} from '@dnd-kit/core'
import {
    sortableKeyboardCoordinates,
    arrayMove
} from '@dnd-kit/sortable'
import { useProfileStore } from '@/entities/profile/model/useProfileStore'

import { useBlockStore } from '@/entities/block/model/useBlockStore'
import { createWidgetBlock } from '@/entities/block/model/blockUtils'

export function useSectionBuilder() {
    const { sections, toggleSection: toggleProfileSection, reorderSections } = useProfileStore()
    const { addBlock, addBlockAtCursor, removeBlock, blocks, activeBlockId } = useBlockStore()

    const sensors = useSensors(
        useSensor(MouseSensor),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event

        if (over && active.id !== over.id) {
            const oldIndex = sections.findIndex((s) => s.id === active.id)
            const newIndex = sections.findIndex((s) => s.id === over.id)

            reorderSections(arrayMove(sections, oldIndex, newIndex))
        }
    }

    // Add a widget instance (supports duplicates)
    const addWidget = (sectionId: string) => {
        const section = sections.find(s => s.id === sectionId)
        if (!section) return

        // Enable in profile store if first widget
        if (!section.enabled) {
            toggleProfileSection(sectionId)
        }

        // Get default config from ProfileStore for this widget type
        let defaultConfig: Record<string, any> = {}

        if (sectionId === 'weekly-languages') {
            // Copy global settings as initial config for this instance
            const profileState = useProfileStore.getState()
            defaultConfig = { weeklyLanguages: { ...profileState.weeklyLanguages } }
        } else if (sectionId === 'weekly-projects') {
            const profileState = useProfileStore.getState()
            defaultConfig = { weeklyProjects: { ...profileState.weeklyProjects } }
        } else if (sectionId === 'activity-graph') {
            const {
                activityGraphTheme,
                activityGraphAreaFill,
                activityGraphHideBorder,
                activityGraphHideTitle,
                activityGraphGrid,
                activityGraphDays,
                activityGraphRadius,
                activityGraphCustomTitle
            } = useProfileStore.getState()

            defaultConfig = {
                activityGraphTheme,
                activityGraphAreaFill,
                activityGraphHideBorder,
                activityGraphHideTitle,
                activityGraphGrid,
                activityGraphDays,
                activityGraphRadius,
                activityGraphCustomTitle
            }
        } else if (sectionId === 'productive-time') {
            const profileState = useProfileStore.getState()
            defaultConfig = { productiveTime: { ...profileState.productiveTime } }
        }
        // Add more widget types here as needed

        // Always add widget with independent config!
        addBlockAtCursor(createWidgetBlock(sectionId, defaultConfig))
    }

    // Remove all widgets of a type and disable section
    const removeAllWidgets = (sectionId: string) => {
        const section = sections.find(s => s.id === sectionId)
        if (!section) return

        // Remove all widgets of this type
        const widgetsToRemove = blocks.filter(b => b.type === 'widget' && (b as any).widgetType === sectionId)
        widgetsToRemove.forEach(widget => removeBlock(widget.id))

        // Disable in profile store
        if (section.enabled) {
            toggleProfileSection(sectionId)
        }
    }

    // Legacy toggle function (for non-customizable sections)
    const toggleSection = (sectionId: string) => {
        const section = sections.find(s => s.id === sectionId)
        if (!section) return

        if (!section.enabled) {
            addWidget(sectionId)
        } else {
            removeAllWidgets(sectionId)
        }
    }

    // Finalize widget: Add empty line if widget is at last position
    const finalizeWidget = (sectionId: string) => {
        const widgetBlock = blocks.find(b => b.type === 'widget' && (b as any).widgetType === sectionId)
        if (!widgetBlock) return

        const widgetIndex = blocks.findIndex(b => b.id === widgetBlock.id)
        const isLastBlock = widgetIndex === blocks.length - 1

        // Only add empty line if widget is at the last position
        if (isLastBlock) {
            addBlock({
                id: `block-${Date.now()}-empty`,
                type: 'text',
                content: '',
                createdAt: Date.now()
            }, widgetIndex + 1)
        }
    }

    return {
        sections,
        sensors,
        handleDragEnd,
        toggleSection,
        addWidget,
        removeAllWidgets,
        finalizeWidget
    }
}
