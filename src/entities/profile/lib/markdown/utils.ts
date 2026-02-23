/**
 * Generate a progress bar for markdown
 * @param percent Percentage (0-100)
 * @param size Length of the bar in characters (default 20)
 * @returns String like "██████░░░░"
 */
export function generateProgressBar(percent: number, size: number = 20): string {
    const filled = Math.round((size * percent) / 100)
    const empty = size - filled
    return '█'.repeat(filled) + '░'.repeat(empty)
}

/**
 * Generate an emoji bar for markdown
 * @param percent Percentage (0-100)
 * @param filledEmoji Emoji to use for filled part (e.g., '🟦')
 * @param size Length of the bar (default 5)
 * @returns String like "🟦🟦🟦⬜⬜"
 */
export function generateEmojiBar(percent: number, filledEmoji: string = '🟦', size: number = 5): string {
    const filled = Math.round((size * percent) / 100)
    const empty = size - filled
    return filledEmoji.repeat(filled) + '⬜'.repeat(empty)
}

/**
 * Generate a compact list item bullet
 * @param colorEmoji Emoji to use (e.g., '🔵')
 */
export function generateCompactBadge(colorEmoji: string = '🔵'): string {
    return colorEmoji
}
