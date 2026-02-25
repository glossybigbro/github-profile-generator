import { ProfileState } from '../model/useProfileStore'
import { ExtendedGeneratorConfig, MarkdownSection } from '../lib/markdown/types'
import { Section } from '../model/sections'

/**
 * Transforms the Profile Store state into a strict Generator Config.
 * This adapter is crucial to bridge the gap between UI state (Client) and Generator Logic (Shared/Server).
 * 
 * @param store The current state of the Profile Store
 * @returns A strictly typed configuration object for the markdown generator
 */
export const transformStoreToConfig = (store: ProfileState): ExtendedGeneratorConfig => {
    // 1. Array Normalization: Ensure sections is always an array
    const rawSections = store.sections || []

    // 2. Type Hardening: Ensure strict alignment of Section Configs
    const normalizedSections = rawSections.map(section => {
        // Deep clone to prevent mutation
        const sectionClone = { ...section }

        // Header Config Normalization
        if (sectionClone.headerConfig) {
            sectionClone.headerConfig = {
                ...sectionClone.headerConfig,
                // Force 'left' as default if undefined, matching strict union type
                align: sectionClone.headerConfig.align || 'left'
            }
        }

        return sectionClone
    })

    // 3. Construct Final Config (Optimized for JSON Export & Generator)
    // We intentionally OMIT the 'sections' array from the exported config
    // because it is a static widget catalog that bloats the JSON file.
    // The actual user content is stored entirely within 'blocks'.
    return {
        // Spread base properties
        username: store.username,
        theme: store.theme,
        selectedTemplate: store.selectedTemplate,
        bio: store.bio,
        productiveTime: store.productiveTime,

        // Activity Graph
        activityGraphTheme: store.activityGraphTheme,
        activityGraphAreaFill: store.activityGraphAreaFill,
        activityGraphHideBorder: store.activityGraphHideBorder,
        activityGraphHideTitle: store.activityGraphHideTitle,
        activityGraphGrid: store.activityGraphGrid,
        activityGraphDays: store.activityGraphDays,
        activityGraphRadius: store.activityGraphRadius,
        activityGraphCustomTitle: store.activityGraphCustomTitle,

        // Weekly Settings
        weeklyLanguages: store.weeklyLanguages,
        weeklyProjects: store.weeklyProjects,
    } as ExtendedGeneratorConfig
}
