import { WeeklySettingsBase } from '@/features/section-stats/ui/WeeklyStats/WeeklySettingsBase/WeeklySettingsBase'
import { PROJECT_SORT_OPTIONS } from '@/features/section-stats/config/visualization-options'
import { useWeeklyProjects } from '@/features/section-stats/model/useWeeklyProjects'
import { useProfileStore } from '@/entities/profile/model/useProfileStore'
import { useState } from 'react'
import styles from '@/shared/styles/SectionSettings.module.css'
import { GithubTokenManager } from '@/features/section-stats/ui/GithubTokenManager/GithubTokenManager'

export function WeeklyProjectsSettings({ blockId }: { blockId?: string | null }) {
    // Rule 1: Headless UI (Logic Separated)
    const { weeklyProjects, setWeeklyProjects } = useWeeklyProjects(blockId || undefined)
    const username = useProfileStore(state => state.username)
    const accentColor = useProfileStore(state => state.accentColor)
    const githubToken = useProfileStore(state => state.githubToken)
    const setGithubToken = useProfileStore(state => state.setGithubToken)
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [analyzedCount, setAnalyzedCount] = useState<number | null>(null)

    // Rule 3: Defensive Coding
    if (!weeklyProjects) return null

    const handleAnalyze = async () => {
        if (!username) {
            alert('Please enter your GitHub username first!')
            return
        }

        if (!githubToken) {
            alert('Please enter your GitHub Token to use GraphQL API for accurate analysis!')
            return
        }

        setIsAnalyzing(true)

        try {
            // Import the API function
            const { analyzeWeeklyProjects } = await import('@/entities/profile/api/project-api')

            // Fetch real project statistics with token
            const projectStats = await analyzeWeeklyProjects(username, githubToken)

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
                            realData: projectStats
                        }
                    })
                }
            }

            setAnalyzedCount(projectStats.length)
        } catch (error: any) {
            console.error('Failed to analyze projects:', error)
            alert(error.message || 'Failed to fetch GitHub data. Please try again.')
        } finally {
            setIsAnalyzing(false)
        }
    }

    return (
        <WeeklySettingsBase
            config={weeklyProjects}
            setConfig={setWeeklyProjects}
            sortOptions={PROJECT_SORT_OPTIONS}
            defaultThemeColor="green"
        >
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
                                Analyzing {username}'s projects...
                            </>
                        ) : (
                            <>
                                <span>🔍</span> Analyze My Activity
                            </>
                        )}
                    </button>
                    <p className={styles.dataNote}>
                        Analyzes your recent <strong>public</strong> activity (commits, PRs, created repos).
                    </p>
                    {analyzedCount !== null && (
                        <div className={styles.analysisResult}>
                            {analyzedCount === 0 ? (
                                <span style={{ color: '#ffcd56' }}>No recent public project activity found. 🤔</span>
                            ) : (
                                <span style={{ color: '#8b5cf6' }}>Project stats analyzed! 💻 ({analyzedCount} projects)</span>
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
                            window.dispatchEvent(new CustomEvent('weekly-projects-add'))
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
