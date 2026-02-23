'use client'

import { useProfileStore } from '@/entities/profile/model/useProfileStore'
import styles from '@/shared/styles/SectionSettings.module.css'
import { WeeklySettingsBase } from '@/features/section-stats/ui/WeeklyStats/WeeklySettingsBase/WeeklySettingsBase'

// ... imports
import { COMMON_LANGUAGES, LANGUAGE_SORT_OPTIONS } from '@/features/section-stats/config/visualization-options'
import { useWeeklyLanguages } from '@/features/section-stats/model/useWeeklyLanguages'
import { useState } from 'react'

export function WeeklyLanguagesSettings({ blockId }: { blockId?: string | null }) {
    const { weeklyLanguages, toggleLanguage, setConfig } = useWeeklyLanguages(blockId || undefined)
    const username = useProfileStore(state => state.username)
    const accentColor = useProfileStore(state => state.accentColor)
    const [isAnalyzing, setIsAnalyzing] = useState(false)

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

        setIsAnalyzing(true)

        try {
            // Import the API function
            const { analyzeWeeklyLanguages } = await import('@/entities/profile/api/language-api')

            // Fetch real language statistics
            const languageStats = await analyzeWeeklyLanguages(username)

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

            alert(`Successfully analyzed ${languageStats.length} languages!`)
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

            {/* Data Analysis Section */}
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
                    Analyzes your recent repositories to calculate real language statistics.
                    <br />
                    <span style={{ fontSize: '11px', color: '#ffcd56' }}>
                        ⚠️ Private repositories are not accessible via this API.
                    </span>
                </p>
            </div>

            {/* Add to Canvas Button */}
            <div className={styles.settingsSection}>
                <button
                    onClick={() => {
                        // This will be handled by useSectionItem's handleOpenSettings
                        // which closes the panel and finalizes the widget
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
            </div>
        </WeeklySettingsBase>
    )
}

