import { getGenerator } from './strategies'
import { GeneratorConfig, MarkdownSection } from './types'
import { generateMarkdownFromBlocks } from './blockGenerator'

/**
 * Extended Generator Configuration
 * 
 * @description
 * Extends GeneratorConfig with sections array for markdown generation.
 */
type ExtendedGeneratorConfig = GeneratorConfig & { sections: MarkdownSection[] }

/**
 * Generate Complete Markdown Profile
 * 
 * @description
 * Main entry point for markdown generation.
 * - PRIORITY: If `config.blocks` exists and has content, use WYSIWYG block generator.
 * - FALLBACK: If no blocks, use legacy section-based generation.
 * 
 * @param config - Complete configuration including sections array and blocks
 * @returns Generated markdown string
 */
export function generateMarkdown(config: ExtendedGeneratorConfig): string {
    // 1. WYSIWYG Block-based Generation (Primary)
    if (config.blocks && config.blocks.length > 0) {
        return generateMarkdownFromBlocks(config.blocks, config)
    }

    // 2. Legacy Section-based Generation (Fallback)
    const { sections } = config

    // Filter only enabled sections (assumes sections are already sorted)
    const enabledSections = sections.filter((s: MarkdownSection) => s.enabled)

    let markdown = ''

    // Generate markdown for each enabled section
    enabledSections.forEach((section: MarkdownSection, index: number) => {
        if (section.type === 'header' && section.content) {
            if (index > 0) {
                markdown += '\n\n'
            }
            // Generate dynamic header based on config
            const config = section.headerConfig || { level: 3, align: 'left', showDivider: false }
            // Handle alignment
            let headerLine: string
            if (config.align && config.align !== 'left') {
                // Use HTML for alignment to ensure styles/borders are preserved
                headerLine = `<h${config.level} align="${config.align}">${section.content}</h${config.level}>`
            } else {
                // Use standard Markdown for default left alignment
                const prefix = '#'.repeat(config.level)
                headerLine = `${prefix} ${section.content}`
            }

            markdown += headerLine

            // Handle divider
            if (config.showDivider) {
                markdown += '\n\n---'
            }
        } else if (section.type === 'divider') {
            if (index > 0) {
                markdown += '\n\n'
            }
            markdown += '---'
        } else if (section.type === 'text' && section.content) {
            if (index > 0) {
                markdown += '\n\n'
            }
            markdown += section.content
        } else {
            const generator = getGenerator(section.id)
            if (generator) {
                // Add blank line between sections (but not before first section)
                if (index > 0) {
                    markdown += '\n\n'
                }
                markdown += generator.generate(config, section).trim()
            }
        }
    })

    return markdown
}

