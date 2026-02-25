import { GeneratorConfig, SectionGenerator, MarkdownSection } from '../../types'
import {
    generateCyberDeckAscii,
    generateModernSquareAscii,
    generateMinimalDotAscii,
    generateTerminalAscii,
    generateSliderAscii,
    generateCoffeeBreakAscii,
    getDynamicTitle
} from '../../ascii-art'

/**
 * Productive Time Generator
 * 
 * @description
 * Generates an ASCII art representation of the user's commit activity distribution.
 * Selects the appropriate generator function based on the user's style preference.
 */
export class ProductiveTimeStrategy implements SectionGenerator {
    /**
     * Generate productive time markdown
     * 
     * @param config - Generator configuration including productive time stats and style
     * @param section - Section metadata
     * @returns ASCII art block wrapped in markdown code fence
     */
    generate(config: GeneratorConfig, section: MarkdownSection): string {
        const blocks = config.blocks || []
        const timeBlock = blocks.find((b: any) => b.type === 'widget' && b.id === section.id)

        // Use block config if available, otherwise fallback to global config
        const productiveTime = timeBlock && (timeBlock as any).config?.productiveTime
            ? (timeBlock as any).config.productiveTime
            : config.productiveTime

        // Safety check: if no productive time config exists, return empty
        if (!productiveTime || !productiveTime.stats) {
            return ''
        }

        const { style, stats } = productiveTime

        // Helper to prepend title
        const withTitle = (ascii: string) => {
            const title = getDynamicTitle(style, stats)
            return `${title}\n${ascii}`
        }

        const totalCommits = stats.commits.morning + stats.commits.daytime + stats.commits.evening + stats.commits.night

        // Select the appropriate generator based on style ID or empty state
        let ascii = ''
        if (totalCommits === 0) {
            ascii = generateCoffeeBreakAscii()
        } else {
            switch (style) {
                case 'modern':
                    ascii = generateModernSquareAscii(stats)
                    break
                case 'minimal':
                    ascii = generateMinimalDotAscii(stats)
                    break
                case 'terminal':
                    ascii = generateTerminalAscii(stats)
                    break
                case 'slider':
                    ascii = generateSliderAscii(stats)
                    break
                case 'cyber':
                default:
                    ascii = generateCyberDeckAscii(stats)
                    break
            }
        }

        const content = withTitle(ascii)

        return content
    }
}
