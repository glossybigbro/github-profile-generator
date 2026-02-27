'use client'

import { useProfileStore } from '@/entities/profile/model/useProfileStore'
import styles from '@/shared/styles/SectionSettings.module.css'
import { WeeklySettingsBase } from '@/features/section-stats/ui/WeeklyStats/WeeklySettingsBase/WeeklySettingsBase'
import { GithubTokenManager } from '@/features/section-stats/ui/GithubTokenManager/GithubTokenManager'

// ... imports
import { COMMON_LANGUAGES, LANGUAGE_SORT_OPTIONS } from '@/features/section-stats/config/visualization-options'
import { useWeeklyLanguages } from '@/features/section-stats/model/useWeeklyLanguages'
import { useState } from 'react'

export function WeeklyLanguagesSettings({ blockId }: { blockId?: string | null }) {
    const { weeklyLanguages, toggleLanguage, setConfig } = useWeeklyLanguages(blockId || undefined)
    const username = useProfileStore(state => state.username)
    const accentColor = useProfileStore(state => state.accentColor)
    const githubToken = useProfileStore(state => state.githubToken)
    const setGithubToken = useProfileStore(state => state.setGithubToken)
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [analyzedCount, setAnalyzedCount] = useState<number | null>(null)

    if (!weeklyLanguages) return null

    const { excludeLanguages } = weeklyLanguages

    const handleToggleLanguage = (lang: string) => {
        toggleLanguage(lang)
    }

    const handleAnalyze = async () => {
        if (!username) {
            alert('Please enter your GitHub username first!')
            return
        }

        if (!githubToken) {
            alert('Please enter your GitHub Token below to use GraphQL API for accurate analysis!')
            return
        }

        setIsAnalyzing(true)

        try {
            // Import the API function
            const { analyzeWeeklyLanguages } = await import('@/entities/profile/api/language-api')

            // Fetch real language statistics with token for GraphQL
            const languageStats = await analyzeWeeklyLanguages(username, githubToken)

            // Update block config with real data
            if (blockId) {
                const { useBlockStore } = await import('@/entities/block/model/useBlockStore')
                const currentBlock = useBlockStore.getState().blocks.find(b => b.id === blockId)

                if (currentBlock && currentBlock.type === 'widget') {
                    const currentConfig = (currentBlock as any).config || {}
                    useBlockStore.getState().updateBlock(blockId, {
                        config: {
                            ...currentConfig,
                            useRealData: true,
                            realData: languageStats
                        }
                    })
                }
            }

            setAnalyzedCount(languageStats.length)
        } catch (error: any) {
            console.error('Failed to analyze languages:', error)
            alert(error.message || 'Failed to fetch GitHub data. Please try again.')
        } finally {
            setIsAnalyzing(false)
        }
    }

    return (
        <WeeklySettingsBase
            config={weeklyLanguages}
            setConfig={setConfig}
            sortOptions={LANGUAGE_SORT_OPTIONS}
            defaultThemeColor="blue"
        >
            {/* Exclude Languages - Specific to Weekly Languages */}
            <div className={styles.settingsSection}>
                <span className={styles.sectionTitle}>Exclude Languages</span>
                <div className={styles.checkboxGrid}>
                    {COMMON_LANGUAGES.map(lang => (
                        <label key={lang} className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                checked={excludeLanguages?.includes(lang) || false}
                                onChange={() => handleToggleLanguage(lang)}
                                className={styles.checkbox}
                            />
                            <span>{lang}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* GitHub Token Manager for Validation & Inputs */}
            <GithubTokenManager />

            {/* Data Analysis Section (only when token exists) */}
            {githubToken && (
                <div className={styles.settingsSection}>
                    <div className={styles.sectionTitle}>Data Analysis</div>
                    <button
                        onClick={handleAnalyze}
                        disabled={isAnalyzing}
                        className={styles.analyzeButton}
                        style={{ borderColor: accentColor, color: accentColor }}
                    >
                        {isAnalyzing ? (
                            <>
                                <span className={styles.spinner}></span>
                                Analyzing {username}'s languages...
                            </>
                        ) : (
                            <>
                                <span>🔍</span> Analyze My Activity
                            </>
                        )}
                    </button>
                    <p className={styles.dataNote}>
                        Analyzes your recent <strong>public</strong> repositories to calculate real language statistics.
                    </p>
                    {analyzedCount !== null && (
                        <div className={styles.analysisResult}>
                            {analyzedCount === 0 ? (
                                <span style={{ color: '#ffcd56' }}>No public repositories found with language data. 🤔</span>
                            ) : (
                                <span style={{ color: '#8b5cf6' }}>Language stats analyzed! 📊 ({analyzedCount} languages)</span>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Add to Canvas Button (locked when no token) */}
            <div className={styles.settingsSection}>
                {githubToken ? (
                    <button
                        onClick={() => {
                            window.dispatchEvent(new CustomEvent('weekly-languages-add'))
                        }}
                        className={styles.addToCanvasButton}
                        style={{
                            backgroundColor: accentColor,
                            borderColor: accentColor,
                            color: 'white'
                        }}
                    >
                        <span>✨</span> Add to Canvas
                    </button>
                ) : (
                    <button
                        onClick={() => {
                            // Focus on the token input above
                            const input = document.querySelector('input[placeholder="ghp_xxxxxxxxxxxx"]') as HTMLInputElement
                            if (input) input.focus()
                        }}
                        className={styles.addToCanvasButton}
                        style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            borderColor: 'rgba(255, 255, 255, 0.1)',
                            color: 'rgba(255, 255, 255, 0.6)',
                            gap: '8px'
                        }}
                    >
                        <span style={{ fontSize: '16px' }}>🔒</span> Unlock to Add
                    </button>
                )}
            </div>
        </WeeklySettingsBase>
    )
}

