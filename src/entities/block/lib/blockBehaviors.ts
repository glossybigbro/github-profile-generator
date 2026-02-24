import { Block, BlockCopyBehavior } from '../model/types'
import { htmlToMarkdown } from '@/shared/lib/markdown/simpleConverter'

/**
 * Standard serializer for text-based blocks (Text, Header, Bullet)
 * Extracts the natively selected nodes as HTML and runs them through our simple Converter
 * to preserve marks like bold (**bold**) and links ([link](url)).
 */
const textBehavior: BlockCopyBehavior = {
    serializeSelection: (range, block) => {
        // We do not fallback to full `block.content` here because the user might
        // have Drag-Selected only *part* of a block.
        const clonedContents = range.cloneContents()
        const tempDiv = document.createElement('div')
        tempDiv.appendChild(clonedContents)

        // If nothing was physically added to the clone (e.g. empty block), 
        // return the empty string to prevent weird errors.
        if (tempDiv.innerHTML === '') return ''

        return htmlToMarkdown(tempDiv.innerHTML)
    }
}

/**
 * A central registry of how each Block type should be serialized into text
 * when a user highlights and copies it to their system clipboard.
 */
export const BLOCK_BEHAVIORS: Record<string, BlockCopyBehavior> = {
    'text': textBehavior,
    'header': textBehavior,
    'bullet': textBehavior,

    // -- Stubs for future complex blocks --

    'divider': {
        // Dividers are visually just lines, but as Markdown they are "---"
        serializeSelection: () => '---'
    },

    'widget': {
        // E.g. a "Github Stats" visual widget won't have readable DOM text, 
        // so we intercept it and copy a Markdown image pointing to the API.
        serializeSelection: (range, block) => {
            const wBlock = block as any
            if (wBlock.widgetType === 'github-stats') {
                return `![GitHub Stats](https://github-readme-stats.vercel.app/api?username=${wBlock.config?.username || ''})`
            }
            return `[Widget: ${wBlock.widgetType}]`
        }
    }
}
