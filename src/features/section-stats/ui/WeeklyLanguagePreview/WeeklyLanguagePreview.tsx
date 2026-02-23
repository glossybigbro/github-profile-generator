'use client'

import { Block } from '@/entities/block/model/types'
import { generateProgressBar, generateEmojiBar, generateCompactBadge } from '@/entities/profile/lib/markdown/utils'
import { MOCK_LANGUAGE_DATA } from '@/features/section-stats/config/mock-data'
import { THEME_COLORS } from '@/features/section-stats/config/visualization-options'
import { useProfileStore } from '@/entities/profile/model/useProfileStore'
import { useState, useRef, useEffect } from 'react'
import styles from './WeeklyLanguagePreview.module.css'

interface WeeklyLanguagePreviewProps {
    block: Block
}

export function WeeklyLanguagePreview({ block }: WeeklyLanguagePreviewProps) {
    const globalWeeklyLanguages = useProfileStore(state => state.weeklyLanguages)

    const blockConfig = (block as any).config || {}
    // Use block-specific config if it exists, otherwise fallback to global
    const weeklyLanguages = blockConfig.weeklyLanguages || globalWeeklyLanguages

    const {
        useRealData = false,
        realData = null
    } = blockConfig

    const themeColor = weeklyLanguages.themeColor || 'blue'

    // Editable title state
    const [title, setTitle] = useState(() => {
        const periodLabel = weeklyLanguages.periodDays === 7 ? 'Week' : `${weeklyLanguages.periodDays} Days`
        return blockConfig.title || `💬 Weekly Languages (Last ${periodLabel})`
    })
    const titleRef = useRef<HTMLDivElement>(null)

    // Update title when period changes
    useEffect(() => {
        if (!blockConfig.title) {
            const periodLabel = weeklyLanguages.periodDays === 7 ? 'Week' : `${weeklyLanguages.periodDays} Days`
            setTitle(`💬 Weekly Languages (Last ${periodLabel})`)
        }
    }, [weeklyLanguages.periodDays, blockConfig.title])

    // Listen for focus-widget-title event to move cursor to title end
    useEffect(() => {
        const handleFocusTitle = (event: CustomEvent) => {
            const widgetType = (block as any).widgetType
            if (event.detail?.widgetType === widgetType && titleRef.current) {
                titleRef.current.focus()
                // Move cursor to end of title
                const range = document.createRange()
                const selection = window.getSelection()
                range.selectNodeContents(titleRef.current)
                range.collapse(false) // false = collapse to end
                selection?.removeAllRanges()
                selection?.addRange(range)
            }
        }

        window.addEventListener('focus-widget-title', handleFocusTitle as EventListener)
        return () => window.removeEventListener('focus-widget-title', handleFocusTitle as EventListener)
    }, [block])

    const languages = useRealData && realData
        ? realData
        : MOCK_LANGUAGE_DATA

    // Apply sorting
    let sortedLanguages = [...languages]
    if (weeklyLanguages.sortBy === 'alphabetical') {
        sortedLanguages.sort((a, b) => a.name.localeCompare(b.name))
    } else if (weeklyLanguages.sortBy === 'usage') {
        sortedLanguages.sort((a, b) => b.percent - a.percent)
    }

    // Filter and limit
    const filteredLanguages = sortedLanguages
        .filter((lang: { name: string; count: number; percent: number }) =>
            !weeklyLanguages.excludeLanguages.includes(lang.name))
        .slice(0, weeklyLanguages.count)

    const theme = THEME_COLORS.find((c: any) => c.id === themeColor) || THEME_COLORS[0]
    const squareEmoji = theme.emoji.square
    const circleEmoji = theme.emoji.circle

    const generateDataChart = () => {
        const visualizationStyle = weeklyLanguages.style
        let chart = ''

        filteredLanguages.forEach((lang: { name: string; count: number; percent: number }) => {
            const namePad = lang.name.padEnd(15, ' ')
            const statPad = `${lang.count} Repos`.padEnd(15, ' ')
            const percentPad = `${lang.percent} %`.padStart(7, ' ')

            let visualBar = ''

            if (visualizationStyle === 'progress') {
                visualBar = generateProgressBar(lang.percent, 25)
            } else if (visualizationStyle === 'emoji') {
                // Use 10 blocks for better granularity
                visualBar = generateEmojiBar(lang.percent, squareEmoji, 10)
            } else if (visualizationStyle === 'compact') {
                visualBar = generateCompactBadge(circleEmoji)
            }

            chart += `${namePad} ${statPad} ${visualBar} ${percentPad}\n`
        })

        return chart
    }

    const handleTitleBlur = () => {
        // Save title to block config
        if (titleRef.current) {
            const newTitle = titleRef.current.innerText
            setTitle(newTitle)
            // TODO: Update block config in store
        }
    }

    return (
        <div className={styles.previewWrapper} style={{ marginTop: '12px' }}>
            <div className={styles.codeBlock}>
                {/* Editable Title */}
                <div
                    ref={titleRef}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={handleTitleBlur}
                    className={styles.editableTitle}
                    style={{
                        outline: 'none',
                        minHeight: '1.5em',
                        marginBottom: '1em',
                        cursor: 'text'
                    }}
                >
                    {title}
                </div>

                {/* Readonly Data */}
                <pre className={styles.readonlyData} style={{ userSelect: 'text', cursor: 'default' }}>
                    {generateDataChart()}
                </pre>
            </div>
            {!useRealData && (
                <div className={styles.mockBadge}>
                    📊 Mock Data (Click "Analyze My Activity" to load real stats)
                </div>
            )}
        </div>
    )
}
