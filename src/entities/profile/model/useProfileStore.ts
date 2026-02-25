import { create } from 'zustand'
import { UI_DEFAULTS } from '../config/markdown-constants'
import { SECTIONS, Section, BIO_DEFAULTS } from './sections'
import { ProductiveTimeStyleId } from '@/entities/profile/config/productive-time'

export interface ProfileState {
    // 단계 관리
    currentStep: 'hero' | 'generator'

    // 기본 정보
    username: string
    wakatimeKey: string
    spotifyId: string

    // 템플릿
    selectedTemplate: 'guilyx' | 'minimal' | 'space-ghibli'

    // 섹션
    sections: Section[]

    // 테마
    theme: 'dark' | 'light'
    accentColor: string

    // Bio Data
    bio: {
        heading: string
        description: string
        bullets: { id: string; text: string }[]
        showHeading: boolean
        showDescription: boolean
        showBullets: boolean
        headingSize: 'h1' | 'h2' | 'h3'
        descriptionSize?: 'l' | 'm' | 's'
    }
    setBio: (bio: Partial<{
        heading: string;
        description: string;
        bullets: { id: string; text: string }[];
        showHeading: boolean;
        showDescription: boolean;
        showBullets: boolean;
        headingSize: 'h1' | 'h2' | 'h3';
    }>) => void

    // Activity Graph Settings
    activityGraphTheme: string
    activityGraphAreaFill: boolean
    activityGraphHideBorder: boolean
    activityGraphHideTitle: boolean
    activityGraphGrid: boolean
    activityGraphDays: number
    activityGraphRadius: number
    activityGraphCustomTitle: string

    setActivityGraphTheme: (theme: string) => void
    setActivityGraphAreaFill: (enabled: boolean) => void
    setActivityGraphHideBorder: (enabled: boolean) => void
    setActivityGraphHideTitle: (enabled: boolean) => void
    setActivityGraphGrid: (enabled: boolean) => void
    setActivityGraphDays: (days: number) => void
    setActivityGraphRadius: (radius: number) => void
    setActivityGraphCustomTitle: (title: string) => void

    productiveTime: {
        style: ProductiveTimeStyleId
        isAnalyzed: boolean
        stats: {
            morning: number // 06-12
            daytime: number // 12-18
            evening: number // 18-24
            night: number   // 00-06
            commits: {
                morning: number
                daytime: number
                evening: number
                night: number
            }
        }
    }
    setProductiveTimeStyle: (style: ProductiveTimeStyleId) => void
    setProductiveTimeStats: (stats: {
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
    }) => void

    // Activity Stats Configuration (Non-WakaTime)
    timezone: string
    setTimezone: (timezone: string) => void

    activityStats: {
        itemCount: number // Default 5
        ignoredLanguages: string[]
    }
    setActivityStatsItemCount: (count: number) => void
    setActivityStatsIgnoredLanguages: (languages: string[]) => void

    // Weekly Languages Configuration
    weeklyLanguages: {
        style: 'progress' | 'emoji' | 'compact'
        count: number
        excludeLanguages: string[]
        sortBy: 'usage' | 'alphabetical' | 'recent'
        periodDays: number
    }
    setWeeklyLanguages: (config: Partial<{
        style: 'progress' | 'emoji' | 'compact'
        count: number
        excludeLanguages: string[]
        sortBy: 'usage' | 'alphabetical' | 'recent'
        periodDays: number
    }>) => void

    // Weekly Projects Configuration
    weeklyProjects: {
        style: 'progress' | 'emoji' | 'compact'
        count: number
        sortBy: 'commits' | 'alphabetical' | 'recent'
        periodDays: number
    }
    setWeeklyProjects: (config: Partial<{
        style: 'progress' | 'emoji' | 'compact'
        count: number
        sortBy: 'commits' | 'alphabetical' | 'recent'
        periodDays: number
    }>) => void


    exportCronFrequency: string
    setExportCronFrequency: (cron: string) => void

    // State
    lastValidUsername: string | null
    setLastValidUsername: (username: string | null) => void

    // Actions
    setStep: (step: 'hero' | 'generator') => void
    setUsername: (username: string) => void
    setWakatimeKey: (key: string) => void
    setSpotifyId: (id: string) => void
    setTemplate: (template: 'guilyx' | 'minimal' | 'space-ghibli') => void
    toggleSection: (sectionId: string) => void
    reorderSections: (sections: Section[]) => void
    addHeader: (content: string) => void
    addText: (content: string) => void
    addDivider: () => void
    removeSection: (sectionId: string) => void
    updateSectionContent: (sectionId: string, content: string) => void
    updateSection: (sectionId: string, updates: Partial<Section>) => void
    setAccentColor: (color: string) => void
}

export const useProfileStore = create<ProfileState>((set) => ({
    // 초기 상태
    currentStep: 'hero',
    username: '',
    wakatimeKey: '',
    spotifyId: '',
    selectedTemplate: 'space-ghibli',
    sections: (() => {
        const bioIndex = SECTIONS.findIndex(s => s.id === 'yaml-bio')
        const headerSection = {
            id: 'header-welcome',
            type: 'header',
            content: "Hey there! I'm GlossyBigBro 👋",
            name: 'Section Title',
            icon: '📝',
            category: 'custom',
            width: 'full',
            enabled: true,
            headerConfig: {
                level: 1,
                showDivider: true,
                align: 'left'
            }
        } as Section

        const defaultSections = SECTIONS.map(s => ({
            ...s,
            enabled: s.defaultEnabled ?? false
        }))

        // Insert header right before Bio
        return [
            ...defaultSections.slice(0, bioIndex),
            headerSection,
            ...defaultSections.slice(bioIndex)
        ]
    })(),
    theme: UI_DEFAULTS.THEME,
    accentColor: UI_DEFAULTS.ACCENT_COLOR,
    activityGraphTheme: UI_DEFAULTS.ACTIVITY_GRAPH_THEME,
    activityGraphAreaFill: true,

    // Stats Defaults
    timezone: 'Asia/Seoul',
    setTimezone: (timezone) => set({ timezone }),

    activityStats: {
        showLanguages: true,
        showProjects: true,
        showTimezone: true,
        ignoredLanguages: [],
        itemCount: 5
    },
    setActivityStatsItemCount: (count) => set((state) => ({
        activityStats: { ...state.activityStats, itemCount: count }
    })),
    setActivityStatsIgnoredLanguages: (langs) => set((state) => ({
        activityStats: { ...state.activityStats, ignoredLanguages: langs }
    })),
    activityGraphHideBorder: false,
    activityGraphHideTitle: true,
    activityGraphGrid: false,
    activityGraphDays: UI_DEFAULTS.ACTIVITY_GRAPH_DAYS,
    activityGraphRadius: UI_DEFAULTS.ACTIVITY_GRAPH_RADIUS,
    activityGraphCustomTitle: '',

    // Bio Initial State
    bio: {
        ...BIO_DEFAULTS,
        showHeading: false, // Deprecated: Replaced by Header Section
        showDescription: true,
        showBullets: true,
        headingSize: 'h1',
    },

    setBio: (newBio) => set((state) => ({ bio: { ...state.bio, ...newBio } })),

    // Weekly Languages Initial State
    weeklyLanguages: {
        style: 'progress',
        count: 5,
        excludeLanguages: ['Markdown', 'JSON'],
        sortBy: 'usage',
        periodDays: 7
    },

    setWeeklyLanguages: (config) => set((state) => ({
        weeklyLanguages: { ...state.weeklyLanguages, ...config }
    })),

    // Weekly Projects Initial State
    weeklyProjects: {
        style: 'progress',
        count: 5,
        sortBy: 'commits',
        periodDays: 7
    },

    setWeeklyProjects: (config) => set((state) => ({
        weeklyProjects: { ...state.weeklyProjects, ...config }
    })),

    exportCronFrequency: '0 0 * * *', // Default Daily
    setExportCronFrequency: (cron) => set({ exportCronFrequency: cron }),

    lastValidUsername: null,

    // Actions
    setLastValidUsername: (username) => set({ lastValidUsername: username }),
    setStep: (step) => set({ currentStep: step }),
    setUsername: (username) => set({ username }),
    setWakatimeKey: (key) => set({ wakatimeKey: key }),
    setSpotifyId: (id) => set({ spotifyId: id }),
    setTemplate: (template) => set({ selectedTemplate: template }),

    toggleSection: (sectionId) => set((state) => ({
        sections: state.sections.map((section) =>
            section.id === sectionId
                ? { ...section, enabled: !section.enabled }
                : section
        ),
    })),

    reorderSections: (sections) => set({ sections }),

    addHeader: (content) => set((state) => {
        const newHeader: Section = {
            id: `header-${Date.now()}`,
            type: 'header',
            content,
            name: 'Section Title',
            icon: '📝',
            category: 'custom',
            width: 'full',
            enabled: true, // Headers always enabled by default
            defaultEnabled: true
        }
        return { sections: [newHeader, ...state.sections] }
    }),

    addText: (content) => set((state) => {
        const newText: Section = {
            id: `text-${Date.now()}`,
            type: 'text',
            content,
            name: 'Text Block',
            icon: '📄',
            category: 'custom',
            width: 'full',
            enabled: true,
            defaultEnabled: true
        }
        return { sections: [newText, ...state.sections] }
    }),

    addDivider: () => set((state) => {
        const newDivider: Section = {
            id: `divider-${Date.now()}`,
            type: 'divider',
            name: 'Divider',
            icon: '➖',
            category: 'custom',
            width: 'full',
            enabled: true,
            defaultEnabled: true
        }
        return { sections: [newDivider, ...state.sections] }
    }),

    removeSection: (sectionId) => set((state) => ({
        sections: state.sections.filter(s => s.id !== sectionId)
    })),

    updateSectionContent: (sectionId, content) => set((state) => ({
        sections: state.sections.map(s =>
            s.id === sectionId ? { ...s, content } : s
        )
    })),

    updateSection: (sectionId, updates) => set((state) => ({
        sections: state.sections.map(s =>
            s.id === sectionId ? { ...s, ...updates } : s
        )
    })),
    setAccentColor: (color) => set({ accentColor: color }),

    // Activity Graph actions
    setActivityGraphTheme: (theme) => set({ activityGraphTheme: theme }),
    setActivityGraphAreaFill: (enabled) => set({ activityGraphAreaFill: enabled }),
    setActivityGraphHideBorder: (enabled) => set({ activityGraphHideBorder: enabled }),
    setActivityGraphHideTitle: (enabled) => set({ activityGraphHideTitle: enabled }),
    setActivityGraphGrid: (enabled) => set({ activityGraphGrid: enabled }),
    setActivityGraphDays: (days) => set({ activityGraphDays: days }),
    setActivityGraphRadius: (radius) => set({ activityGraphRadius: radius }),
    setActivityGraphCustomTitle: (title) => set({ activityGraphCustomTitle: title }),

    // Productive Time Initial State & Actions
    productiveTime: {
        style: 'cyber',
        isAnalyzed: false,
        stats: {
            morning: 0, daytime: 0, evening: 0, night: 0,
            commits: { morning: 0, daytime: 0, evening: 0, night: 0 }
        }
    },
    setProductiveTimeStyle: (style) => set((state) => ({
        productiveTime: { ...state.productiveTime, style }
    })),
    setProductiveTimeStats: (stats) => set((state) => ({
        productiveTime: { ...state.productiveTime, stats, isAnalyzed: true }
    })),


}))
