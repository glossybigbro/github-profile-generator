import { WeeklySettingsBase } from '@/features/section-stats/ui/WeeklyStats/WeeklySettingsBase/WeeklySettingsBase'
import { PROJECT_SORT_OPTIONS } from '@/features/section-stats/config/visualization-options'
import { useWeeklyProjects } from '@/features/section-stats/model/useWeeklyProjects'
import { useProfileStore } from '@/entities/profile/model/useProfileStore'
import { useState } from 'react'
import styles from '@/shared/styles/SectionSettings.module.css'

export function WeeklyProjectsSettings({ blockId }: { blockId?: string | null }) {
    // Rule 1: Headless UI (Logic Separated)
    const { weeklyProjects, setWeeklyProjects } = useWeeklyProjects(blockId || undefined)
    const username = useProfileStore(state => state.username)
    const [isAnalyzing, setIsAnalyzing] = useState(false)

    // Rule 3: Defensive Coding
    if (!weeklyProjects) return null

    const handleAnalyze = async () => {
        if (!username) {
            alert('Please enter your GitHub username first!')
            return
        }

        setIsAnalyzing(true)

        try {
            // Import the API function
            const { analyzeWeeklyProjects } = await import('@/entities/profile/api/project-api')

            // Fetch real project statistics
            const projectStats = await analyzeWeeklyProjects(username)

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

            alert(`Successfully analyzed ${projectStats.length} projects!`)
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
            {/* Data Analysis Section - Custom Rendered for consistency */}
            <div className={styles.settingsSection}>
                <div className={styles.sectionTitle}>Data Analysis</div>
                <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className={styles.analyzeButton}
                    // Add accent color styling if available (need to import styles/store)
                    style={{ borderColor: useProfileStore.getState().accentColor, color: useProfileStore.getState().accentColor }}
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
                        window.dispatchEvent(new CustomEvent('weekly-projects-add'))
                    }}
                    className={styles.addToCanvasButton}
                    style={{
                        backgroundColor: useProfileStore.getState().accentColor,
                        borderColor: useProfileStore.getState().accentColor,
                        color: 'white'
                    }}
                >
                    <span>✨</span> Add to Canvas
                </button>
            </div>
        </WeeklySettingsBase>
    )
}
