import { ExtendedGeneratorConfig, MarkdownSection } from '@/entities/profile/lib/markdown/types'
import { generateProgressBar } from '@/entities/profile/lib/markdown/utils'

// Mock Data logic for now (since we fetch real data client-side for Preview but Generator needs it too)
// In a full implementation, we'd pass the fetched 'repos' data in the config. 
// For this MVP, we will simulate the structure or check if we have repo data in config.

export class GitHubLanguagesGenerator {
    static generate(config: ExtendedGeneratorConfig, section: MarkdownSection): string {
        const { activityStats, blocks } = config
        const limit = activityStats?.itemCount || 5

        // Find the weekly-languages widget block to get its config
        const weeklyLanguagesBlock = blocks?.find(
            (block: any) => block.type === 'widget' && block.widgetType === 'weekly-languages'
        )

        // Use real data from block config if available
        const blockConfig = weeklyLanguagesBlock ? (weeklyLanguagesBlock as any).config : {}
        const useRealData = blockConfig.useRealData || false
        const realData = blockConfig.realData || null

        const title = '💬 Weekly Languages'
        let markdown = '```text\n'
        markdown += `${title}\n\n`

        let languages: Array<{ name: string; count: number; percent: number }>

        if (useRealData && realData && realData.length > 0) {
            // Use real GitHub data
            languages = realData.slice(0, limit)
        } else {
            // Use mock data as fallback
            languages = [
                { name: 'TypeScript', count: 12, percent: 45 },
                { name: 'Python', count: 8, percent: 30 },
                { name: 'HTML', count: 5, percent: 15 },
                { name: 'CSS', count: 3, percent: 10 }
            ].slice(0, limit)
        }

        languages.forEach(lang => {
            const bar = generateProgressBar(lang.percent, 25)
            const namePad = lang.name.padEnd(15, ' ')
            const statPad = `${lang.count} Repos`.padEnd(15, ' ')
            const percentPad = `${lang.percent} %`.padStart(7, ' ')

            markdown += `${namePad} ${statPad} ${bar} ${percentPad}\n`
        })
        markdown += '```'

        return markdown
    }
}
