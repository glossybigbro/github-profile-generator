import { ProductiveTimeStyleId } from '@/entities/profile/config/productive-time'

/**
 * Markdown Section Configuration
 * 
 * @description
 * Represents a single section in the generated markdown profile.
 * Each section can be enabled/disabled and has display properties.
 */
export interface MarkdownSection {
    /** Unique identifier for the section (e.g., 'activity-graph') */
    id: string
    /** Display name shown in the UI */
    name: string
    /** Whether this section is currently enabled for generation */
    enabled?: boolean
    /** Display width: 'full', 'half', or 'compact' */
    width?: string
    /** Optional type for special sections like headers */
    type?: 'section' | 'header' | 'text' | 'divider'
    /** Content for text-based sections (e.g., headers) */
    content?: string
    /** Configuration for header sections */
    headerConfig?: {
        level: 1 | 2 | 3 | 4
        align: 'left' | 'center' | 'right'
        showDivider: boolean
    }
}

/**
 * Generator Configuration
 * 
 * @description
 * Complete configuration object passed to markdown generators.
 * Contains user profile data and all customization settings.
 */
export interface GeneratorConfig {
    /** GitHub username */
    username: string
    /** Selected template ID (e.g., 'space-ghibli') */
    selectedTemplate: string
    /** Theme name (e.g., 'dark', 'light') */
    theme: string
    /** Optional WakaTime API key for coding stats */
    wakatimeKey?: string
    /** Optional Spotify user ID for music integration */
    spotifyId?: string

    // Activity Graph Customization
    /** Activity graph theme (e.g., 'tokyo-night') */
    activityGraphTheme: string
    /** Whether to fill the area under the graph line */
    activityGraphAreaFill: boolean
    /** Whether to hide the graph border */
    activityGraphHideBorder: boolean
    /** Whether to hide the graph title */
    activityGraphHideTitle: boolean
    /** Whether to show grid lines */
    activityGraphGrid: boolean
    /** Number of days to display (10-90) */
    activityGraphDays: number
    /** Corner radius in pixels (0-16) */
    activityGraphRadius: number
    /** Custom title text (if hideTitle is false) */
    activityGraphCustomTitle: string

    // Bio Configuration
    bio?: {
        heading: string
        description: string
        bullets: (string | { id: string; text: string })[]
        showHeading?: boolean
        showDescription?: boolean
        showBullets?: boolean
        headingSize?: 'h1' | 'h2' | 'h3'
        descriptionSize?: 'l' | 'm' | 's'
        bulletsSize?: 'l' | 'm' | 's'
    }

    // Productive Time Configuration
    productiveTime?: {
        style: ProductiveTimeStyleId
        isAnalyzed: boolean
        stats: {
            morning: number
            daytime: number
            evening: number
            night: number
            commits: {
                morning: number
                daytime: number
                evening: number
                night: number
            }
        }
    }

    // Act 4 (Stats - GitHub Only)
    activityStats?: {
        itemCount: number
        ignoredLanguages: string[]
    }
    timezone?: string

    // Sections
    sections: MarkdownSection[]

    // Block configurations (for widget-specific settings)
    blocks?: any[]

    // Weekly Settings
    weeklyLanguages?: {
        style: 'progress' | 'emoji' | 'compact'
        count: number
        sortBy: 'usage' | 'alphabetical' | 'recent'
        periodDays: number
        excludeLanguages: string[]
    }

    weeklyProjects?: {
        style: 'progress' | 'emoji' | 'compact'
        count: number
        sortBy: 'commits' | 'alphabetical' | 'recent'
        periodDays: number
    }
}

export type ExtendedGeneratorConfig = GeneratorConfig

/**
 * Section Generator Interface
 * 
 * @description
 * All markdown generators must implement this interface.
 * Each generator is responsible for creating markdown for a specific section type.
 */
export interface SectionGenerator {
    /**
     * Generate markdown content for a section
     * 
     * @param config - Complete generator configuration
     * @param section - Section metadata
     * @returns Generated markdown string
     */
    generate(config: GeneratorConfig, section: MarkdownSection): string
}
