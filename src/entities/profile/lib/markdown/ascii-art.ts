import { ProductiveTimeStats } from '../../model/types'

/**
 * ASCII Art Generators for Productive Time Feature
 * 
 * These functions convert the user's commit time distribution into 
 * stylized ASCII representations suitable for a GitHub Profile README.
 */

// --- UTILS ---

/** 
 * Returns a simple bar graph with the given length and fill character 
 */
const createBar = (percentage: number, length: number = 25, fillChar: string = '█', emptyChar: string = '░'): string => {
    // Ensure percentage is 0-100
    const safePercentage = Math.max(0, Math.min(100, percentage))
    const filledLength = Math.round((safePercentage / 100) * length)
    return fillChar.repeat(filledLength) + emptyChar.repeat(length - filledLength)
}

/** 
 * Padding helper
 */
const pad = (str: string, length: number): string => {
    return str.padEnd(length, ' ')
}

/** 
 * Formats percentage with fixed padding (e.g. "07 %")
 */
const createSlider = (percentage: number, length: number = 25, lineChar: string = '─', thumbChar: string = '●'): string => {
    const safePercentage = Math.max(0, Math.min(100, percentage))
    const position = Math.round((safePercentage / 100) * (length - 1))
    const before = lineChar.repeat(position)
    const after = lineChar.repeat(length - 1 - position)
    return before + thumbChar + after
}

// --- GENERATORS ---

/**
 * Style: Commit Flow (formerly Cyber Deck)
 */
export const generateCyberDeckAscii = (stats: ProductiveTimeStats): string => {
    const { morning, daytime, evening, night, commits } = stats

    const row = (icon: string, label: string, count: number, percentage: number) => {
        const bar = createBar(percentage, 25, '█', '░')
        return `${icon} ${label.padEnd(14, ' ')} ${count.toString().padStart(6, ' ')} commits    ${bar}    ${percentage.toFixed(2).padStart(5, '0')} %`
    }

    return '```text\n' +
        row('🌞', 'Morning', commits.morning, morning) + '\n' +
        row('🌆', 'Daytime', commits.daytime, daytime) + '\n' +
        row('🌃', 'Evening', commits.evening, evening) + '\n' +
        row('🌙', 'Night', commits.night, night) + '\n' +
        '```\n'
}

/**
 * Style: Modern Square
 * Design: Cityscape icons, UPPERCASE, Block chars
 */
export const generateModernSquareAscii = (stats: ProductiveTimeStats): string => {
    const { morning, daytime, evening, night, commits } = stats

    const row = (icon: string, label: string, count: number, percentage: number) => {
        const bar = createBar(percentage, 25, '■', '□')
        return `${icon} ${label.toUpperCase().padEnd(14, ' ')} ${count.toString().padStart(6, ' ')} commits     ${bar}    ${percentage.toFixed(2).padStart(5, '0')} %`
    }

    return '```text\n' +
        row('🏙️', 'Morning', commits.morning, morning) + '\n' +
        row('🏢', 'Daytime', commits.daytime, daytime) + '\n' +
        row('🌉', 'Evening', commits.evening, evening) + '\n' +
        row('🌃', 'Night', commits.night, night) + '\n' +
        '```\n'
}

/**
 * Style: Minimal Dot & Clock
 * Design: Clock icons, Dot chars
 */
export const generateMinimalDotAscii = (stats: ProductiveTimeStats): string => {
    const { morning, daytime, evening, night, commits } = stats

    const row = (icon: string, label: string, count: number, percentage: number) => {
        const bar = createBar(percentage, 25, '●', '○')
        return `${icon} ${label.padEnd(14, ' ')} ${count.toString().padStart(6, ' ')} commits     ${bar}    ${percentage.toFixed(2).padStart(5, '0')} %`
    }

    return '```text\n' +
        row('🕕', 'Morning', commits.morning, morning) + '\n' +
        row('🕛', 'Daytime', commits.daytime, daytime) + '\n' +
        row('🕡', 'Evening', commits.evening, evening) + '\n' +
        row('🕛', 'Night', commits.night, night) + '\n' +
        '```\n'
}

/**
 * Style: Hardcore Terminal
 * Design: No icons (prompt >), Braille chars
 */
export const generateTerminalAscii = (stats: ProductiveTimeStats): string => {
    const { morning, daytime, evening, night, commits } = stats

    const row = (label: string, count: number, percentage: number) => {
        const bar = createBar(percentage, 25, '⣿', '⣀')
        return `> ${label.padEnd(15, ' ')} ${count.toString().padStart(6, ' ')} commits     ${bar}    ${percentage.toFixed(2).padStart(5, '0')} %`
    }

    return '```text\n' +
        row('Morning', commits.morning, morning) + '\n' +
        row('Daytime', commits.daytime, daytime) + '\n' +
        row('Evening', commits.evening, evening) + '\n' +
        row('Night', commits.night, night) + '\n' +
        '```\n'
}

/**
 * Style: Control Panel / Slider
 * Design: Signal icons, Slider logic
 */
export const generateSliderAscii = (stats: ProductiveTimeStats): string => {
    const { morning, daytime, evening, night, commits } = stats

    const row = (icon: string, label: string, count: number, percentage: number) => {
        // Use CreateSlider here
        const bar = createSlider(percentage, 25, '─', '●')
        return `${icon} ${label.padEnd(14, ' ')} ${count.toString().padStart(6, ' ')} commits     ${bar}    ${percentage.toFixed(2).padStart(5, '0')} %`
    }

    return '```text\n' +
        row('🕐', 'Morning', commits.morning, morning) + '\n' +
        row('☀️', 'Daytime', commits.daytime, daytime) + '\n' +
        row('🌕', 'Evening', commits.evening, evening) + '\n' +
        row('💤', 'Night', commits.night, night) + '\n' +
        '```\n'
}

/**
 * Empty State: Coffee Break
 * Design: No activity detected (0 commits)
 */
export const generateCoffeeBreakAscii = (): string => {
    return '```text\n' +
        '        [zzz]\n' +
        '       ( -_-)\n' +
        '      /|    |\\\n' +
        '     / |    | \\\n' +
        '    ￣￣￣￣￣￣￣\n' +
        '  Currently taking a coffee break ☕\n' +
        '  (No public activity found... yet!)\n' +
        '```\n'
}

import { ProductiveTimeStyleId, PRODUCTIVE_TIME_TITLES, PRODUCTIVE_TIME_LABELS } from '@/entities/profile/config/productive-time'

// --- HELPERS ---

export const getHabitLabel = (stats: ProductiveTimeStats): string => {
    const { morning, daytime, evening, night } = stats
    const max = Math.max(morning, daytime, evening, night)
    if (max === morning) return PRODUCTIVE_TIME_LABELS.morning
    if (max === daytime) return PRODUCTIVE_TIME_LABELS.daytime
    if (max === evening) return PRODUCTIVE_TIME_LABELS.evening
    if (max === night) return PRODUCTIVE_TIME_LABELS.night
    return PRODUCTIVE_TIME_LABELS.flexible
}

const getPeakTime = (stats: ProductiveTimeStats): string => {
    const max = Math.max(stats.morning, stats.daytime, stats.evening, stats.night)
    if (max === stats.morning) return "06:00 - 12:00"
    if (max === stats.daytime) return "12:00 - 18:00"
    if (max === stats.evening) return "18:00 - 24:00"
    return "00:00 - 06:00"
}

export const getDynamicTitle = (style: ProductiveTimeStyleId, stats: ProductiveTimeStats): string => {
    const { morning, daytime, evening, night } = stats
    const max = Math.max(morning, daytime, evening, night)

    let title = ""
    if (max === morning) title = PRODUCTIVE_TIME_TITLES.morning
    else if (max === daytime) title = PRODUCTIVE_TIME_TITLES.daytime
    else if (max === evening) title = PRODUCTIVE_TIME_TITLES.evening
    else if (max === night) title = PRODUCTIVE_TIME_TITLES.night
    else title = PRODUCTIVE_TIME_TITLES.flexible

    switch (style) {
        case 'terminal':
            return `>_ ${title}`
        case 'modern':
        case 'minimal':
        case 'slider':
        case 'cyber':
        default:
            return `${title}`
    }
}
