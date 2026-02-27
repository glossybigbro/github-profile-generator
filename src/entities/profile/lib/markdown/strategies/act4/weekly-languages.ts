import { ExtendedGeneratorConfig, MarkdownSection } from '@/entities/profile/lib/markdown/types'
import { generateProgressBar, generateEmojiBar, generateCompactBadge } from '@/entities/profile/lib/markdown/utils'

// Mock Data logic for now (since we fetch real data client-side for Preview but Generator needs it too)
// In a full implementation, we'd pass the fetched 'repos' data in the config. 
// For this MVP, we will simulate the structure or check if we have repo data in config.

export class GitHubLanguagesGenerator {
    static generate(config: ExtendedGeneratorConfig, section: MarkdownSection): string {
        const { activityStats, blocks } = config
        const limit = activityStats?.itemCount || 5

        // Find the specific weekly-languages widget block by ID first, fallback to type
        const weeklyLanguagesBlock = blocks?.find((b: any) => b.type === 'widget' && b.id === section.id)
            || blocks?.find((b: any) => b.type === 'widget' && b.widgetType === 'weekly-languages')

        // Use real data from block config if available
        const blockConfig = weeklyLanguagesBlock ? (weeklyLanguagesBlock as any).config : {}
        const useRealData = blockConfig.useRealData || false
        const realData = blockConfig.realData || null

        const globalWeeklyLanguages = config.weeklyLanguages || {}
        const weeklyLanguagesConfig = blockConfig.weeklyLanguages || globalWeeklyLanguages

        const title = blockConfig.title || `💬 Weekly Languages`
        let markdown = '```text\n'
        markdown += `${title}\n\n`

        let languages: Array<{ name: string; count: number; percent: number }>

        if (!useRealData) {
            // Use mock data as fallback in editor mode
            languages = [
                { name: 'TypeScript', count: 12, percent: 45 },
                { name: 'Python', count: 8, percent: 30 },
                { name: 'HTML', count: 5, percent: 15 },
                { name: 'CSS', count: 3, percent: 10 }
            ]
        } else if (realData && realData.length > 0) {
            // Use real GitHub data
            languages = realData
        } else {
            // Evaluated explicitly to empty
            languages = []
        }

        // Apply sorting
        let sortedLanguages = [...languages]
        if (weeklyLanguagesConfig.sortBy === 'alphabetical') {
            sortedLanguages.sort((a, b) => a.name.localeCompare(b.name))
        } else if (weeklyLanguagesConfig.sortBy === 'usage') {
            sortedLanguages.sort((a, b) => b.percent - a.percent)
        }

        // Apply filtering and limiting
        const excludeLanguages = weeklyLanguagesConfig.excludeLanguages || []
        const countLimit = weeklyLanguagesConfig.count || limit
        const filteredLanguages = sortedLanguages
            .filter(lang => !excludeLanguages.includes(lang.name))
            .slice(0, countLimit)

        // Map colors securely inside entity
        const THEME_COLORS_MAP: Record<string, { square: string, circle: string }> = {
            blue: { square: '🟦', circle: '🔵' },
            green: { square: '🟩', circle: '🟢' },
            purple: { square: '🟪', circle: '🟣' },
            orange: { square: '🟧', circle: '🟠' },
            red: { square: '🟥', circle: '🔴' }
        }

        const visualizationStyle = weeklyLanguagesConfig.style || 'progress'
        const themeColor = weeklyLanguagesConfig.themeColor || 'blue'
        const emojis = THEME_COLORS_MAP[themeColor] || THEME_COLORS_MAP['blue']

        if (filteredLanguages.length === 0) {
            markdown += '   ╭────────────────────────────╮\n' +
                '   │   NO ACTIVITY DETECTED     │\n' +
                '   │   Waiting for daily code.  │\n' +
                '   ╰────────────────────────────╯\n'
        } else {
            filteredLanguages.forEach(lang => {
                let bar = ''
                if (visualizationStyle === 'progress') {
                    bar = generateProgressBar(lang.percent, 25)
                } else if (visualizationStyle === 'emoji') {
                    bar = generateEmojiBar(lang.percent, emojis.square, 10)
                } else if (visualizationStyle === 'compact') {
                    bar = generateCompactBadge(emojis.circle)
                }

                const safeName = lang.name.length > 26 ? lang.name.substring(0, 26) + '..' : lang.name
                const namePad = safeName.padEnd(28, ' ')
                const repoStr = String(lang.count).padStart(8, ' ')
                const statPad = `${repoStr} Repos`.padEnd(26, ' ')
                const percentPad = `${lang.percent} %`.padStart(8, ' ')

                markdown += `${namePad} ${statPad} ${bar} ${percentPad}\n`
            })
        }
        markdown += '```'

        return markdown
    }
}
