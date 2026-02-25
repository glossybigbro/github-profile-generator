import { PRODUCTIVE_TIME_STYLES } from '@/entities/profile/config/productive-time'
import { getHabitLabel } from '@/entities/profile/lib/markdown/ascii-art'
import styles from '@/shared/styles/SectionSettings.module.css'
import { useProductiveTimeSettings } from '@/features/section-stats/model/useProductiveTimeSettings'

export function ProductiveTimeSettings({ blockId }: { blockId?: string | null }) {
    const {
        accentColor,
        productiveTime,
        setProductiveTimeStyle,
        isAnalyzing,
        handleAnalyze,
        getSelectedStyle,
        username
    } = useProductiveTimeSettings(blockId || undefined)

    return (
        <div className={styles.popOverContent}>
            {/* 1. Style Selector */}
            <div className={styles.settingsSection}>
                <div className={styles.sectionTitle}>Visual Style</div>
                <div className={styles.styleGrid}>
                    {PRODUCTIVE_TIME_STYLES.map((style) => {
                        const isSelected = productiveTime.style === style.id
                        return (
                            <button
                                key={style.id}
                                onClick={() => setProductiveTimeStyle(style.id)}
                                className={styles.styleCard}
                                style={isSelected ? getSelectedStyle(accentColor) : {}}
                            >
                                <span className={styles.styleIcon}>{style.icon}</span>
                                <span className={styles.styleLabel}>{style.label}</span>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* 2. Analysis Trigger */}
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
                            Analyzing {username}'s commits...
                        </>
                    ) : (
                        <>
                            <span>🔍</span> Analyze Recent Activity
                        </>
                    )}
                </button>
                <p className={styles.dataNote}>
                    Analyzes up to 300 recent public commits to determine your current habit.
                </p>
                {productiveTime.isAnalyzed && (
                    <div className={styles.analysisResult}>
                        {productiveTime.stats.commits.morning +
                            productiveTime.stats.commits.daytime +
                            productiveTime.stats.commits.evening +
                            productiveTime.stats.commits.night === 0 ? (
                            <span style={{ color: '#ffcd56' }}>No recent commands or commits found. 🤔</span>
                        ) : (
                            <span style={{ color: '#8b5cf6' }}>{getHabitLabel(productiveTime.stats)} detected! 🦉</span>
                        )}
                    </div>
                )}
            </div>

            {/* Add to Canvas Button */}
            <div className={styles.settingsSection}>
                <button
                    onClick={() => {
                        window.dispatchEvent(new CustomEvent('productive-time-add'))
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
        </div>
    )
}
