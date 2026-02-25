import { ExtendedGeneratorConfig, MarkdownSection } from '@/entities/profile/lib/markdown/types'
import { generateProgressBar } from '@/entities/profile/lib/markdown/utils'

export class GitHubProjectsGenerator {
    static generate(config: ExtendedGeneratorConfig, section: MarkdownSection): string {
        const { activityStats } = config
        // Default Settings
        const defaultLimit = activityStats?.itemCount || 5

        // Block-specific Settings
        const blocks = config.blocks || []
        // Find block by section id (assuming section.id matches block.widgetType or similar logic)
        // Actually, we need to find the block corresponding to this section.
        // However, the section ID in markdown config might not directly map to block ID if there are multiple.
        // For now, let's assume section.id corresponds to block.id if we use block IDs as section IDs in the future.
        // BUT current architecture: section.id is static 'weekly-projects'.
        // If we have multiple blocks, we need a way to pass specific data.

        // TEMPORARY: Find the first weekly-projects block or use the merged config
        // In the new architecture, config.weeklyProjects comes from the store.
        // But for independent blocks, we need to know WHICH block data to use.
        // The generator currently receives the GLOBAL config.

        // If we want to support independent blocks in markdown, we must pass the specific data 
        // via the `section` object itself if possible, or rely on `blocks` array.

        // For now, let's use the first block of type 'weekly-projects' from config.blocks 
        // to get the "Real Data" if available.

        const projectBlock = blocks.find((b: any) => b.type === 'widget' && b.id === section.id)
            || blocks.find((b: any) => b.type === 'widget' && b.widgetType === 'weekly-projects')
        const blockConfig = projectBlock ? (projectBlock as any).config : {}

        const useRealData = blockConfig.useRealData || false
        const realData = blockConfig.realData || []
        const weeklyProjectsConfig = blockConfig.weeklyProjects || config.weeklyProjects || {}

        const limit = weeklyProjectsConfig.count || defaultLimit
        const periodDays = weeklyProjectsConfig.periodDays || 7
        const periodStr = periodDays === 7 ? '(Last Week)' : periodDays === 14 ? '(Last 2 Weeks)' : `(Last ${periodDays} Days)`
        const title = blockConfig.title || `🐱💻 Weekly Projects ${periodStr}`

        let markdown = '```text\n'
        markdown += `${title}\n\n`

        let projects: Array<any>
        if (!useRealData) {
            projects = [
                { name: 'developer-journey', commits: 24, percent: 45 },
                { name: 'glossy-ui', commits: 12, percent: 25 },
                { name: 'algorithm-study', commits: 5, percent: 15 },
                { name: 'blog-posts', commits: 2, percent: 5 }
            ]
        } else if (realData && realData.length > 0) {
            projects = realData
        } else {
            projects = []
        }

        // Apply sort and limit
        let sortedProjects = [...projects]
        if (weeklyProjectsConfig.sortBy === 'alphabetical') {
            sortedProjects.sort((a: any, b: any) => a.name.localeCompare(b.name))
        } else if (weeklyProjectsConfig.sortBy === 'commits') {
            sortedProjects.sort((a: any, b: any) => b.commits - a.commits)
        }

        const finalProjects = sortedProjects.slice(0, limit)

        if (finalProjects.length === 0) {
            markdown += '     .-.\n' +
                '   (o o) boo!\n' +
                '   | O \\\n' +
                '    \\   \\\n' +
                '     `~~~\'\n' +
                '  Invisible on the radar! 👻\n' +
                '  (Or maybe just working in private repos...)\n'
        } else {
            finalProjects.forEach((proj: any) => {
                const bar = generateProgressBar(proj.percent, 25)
                const namePad = proj.name.padEnd(20, ' ')
                const statPad = `${proj.commits} commits`.padEnd(15, ' ')
                const percentPad = `${proj.percent} %`.padStart(7, ' ')

                markdown += `${namePad} ${statPad} ${bar} ${percentPad}\n`
            })
        }
        markdown += '```'

        return markdown
    }
}
