export interface StyleOption {
    id: 'progress' | 'emoji' | 'compact'
    name: string
    preview: string
}

export interface PeriodOption {
    days: number
    label: string
}

export const STYLE_OPTIONS: StyleOption[] = [
    { id: 'progress', name: 'Progress Bar', preview: '███████░░░' },
    { id: 'emoji', name: 'Emoji Bar', preview: '🟦🟦🟦⬜⬜' },
    { id: 'compact', name: 'Compact', preview: '🔵 Item • 🟣 Item' }
]

export const PERIOD_OPTIONS: PeriodOption[] = [
    { days: 7, label: 'Last 7 days' },
    { days: 14, label: 'Last 14 days' },
    { days: 30, label: 'Last 30 days' }
]

export const COMMON_LANGUAGES = [
    'Markdown', 'JSON', 'YAML', 'Text', 'XML',
    'HTML', 'CSS', 'Shell', 'Dockerfile'
]

export const LANGUAGE_SORT_OPTIONS: { id: 'usage' | 'alphabetical' | 'recent', name: string }[] = [
    { id: 'usage', name: 'Usage Amount' },
    { id: 'alphabetical', name: 'Alphabetical' },
    { id: 'recent', name: 'Recently Used' }
]

export const PROJECT_SORT_OPTIONS: { id: 'commits' | 'alphabetical' | 'recent', name: string }[] = [
    { id: 'commits', name: 'Commit Count' },
    { id: 'alphabetical', name: 'Alphabetical' },
    { id: 'recent', name: 'Recently Active' }
]

export const THEME_COLORS = [
    { id: 'blue', name: 'Blue', hex: '#3b82f6', emoji: { square: '🟦', circle: '🔵' } },
    { id: 'green', name: 'Green', hex: '#22c55e', emoji: { square: '🟩', circle: '🟢' } },
    { id: 'purple', name: 'Purple', hex: '#a855f7', emoji: { square: '🟪', circle: '🟣' } },
    { id: 'orange', name: 'Orange', hex: '#f97316', emoji: { square: '🟧', circle: '🟠' } },
    { id: 'red', name: 'Red', hex: '#ef4444', emoji: { square: '🟥', circle: '🔴' } }
] as const

export type MetricColor = typeof THEME_COLORS[number]['id']
