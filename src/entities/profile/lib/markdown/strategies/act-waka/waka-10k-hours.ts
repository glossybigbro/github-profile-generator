import { ExtendedGeneratorConfig, MarkdownSection } from '@/entities/profile/lib/markdown/types'

export class WakaTenThousandHoursGenerator {
    static generate(config: ExtendedGeneratorConfig, section: MarkdownSection): string {
        const blocks = config.blocks || []

        // Find the specific block for this section
        const wakaBlock = blocks.find((b: any) => b.type === 'widget' && b.id === section.id)
            || blocks.find((b: any) => b.type === 'widget' && b.widgetType === 'waka-10k-hours')
        const blockConfig = wakaBlock ? (wakaBlock as any).config : {}

        const theme = blockConfig.theme || 'classic'
        const targetLanguage = blockConfig.targetLanguage || 'TypeScript'
        const goalTitle = blockConfig.goalTitle || `Master of ${targetLanguage}`
        const displayMode = blockConfig.displayMode || 'accumulated'

        const useRealData = blockConfig.useRealData || false
        const wakaRealData = blockConfig.wakaRealData || null

        // Support error/calculating state in markdown generator
        let stateMessage = ''
        if (useRealData && wakaRealData) {
            if (wakaRealData.isCalculating) stateMessage = 'WakaTime is currently calculating your all-time stats for the first time. Please check back in a few minutes.'
            else if (wakaRealData.error) stateMessage = wakaRealData.error
        }

        // Only use real data if BOTH: block says useRealData AND wakatimeKey exists in current session
        // This prevents stale wakaRealData saved in config from being shown when user hasn't connected API
        const hasActiveApiKey = !!config.wakatimeKey
        const shouldUseRealData = useRealData && hasActiveApiKey && wakaRealData && !stateMessage

        // Use real stats if user connected WakaTime API during editing, otherwise use mock
        const totalSeconds = shouldUseRealData ? wakaRealData.totalSeconds : (7500 * 3600)
        const totalHours = Number((totalSeconds / 3600).toFixed(1))

        let pctNumber = (totalHours / 10000) * 100
        if (pctNumber > 100) pctNumber = 100
        const percentage = pctNumber.toFixed(2)
        const remainingHours = Number(Math.max(0, 10000 - totalHours).toFixed(1))
        const level = Math.floor(totalHours / 100) + 1

        function LIMIT_LENGTH(len: number) { return len > 0 ? len : 0 }

        let markdown = '```text\n'

        // 모든 테마 상단에 공통으로 사용자가 입력한 타이틀과 여백을 출력 (다른 위젯과 일관성 유지)
        markdown += `${goalTitle}\n\n`

        if (stateMessage) {
            if (theme === 'classic') {
                markdown += `${targetLanguage} Proficiency\n`
                markdown += `[ SYSTEM STATUS ]\n`
                markdown += `> ${stateMessage}\n`
            } else if (theme === 'rpg') {
                markdown += `> ⚔️ [CLASS: ${targetLanguage} Artisan]\n`
                markdown += `> ⏳ SYSTEM ALERTS:\n`
                markdown += `>    ${stateMessage}\n`
            } else if (theme === 'terminal') {
                markdown += `guest@github:~$ wakatime --lang "${targetLanguage}" \n`
                markdown += `> WARN: ${stateMessage}\n`
            } else if (theme === 'minimal') {
                markdown += `LANGUAGE     LOGGED TIME         PROGRESS\n`
                markdown += `${targetLanguage.padEnd(12, ' ')} [ ${stateMessage} ]\n`
            }
        } else if (theme === 'classic') {
            const chartBlocks = Math.floor(pctNumber / 5)
            const filled = '█'.repeat(chartBlocks)
            const empty = '░'.repeat(20 - chartBlocks)

            if (displayMode === 'accumulated') {
                markdown += `Total: ${totalHours.toLocaleString()} Hours\n`
            } else {
                markdown += `${remainingHours.toLocaleString()} Hours to mastery\n`
            }
            markdown += `[${filled}${empty}] ${percentage}%\n`

        } else if (theme === 'rpg') {
            const chartBlocks = Math.floor(pctNumber / 5)
            const filled = '▓'.repeat(chartBlocks)
            const empty = '┈'.repeat(LIMIT_LENGTH(20 - chartBlocks))

            markdown += `> ⚔️ [CLASS: ${targetLanguage} Artisan]\n`
            if (displayMode === 'accumulated') {
                markdown += `> 📊 EXP: ${totalHours.toLocaleString()} / 10,000 (Lv. ${level})\n`
            } else {
                markdown += `> 🎯 REMAINING: ${remainingHours.toLocaleString()} Hours to mastery\n`
            }
            markdown += `> 📈 [${filled}${empty}]\n`

        } else if (theme === 'terminal') {
            const filledTotal = Math.floor(pctNumber / 4)
            const fillCount = LIMIT_LENGTH(filledTotal > 0 ? filledTotal - 1 : 0)
            const filled = '='.repeat(fillCount) + (filledTotal > 0 ? '>' : '')
            const empty = ' '.repeat(LIMIT_LENGTH(25 - filledTotal))

            markdown += `guest@github:~$ wakatime --lang "${targetLanguage}" \n`
            markdown += `[${filled}${empty}] ${percentage}%\n`
            markdown += `> ${totalHours.toLocaleString()} hours logged.\n`
            markdown += `> ${displayMode === 'accumulated' ? 'Ongoing progress...' : `${remainingHours.toLocaleString()} hours remaining.`}\n`

        } else if (theme === 'minimal') {
            const chartBlocks = Math.floor(pctNumber / 10)
            const filled = '█'.repeat(chartBlocks)
            const empty = '░'.repeat(10 - chartBlocks)

            const namePad = targetLanguage.padEnd(12, ' ')
            const hoursPad = (displayMode === 'accumulated' ? `${totalHours.toLocaleString()} hrs` : `${remainingHours.toLocaleString()} hrs`).padStart(14, ' ')
            const barPad = `${filled}${empty} (${percentage}%)`.padStart(18, ' ')

            const headerTime = (displayMode === 'accumulated' ? 'LOGGED TIME' : 'REMAINING TIME').padStart(14, ' ')
            markdown += `LANGUAGE         ${headerTime}   PROGRESS\n`
            markdown += `${namePad}     ${hoursPad}   ${barPad}\n`
        }

        markdown += '```'

        return markdown
    }
}
