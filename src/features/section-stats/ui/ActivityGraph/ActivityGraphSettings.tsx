import { ACTIVITY_GRAPH_THEMES } from '@/entities/profile/model/themes'
import { MARKDOWN_UI_TEXT } from '@/entities/profile/config/markdown-constants'
import { MARKDOWN_URLS } from '@/entities/profile/config/urls'
import styles from '@/shared/styles/SectionSettings.module.css'
import { useActivityGraphSettings } from '@/features/section-stats/model/useActivityGraphSettings'

import { useProfileStore } from '@/entities/profile/model/useProfileStore'

export function ActivityGraphSettings({ blockId }: { blockId?: string | null }) {
    const {
        activityGraphTheme,
        setActivityGraphTheme,
        activityGraphAreaFill,
        setActivityGraphAreaFill,
        activityGraphHideBorder,
        setActivityGraphHideBorder,
        activityGraphHideTitle,
        setActivityGraphHideTitle,
        activityGraphGrid,
        setActivityGraphGrid,
        activityGraphDays,
        setActivityGraphDays,
        activityGraphRadius,
        setActivityGraphRadius,
        activityGraphCustomTitle,
        setActivityGraphCustomTitle
    } = useActivityGraphSettings(blockId || undefined)

    return (
        <div className={styles.popOverContent}>
            {/* Main Configuration Header */}
            <div className={styles.settingsSection}>
                <div className={styles.sectionTitle}>CONFIGURATION</div>

                {/* Advanced Options Grid - Layout 1 */}
                <div className={styles.gridTwoColumns}>
                    {/* Area Fill */}
                    <div className={`${styles.settingRow} ${styles.noMarginBottom}`}>
                        <span className={styles.settingLabel}>{MARKDOWN_UI_TEXT.ACTIVITY_GRAPH_LABELS.AREA_FILL}</span>
                        <label className={styles.switch}>
                            <input
                                type="checkbox"
                                checked={activityGraphAreaFill}
                                onChange={(e) => setActivityGraphAreaFill(e.target.checked)}
                            />
                            <span className={styles.slider}></span>
                        </label>
                    </div>

                    {/* Show Grid */}
                    <div className={`${styles.settingRow} ${styles.noMarginBottom}`}>
                        <span className={styles.settingLabel}>{MARKDOWN_UI_TEXT.ACTIVITY_GRAPH_LABELS.SHOW_GRID}</span>
                        <label className={styles.switch}>
                            <input
                                type="checkbox"
                                checked={activityGraphGrid}
                                onChange={(e) => setActivityGraphGrid(e.target.checked)}
                            />
                            <span className={styles.slider}></span>
                        </label>
                    </div>

                    {/* Hide Border */}
                    <div className={`${styles.settingRow} ${styles.noMarginBottom}`}>
                        <span className={styles.settingLabel}>{MARKDOWN_UI_TEXT.ACTIVITY_GRAPH_LABELS.HIDE_BORDER}</span>
                        <label className={styles.switch}>
                            <input
                                type="checkbox"
                                checked={activityGraphHideBorder}
                                onChange={(e) => setActivityGraphHideBorder(e.target.checked)}
                            />
                            <span className={styles.slider}></span>
                        </label>
                    </div>

                    {/* Hide Title */}
                    <div className={`${styles.settingRow} ${styles.noMarginBottom}`}>
                        <span className={styles.settingLabel}>{MARKDOWN_UI_TEXT.ACTIVITY_GRAPH_LABELS.HIDE_TITLE}</span>
                        <label className={styles.switch}>
                            <input
                                type="checkbox"
                                checked={activityGraphHideTitle}
                                onChange={(e) => setActivityGraphHideTitle(e.target.checked)}
                            />
                            <span className={styles.slider}></span>
                        </label>
                    </div>
                </div>

                {/* Conditional Custom Title */}
                {!activityGraphHideTitle && (
                    <div className={`${styles.settingRow} ${styles.flexColumnStart}`}>
                        <span className={styles.settingLabel}>{MARKDOWN_UI_TEXT.ACTIVITY_GRAPH_LABELS.CUSTOM_TITLE}</span>
                        <input
                            type="text"
                            placeholder={MARKDOWN_UI_TEXT.ACTIVITY_GRAPH_PLACEHOLDER}
                            value={activityGraphCustomTitle}
                            onChange={(e) => setActivityGraphCustomTitle(e.target.value)}
                            className={styles.textInput}
                        />
                    </div>
                )}

                {/* Advanced Options Grid - Layout 2 (Sliders/Inputs) */}
                <div className={styles.gridTwoColumns}>
                    {/* Radius */}
                    <div className={`${styles.settingRow} ${styles.flexColumnStartNoMargin}`}>
                        <div className={styles.labelRow}>
                            <span className={styles.settingLabel}>{MARKDOWN_UI_TEXT.ACTIVITY_GRAPH_LABELS.RADIUS}</span>
                            <span className={styles.valueLabel}>{activityGraphRadius}px</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="16"
                            value={activityGraphRadius}
                            onChange={(e) => setActivityGraphRadius(parseInt(e.target.value))}
                            className={`${styles.rangeInput} ${styles.fullWidth}`}
                        />
                    </div>

                    {/* Days */}
                    <div className={`${styles.settingRow} ${styles.flexColumnStartNoMargin}`}>
                        <div className={styles.labelRow}>
                            <span className={styles.settingLabel}>{MARKDOWN_UI_TEXT.ACTIVITY_GRAPH_LABELS.DAYS}</span>
                            <span className={styles.valueLabel}>{activityGraphDays}</span>
                        </div>
                        <input
                            type="range"
                            min="10"
                            max="90"
                            value={activityGraphDays}
                            onChange={(e) => setActivityGraphDays(parseInt(e.target.value))}
                            className={`${styles.rangeInput} ${styles.fullWidthAccent}`}
                        />
                    </div>
                </div>
            </div>

            {/* Theme Selection */}
            <div className={styles.settingsSection}>
                <div className={styles.sectionTitle}>{MARKDOWN_UI_TEXT.ACTIVITY_GRAPH_LABELS.THEME}</div>
                <div className={styles.themeGrid}>
                    {ACTIVITY_GRAPH_THEMES.map(t => (
                        <div
                            key={t.id}
                            className={`${styles.themeChip} ${activityGraphTheme === t.id ? styles.selected : ''}`}
                            onClick={() => setActivityGraphTheme(t.id)}
                            title={t.name}
                            style={{ backgroundColor: t.bg }}
                        >
                            <div className={styles.themePreview}>
                                <div
                                    className={styles.themeCircle}
                                    style={{ background: t.line }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Add to Canvas Button */}
            <div className={styles.settingsSection}>
                <button
                    onClick={() => {
                        window.dispatchEvent(new CustomEvent('activity-graph-add'))
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

            {/* More Info Link */}
            <a
                href={MARKDOWN_URLS.ACTIVITY_GRAPH_DOCS}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.docLink}
            >
                {MARKDOWN_UI_TEXT.ACTIVITY_GRAPH_LABELS.DOCS_LINK}
            </a>
        </div>
    )
}
