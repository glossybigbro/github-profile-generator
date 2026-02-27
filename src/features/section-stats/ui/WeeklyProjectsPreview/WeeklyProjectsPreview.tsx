'use client'

import { Block } from '@/entities/block/model/types'
import { generateProgressBar, generateEmojiBar, generateCompactBadge } from '@/entities/profile/lib/markdown/utils'
import { MOCK_PROJECT_DATA } from '@/features/section-stats/config/mock-data'
import { THEME_COLORS } from '@/features/section-stats/config/visualization-options'
import { useProfileStore } from '@/entities/profile/model/useProfileStore'
import { useState, useRef, useEffect } from 'react'
import styles from './WeeklyProjectsPreview.module.css'

interface WeeklyProjectsPreviewProps {
    block: Block
    isFirst?: boolean
}

export function WeeklyProjectsPreview({ block, isFirst }: WeeklyProjectsPreviewProps) {
    const globalWeeklyProjects = useProfileStore(state => state.weeklyProjects)

    const blockConfig = (block as any).config || {}
    // Use block-specific config if it exists, otherwise fallback to global
    const weeklyProjects = blockConfig.weeklyProjects || globalWeeklyProjects

    const githubToken = useProfileStore(state => state.githubToken)

    const {
        useRealData: configUseRealData = false,
        realData = null
    } = blockConfig

    // Force mock mode if there is no token
    const useRealData = configUseRealData && !!githubToken

    const themeColor = weeklyProjects.themeColor || 'green'

    const defaultTitle = `🐱💻 Weekly Projects`

    // Editable title state
    const [title, setTitle] = useState(() => blockConfig.title || defaultTitle)
    const titleRef = useRef<HTMLDivElement>(null)

    // Update title when empty
    useEffect(() => {
        if (!blockConfig.title || /^🐱💻 Weekly Projects( \(Last (Week|\d+ Days)\))?$/.test(blockConfig.title)) {
            setTitle(defaultTitle)

            // Sync up the config so it doesn't hold the stale period string
            if (block.id && blockConfig.title) {
                const { useBlockStore } = require('@/entities/block/model/useBlockStore')
                const blocks = useBlockStore.getState().blocks
                const currentBlock = blocks.find((b: any) => b.id === block.id)
                if (currentBlock && currentBlock.type === 'widget') {
                    const currentConfig = (currentBlock as any).config || {}
                    useBlockStore.getState().updateBlock(block.id, {
                        config: { ...currentConfig, title: defaultTitle }
                    })
                }
            }
        }
    }, [])

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

    // Apply dynamic multiplier to mock data based on period to make it visibly change
    const periodMultiplier = weeklyProjects.periodDays === 7 ? 1 : weeklyProjects.periodDays === 14 ? 2 : 4.2
    const projects = useRealData && realData
        ? realData
        : MOCK_PROJECT_DATA.map(p => ({ ...p, commits: Math.round(p.commits * periodMultiplier) }))

    // Apply sorting
    let sortedProjects = [...projects]
    if (weeklyProjects.sortBy === 'alphabetical') {
        sortedProjects.sort((a, b) => a.name.localeCompare(b.name))
    } else if (weeklyProjects.sortBy === 'commits') {
        sortedProjects.sort((a, b) => b.commits - a.commits)
    }

    // Filter and limit
    const filteredProjects = sortedProjects
        .slice(0, weeklyProjects.count)

    const theme = THEME_COLORS.find((c: any) => c.id === themeColor) || THEME_COLORS[1] // Default Green
    const squareEmoji = theme.emoji.square
    const circleEmoji = theme.emoji.circle

    const generateDataChart = () => {
        if (useRealData && filteredProjects.length === 0) {
            return '     .-.\n' +
                '   (o o) boo!\n' +
                '   | O \\\n' +
                '    \\   \\\n' +
                '     `~~~\'\n' +
                '  Invisible on the radar! 👻\n' +
                '  (Or maybe just working in private repos...)\n'
        }

        const visualizationStyle = weeklyProjects.style
        let chart = ''

        filteredProjects.forEach((proj: { name: string; commits: number; percent: number }) => {
            const safeName = proj.name.length > 26 ? proj.name.substring(0, 26) + '..' : proj.name
            const namePad = safeName.padEnd(28, ' ')
            const commitsStr = String(proj.commits).padStart(8, ' ')
            const statPad = `${commitsStr} contribs`.padEnd(26, ' ')
            const percentPad = `${proj.percent} %`.padStart(8, ' ')

            let visualBar = ''

            if (visualizationStyle === 'progress') {
                visualBar = generateProgressBar(proj.percent, 25)
            } else if (visualizationStyle === 'emoji') {
                // Use 10 blocks for better granularity
                visualBar = generateEmojiBar(proj.percent, squareEmoji, 10)
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
            if (block.id) {
                const { useBlockStore } = require('@/entities/block/model/useBlockStore')
                const blocks = useBlockStore.getState().blocks
                const currentBlock = blocks.find((b: any) => b.id === block.id)
                if (currentBlock && currentBlock.type === 'widget') {
                    const currentConfig = (currentBlock as any).config || {}
                    useBlockStore.getState().updateBlock(block.id, {
                        config: {
                            ...currentConfig,
                            title: newTitle
                        }
                    })
                }
            }
        }
    }

    return (
        <div className={styles.previewWrapper} style={{ marginTop: isFirst ? '0px' : '12px' }}>
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
            {!useRealData && (() => {
                const githubToken = useProfileStore.getState().githubToken
                const badgeText = !githubToken
                    ? '🔒 Preview Mode: Connect API Key'
                    : '📊 Preview Data: Click Analyze'
                return (
                    <div
                        className={styles.mockOverlay}
                        onClick={() => {
                            window.dispatchEvent(new CustomEvent('focus-widget-title', {
                                detail: { widgetType: 'weekly-projects' }
                            }))
                        }}
                        title={!githubToken ? 'Click to connect your GitHub Token' : 'Click Analyze in settings to load real data'}
                    >
                        <div className={styles.mockBadge}>{badgeText}</div>
                    </div>
                )
            })()}
        </div>
    )
}
