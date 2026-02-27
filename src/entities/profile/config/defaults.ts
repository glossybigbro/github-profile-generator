import { GeneratorConfig } from '../lib/markdown/types'
import { ProductiveTimeStyleId } from './productive-time'

export const WEEKLY_LANGUAGES_DEFAULTS = {
    weeklyLanguages: {
        style: 'progress' as const,
        count: 5,
        excludeLanguages: ['Markdown', 'JSON', 'YAML', 'Text', 'XML', 'HTML', 'CSS', 'Shell', 'Dockerfile'],
        sortBy: 'usage' as const
    }
}

export const WEEKLY_PROJECTS_DEFAULTS = {
    weeklyProjects: {
        style: 'progress' as const,
        count: 5,
        sortBy: 'commits' as const
    }
}

export const DEFAULT_ACTIVITY_GRAPH = {
    theme: 'github-light', // or 'tokyo-night' based on preference
    areaFill: false,
    hideBorder: false,
    hideTitle: false,
    grid: true,
    days: 31,
    radius: 2,
    customTitle: ''
}

export const DEFAULT_THEME = 'github-light'
export const DEFAULT_TEMPLATE = 'unique'

/**
 * Creates a default GeneratorConfig for a given username.
 * Used by:
 * 1. API Route (server-side generation)
 * 2. Profile Store (client-side initial state)
 */
export const createDefaultConfig = (username: string): GeneratorConfig => ({
    username,
    selectedTemplate: DEFAULT_TEMPLATE,
    theme: DEFAULT_THEME,

    // Activity Graph Defaults
    activityGraphTheme: 'github',
    activityGraphAreaFill: DEFAULT_ACTIVITY_GRAPH.areaFill,
    activityGraphHideBorder: DEFAULT_ACTIVITY_GRAPH.hideBorder,
    activityGraphHideTitle: DEFAULT_ACTIVITY_GRAPH.hideTitle,
    activityGraphGrid: DEFAULT_ACTIVITY_GRAPH.grid,
    activityGraphDays: DEFAULT_ACTIVITY_GRAPH.days,
    activityGraphRadius: DEFAULT_ACTIVITY_GRAPH.radius,
    activityGraphCustomTitle: DEFAULT_ACTIVITY_GRAPH.customTitle,

    // Productive Time Defaults (Placeholder)
    productiveTime: {
        style: 'cyber',
        isAnalyzed: false,
        stats: {
            morning: 0, daytime: 0, evening: 0, night: 0,
            commits: { morning: 0, daytime: 0, evening: 0, night: 0 }
        }
    },

    // Weekly Settings Defaults
    weeklyLanguages: WEEKLY_LANGUAGES_DEFAULTS.weeklyLanguages,
    weeklyProjects: WEEKLY_PROJECTS_DEFAULTS.weeklyProjects,

    sections: []
})
