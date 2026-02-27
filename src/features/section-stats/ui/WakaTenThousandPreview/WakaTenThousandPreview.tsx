'use client'

import { useState, useEffect, useRef } from 'react'
import { Block } from '@/entities/block/model/types'
import { useProfileStore } from '@/entities/profile/model/useProfileStore'
import styles from './WakaTenThousandPreview.module.css'

interface WakaTenThousandPreviewProps {
    block: Block
    isFirst?: boolean
}

// 10,000 hours in seconds
const MASTERY_SECONDS = 36000000

export function WakaTenThousandPreview({ block, isFirst }: WakaTenThousandPreviewProps) {
    const config = (block as any).config || {}
    const theme = config.theme || 'classic'
    const targetLanguage = config.targetLanguage || 'TypeScript'
    const goalTitle = config.goalTitle || `Master of ${targetLanguage}`
    const displayMode = config.displayMode || 'accumulated'

    const wakatimeKey = useProfileStore(state => state.wakatimeKey)
    const [stats, setStats] = useState<{ totalSeconds: number, percent: number } | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!wakatimeKey) {
            setStats(null)
            return
        }

        const fetchStats = async () => {
            setIsLoading(true)
            setError(null)
            try {
                const res = await fetch('/api/wakatime/stats', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ apiKey: wakatimeKey })
                })
                const data = await res.json()
                if (data.success && Array.isArray(data.languages)) {
                    if (data.isCalculating) {
                        setError("WakaTime is currently calculating your all-time stats for the first time. Please check back in a few minutes.")
                        return
                    }

                    if (data.languages.length === 0) {
                        setError("WakaTime returned no language data. Make sure you have logged time.")
                        return
                    }

                    const langStat = data.languages.find((l: any) => l.name.toLowerCase() === targetLanguage.toLowerCase())

                    if (!langStat) {
                        const available = data.languages.slice(0, 10).map((l: any) => l.name).join(', ')
                        setError(`Language "${targetLanguage}" not found in your WakaTime. Available: ${available} ...`)
                        return
                    }

                    const seconds = langStat.total_seconds
                    const percent = Math.min((seconds / MASTERY_SECONDS) * 100, 100)
                    const newStats = { totalSeconds: seconds, percent }
                    setStats(newStats)

                    // Store real data in block config for the markdown generator
                    if (block.id) {
                        const { useBlockStore } = require('@/entities/block/model/useBlockStore')
                        const blocks = useBlockStore.getState().blocks
                        const currentBlock = blocks.find((b: any) => b.id === block.id)
                        if (currentBlock && currentBlock.type === 'widget') {
                            const currentConfig = (currentBlock as any).config || {}
                            useBlockStore.getState().updateBlock(block.id, {
                                config: {
                                    ...currentConfig,
                                    useRealData: true,
                                    wakaRealData: newStats
                                }
                            })
                        }
                    }
                } else {
                    setError('Failed to load stats')
                }
            } catch (err) {
                setError('Network error')
            } finally {
                setIsLoading(false)
            }
        }

        fetchStats()
    }, [wakatimeKey, targetLanguage])

    const isMock = !wakatimeKey;

    // Prepare variables for theming
    const mockTotalSeconds = 7500 * 3600; // 7,500 hours
    const mockPercent = 75;
    const displayStats = isMock ? { totalSeconds: mockTotalSeconds, percent: mockPercent } : stats;

    const totalHours = displayStats ? Number((displayStats.totalSeconds / 3600).toFixed(1)) : 0
    const remainingHours = Number(Math.max(10000 - totalHours, 0).toFixed(1))
    const percentage = displayStats ? displayStats.percent.toFixed(2) : '0.00'
    const level = Math.floor(totalHours / 100) + 1

    // Editable title state
    const [title, setTitle] = useState(() => goalTitle)
    const titleRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (goalTitle && goalTitle !== title) {
            setTitle(goalTitle)
        }
    }, [goalTitle])

    useEffect(() => {
        const handleFocusTitle = (event: CustomEvent) => {
            const widgetType = (block as any).widgetType
            if (event.detail?.widgetType === widgetType && titleRef.current) {
                titleRef.current.focus()
                const range = document.createRange()
                const selection = window.getSelection()
                range.selectNodeContents(titleRef.current)
                range.collapse(false)
                selection?.removeAllRanges()
                selection?.addRange(range)
            }
        }
        window.addEventListener('focus-widget-title', handleFocusTitle as EventListener)
        return () => window.removeEventListener('focus-widget-title', handleFocusTitle as EventListener)
    }, [block])

    const handleTitleBlur = () => {
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
                            goalTitle: newTitle
                        }
                    })
                }
            }
        }
    }



    const generateAsciiChart = () => {
        let chart = '';
        const pctNumber = parseFloat(percentage);

        // System state message overrides chart blocks
        let stateMessage = ''
        if (isLoading) stateMessage = 'Loading WakaTime stats...'
        else if (error && !isMock) stateMessage = error

        if (stateMessage) {
            if (theme === 'classic') {
                chart += `${targetLanguage} Proficiency\n`
                chart += `[ SYSTEM STATUS ]\n`
                chart += `> ${stateMessage}\n`
            } else if (theme === 'rpg') {
                chart += `> ⚔️ [CLASS: ${targetLanguage} Artisan]\n`
                chart += `> ⏳ SYSTEM ALERTS:\n`
                chart += `>    ${stateMessage}\n`
            } else if (theme === 'terminal') {
                chart += `guest@github:~$ wakatime --lang "${targetLanguage}" \n`
                chart += `> WARN: ${stateMessage}\n`
            } else if (theme === 'minimal') {
                chart += `LANGUAGE     LOGGED TIME         PROGRESS\n`
                chart += `${targetLanguage.padEnd(12, ' ')} [ ${stateMessage} ]\n`
            }
            return chart
        }

        if (theme === 'classic') {
            const blocks = Math.floor(pctNumber / 5) // 20 blocks
            const filled = '█'.repeat(blocks)
            const empty = '░'.repeat(20 - blocks)

            chart += `${targetLanguage} Proficiency\n`;
            if (displayMode === 'accumulated') {
                chart += `Total: ${totalHours.toLocaleString()} Hours\n`;
            } else {
                chart += `${remainingHours.toLocaleString()} Hours to mastery\n`;
            }
            chart += `[${filled}${empty}] ${percentage}%\n`;

        } else if (theme === 'rpg') {
            const blocks = Math.floor(pctNumber / 5)
            const filled = '▓'.repeat(blocks)
            const empty = '┈'.repeat(LIMIT_LENGTH(20 - blocks))

            // Text length safe subtraction
            function LIMIT_LENGTH(len: number) { return len > 0 ? len : 0 }

            chart += `> ⚔️ [CLASS: ${targetLanguage} Artisan]\n`;
            if (displayMode === 'accumulated') {
                chart += `> 📊 EXP: ${totalHours.toLocaleString()} / 10,000 (Lv. ${level})\n`;
            } else {
                chart += `> 🎯 REMAINING: ${remainingHours.toLocaleString()} Hours to mastery\n`;
            }
            chart += `> 📈 [${filled}${empty}]\n`;

        } else if (theme === 'terminal') {
            const filledTotal = Math.floor(pctNumber / 4) // 25 blocks total
            const fillCount = LIMIT_LENGTH(filledTotal > 0 ? filledTotal - 1 : 0)
            const filled = '='.repeat(fillCount) + (filledTotal > 0 ? '>' : '')
            const empty = ' '.repeat(LIMIT_LENGTH(25 - filledTotal))

            function LIMIT_LENGTH(len: number) { return len > 0 ? len : 0 }

            chart += `guest@github:~$ wakatime --lang "${targetLanguage}" \n`;
            chart += `[${filled}${empty}] ${percentage}%\n`;
            chart += `> ${totalHours.toLocaleString()} hours logged.\n`;
            chart += `> ${displayMode === 'accumulated' ? 'Ongoing progress...' : `${remainingHours.toLocaleString()} hours remaining.`}\n`;

        } else if (theme === 'minimal') {
            const blocks = Math.floor(pctNumber / 10) // 10 blocks
            const filled = '█'.repeat(blocks)
            const empty = '░'.repeat(10 - blocks)

            const namePad = targetLanguage.padEnd(12, ' ')
            const hoursPad = (displayMode === 'accumulated' ? `${totalHours.toLocaleString()} hrs` : `${remainingHours.toLocaleString()} hrs`).padStart(14, ' ')
            const barPad = `${filled}${empty} (${percentage}%)`.padStart(18, ' ')

            const headerTime = (displayMode === 'accumulated' ? 'LOGGED TIME' : 'REMAINING TIME').padStart(14, ' ')
            chart += `LANGUAGE         ${headerTime}   PROGRESS\n`
            chart += `${namePad}     ${hoursPad}   ${barPad}\n`
        }

        return chart;
    }

    return (
        <div className={styles.widgetWrapper} style={{ marginTop: isFirst ? '0px' : '12px' }}>
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
                        cursor: 'text'
                    }}
                >
                    {title}
                </div>

                {/* Readonly ASCII Data */}
                <pre className={styles.readonlyData} style={{ userSelect: 'text', cursor: 'default' }}>
                    {generateAsciiChart()}
                </pre>
            </div>

            {isMock && (
                <div
                    className={styles.mockOverlay}
                    onClick={() => window.dispatchEvent(new CustomEvent('open-wakatime-activation'))}
                    title="Click to connect your WakaTime account"
                >
                    <div className={styles.mockBadge}>🔒 Preview Mode: Connect API Key</div>
                </div>
            )}
        </div>
    )
}
