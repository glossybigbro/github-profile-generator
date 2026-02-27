import { Block, BulletBlock, HeaderBlock, WidgetBlock } from '@/entities/block/model/types'
import { GeneratorConfig } from './types'
import { getGenerator } from './strategies'

/**
 * Generate Markdown from Editor Blocks
 * 
 * @description
 * Converts the WYSIWYG editor blocks into standard Markdown.
 * Replaces the legacy section-based generation when blocks are present.
 */
export function generateMarkdownFromBlocks(blocks: Block[], config: GeneratorConfig): string {
    if (!blocks || blocks.length === 0) return ''

    let markdown = ''

    blocks.forEach((block, index) => {
        const prevBlock = index > 0 ? blocks[index - 1] : null
        let content = ''

        switch (block.type) {
            case 'header':
                const h = block as HeaderBlock
                const level = h.level || 1
                const prefix = '#'.repeat(level)
                content = `${prefix} ${h.content}`
                break

            case 'text':
                content = block.content
                break

            case 'bullet':
                const b = block as BulletBlock
                // 2 spaces per indent level for standard markdown nesting
                const indent = '  '.repeat(b.indent || 0)
                content = `${indent}- ${b.content}`
                break

            case 'divider':
                content = '---'
                break

            case 'widget':
                const w = block as WidgetBlock
                const generator = getGenerator(w.widgetType)

                if (generator) {
                    // Create a mock section object that the generator expects.
                    // Pass the block.id so the strategy can find the specific block's local config.
                    const mockSection = {
                        id: w.id,
                        name: w.widgetType,
                        type: 'section', // generic
                        enabled: true
                    }
                    // Merge block-level config into global config so the generator sees the overrides
                    const mergedConfig = { ...config, ...w }
                    // Generate using the existing strategy
                    const widgetContent = generator.generate(mergedConfig, mockSection as any).trimEnd()

                    // List of widgets that require dynamic GitHub Actions updates.
                    // Static widgets (e.g. Activity Graph using Vercel image, Bio) do NOT need these markers.
                    const DYNAMIC_WIDGETS = [
                        'productive-time',
                        'weekly-languages',
                        'weekly-projects',
                        'waka-10k-hours',
                        'activity-graph'
                    ]

                    if (DYNAMIC_WIDGETS.includes(w.widgetType)) {
                        // Add HTML markers for GitHub Actions script to locate and update the block
                        content = `<!-- glossy-${w.widgetType}-${w.id}-start -->\n${widgetContent}\n<!-- glossy-${w.widgetType}-${w.id}-end -->`
                    } else {
                        // For static widgets, just output the raw markdown content without markers
                        content = widgetContent
                    }
                } else {
                    content = `<!-- Widget: ${w.widgetType} (No generator found) -->`
                }
                break
        }

        // Spacing Logic
        if (index > 0) {
            // Tight spacing for consecutive bullets
            if (block.type === 'bullet' && prevBlock?.type === 'bullet') {
                markdown += '\n'
            }
            // Standard paragraph spacing for everything else
            else {
                markdown += '\n\n'
            }
        }

        markdown += content
    })

    return markdown
}
