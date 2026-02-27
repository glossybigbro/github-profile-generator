'use client'

import styles from '@/shared/styles/SectionSettings.module.css'

import { STYLE_OPTIONS, PERIOD_OPTIONS, THEME_COLORS, MetricColor, StyleOption, PeriodOption } from '@/features/section-stats/config/visualization-options'

interface SortOption<T extends string> {
    id: T
    name: string
}

export interface WeeklyConfig<SortType extends string> {
    style: 'progress' | 'emoji' | 'compact'
    count: number
    sortBy: SortType
    periodDays: number
    themeColor?: MetricColor // New
}

interface WeeklySettingsBaseProps<SortType extends string> {
    config: WeeklyConfig<SortType>
    setConfig: (config: Partial<WeeklyConfig<SortType>>) => void
    sortOptions: SortOption<SortType>[]
    children?: React.ReactNode
    onAnalyze?: () => void
    isAnalyzing?: boolean
    defaultThemeColor?: MetricColor // New prop to handle default selection state
}

export function WeeklySettingsBase<SortType extends string>({ config, setConfig, sortOptions, children, onAnalyze, isAnalyzing, defaultThemeColor = 'blue' }: WeeklySettingsBaseProps<SortType>) {
    const { style, count, sortBy, periodDays } = config

    // Determine active color (fall back to default if not set in config)
    const activeThemeColor = config.themeColor || defaultThemeColor

    // Semantic Handlers (Rule 2)
    const handleStyleChange = (newStyle: string) => {
        setConfig({ style: newStyle as any })
    }

    const handleCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value, 10)
        setConfig({ count: val })
    }

    const handleSortChange = (newSortBy: SortType) => {
        setConfig({ sortBy: newSortBy })
    }

    const handlePeriodChange = (newDays: number) => {
        setConfig({ periodDays: newDays })
    }

    return (
        <div className={styles.popOverContent}>
            {/* Style Selection */}
            <div className={styles.settingsSection}>
                <span className={styles.sectionTitle}>Visualization Style</span>
                <div className={styles.styleGrid}>
                    {STYLE_OPTIONS.map(option => (
                        <div
                            key={option.id}
                            className={`${styles.styleCard} ${style === option.id ? styles.selected : ''}`}
                            onClick={() => handleStyleChange(option.id)}
                            role="button"
                            tabIndex={0}
                        >
                            <div className={styles.stylePreview}>{option.preview}</div>
                            <div className={styles.styleName}>{option.name}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Theme Color (Only for Emoji/Compact styles) */}
            {style !== 'progress' && (
                <div className={styles.settingsSection}>
                    <span className={styles.sectionTitle}>Theme Color</span>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        {THEME_COLORS.map((color: { id: MetricColor; name: string; hex: string }) => (
                            <button
                                key={color.id}
                                type="button"
                                onClick={() => setConfig({ themeColor: color.id })}
                                style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    backgroundColor: color.hex,
                                    border: activeThemeColor === color.id
                                        ? '2px solid white'
                                        : '2px solid transparent',
                                    boxShadow: activeThemeColor === color.id
                                        ? '0 0 0 2px ' + color.hex
                                        : 'none',
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s',
                                    padding: 0
                                }}
                                title={color.name}
                                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Count Slider */}
            <div className={styles.settingsSection}>
                <span className={styles.sectionTitle}>Display Count: {count}</span>
                <input
                    id="count-slider"
                    type="range"
                    min="3"
                    max="10"
                    value={count}
                    onChange={handleCountChange}
                    className={styles.rangeInput}
                />
            </div>

            {/* Sort By */}
            <div className={styles.settingsSection}>
                <span className={styles.sectionTitle}>Sort By</span>
                <div className={styles.buttonGroup}>
                    {sortOptions.map(option => (
                        <button
                            key={option.id}
                            className={`${styles.settingsButton} ${sortBy === option.id ? styles.active : ''}`}
                            onClick={() => handleSortChange(option.id)}
                            type="button"
                        >
                            {option.name}
                        </button>
                    ))}
                </div>
            </div>



            {/* Extra Content (e.g. Exclude Languages) */}
            {children}
        </div>
    )
}
