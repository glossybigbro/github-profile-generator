'use client'

import { useProfileStore } from '@/entities/profile/model/useProfileStore'
import { useBlockStore } from '@/entities/block/model/useBlockStore'

import styles from '@/shared/styles/SectionSettings.module.css'

interface WakaTenThousandSettingsProps {
    blockId: string | null
}

const THEME_OPTIONS = [
    { id: 'classic', label: 'Classic Bar 🎯' },
    { id: 'rpg', label: 'RPG Status ⚔️' },
    { id: 'terminal', label: 'Terminal Cons 💻' },
    { id: 'minimal', label: 'Minimal Table 📊' }
]

const DISPLAY_MODES = [
    { id: 'accumulated', label: 'Accumulated' },
    { id: 'remaining', label: 'Remaining' }
]

export function WakaTenThousandSettings({ blockId }: WakaTenThousandSettingsProps) {
    const blocks = useBlockStore(state => state.blocks)
    const updateBlock = useBlockStore(state => state.updateBlock)
    const setWakatimeKey = useProfileStore(state => state.setWakatimeKey)
    const wakatimeKey = useProfileStore(state => state.wakatimeKey)
    const accentColor = useProfileStore(state => state.accentColor)

    if (!blockId) return null

    const block = blocks.find(b => b.id === blockId)
    if (!block) return null

    const config = (block as any).config || {}
    const theme = config.theme || 'classic'
    const targetLanguage = config.targetLanguage || 'TypeScript'
    const goalTitle = config.goalTitle || `Master of ${targetLanguage}`
    const displayMode = config.displayMode || 'accumulated' // 'accumulated' | 'remaining'

    const handleChange = (key: string, value: any) => {
        updateBlock(blockId!, { config: { ...config, [key]: value } } as any)
    }

    return (
        <div className={styles.popOverContent}>

            <div className={styles.settingsSection}>
                <div className={styles.sectionTitle}>CONFIGURATION</div>

                <div className={`${styles.settingRow} ${styles.flexColumnStart}`}>
                    <span className={styles.settingLabel}>Goal Title</span>
                    <input
                        type="text"
                        value={goalTitle}
                        onChange={(e) => handleChange('goalTitle', e.target.value)}
                        className={styles.textInput}
                        placeholder="e.g. Master of TypeScript"
                    />
                </div>

                <div className={`${styles.settingRow} ${styles.flexColumnStart}`}>
                    <span className={styles.settingLabel}>Target Language</span>
                    <input
                        type="text"
                        value={targetLanguage}
                        onChange={(e) => handleChange('targetLanguage', e.target.value)}
                        className={styles.textInput}
                        placeholder="e.g. TypeScript"
                    />
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                        Must exactly match the WakaTime language name.
                    </span>
                </div>
            </div>

            <div className={styles.settingsSection}>
                <span className={styles.sectionTitle}>Design Theme</span>
                <div className={styles.buttonGroup}>
                    {THEME_OPTIONS.map(option => (
                        <button
                            key={option.id}
                            className={`${styles.settingsButton} ${theme === option.id ? styles.active : ''}`}
                            onClick={() => handleChange('theme', option.id)}
                            type="button"
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className={styles.settingsSection}>
                <span className={styles.sectionTitle}>Display Mode</span>
                <div className={styles.buttonGroup}>
                    {DISPLAY_MODES.map(option => (
                        <button
                            key={option.id}
                            className={`${styles.settingsButton} ${displayMode === option.id ? styles.active : ''}`}
                            onClick={() => handleChange('displayMode', option.id)}
                            type="button"
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* 🔥 Try Before You Buy - CTA Banner 🔥 */}
            {!wakatimeKey && (
                <div className={styles.settingsSection} style={{
                    background: 'linear-gradient(145deg, rgba(176, 38, 255, 0.1) 0%, rgba(34, 211, 238, 0.05) 100%)',
                    border: '1px solid rgba(176, 38, 255, 0.3)',
                    borderRadius: '12px',
                    padding: '16px',
                    boxShadow: 'inset 0 0 20px rgba(176, 38, 255, 0.05), 0 4px 12px rgba(0,0,0,0.1)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '18px', filter: 'drop-shadow(0 0 8px rgba(223, 156, 255, 0.8))' }}>✨</span>
                        <span style={{ color: '#df9cff', fontWeight: 700, fontSize: '14px', letterSpacing: '0.3px', textShadow: '0 0 10px rgba(223, 156, 255, 0.4)' }}>Preview Mode</span>
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', lineHeight: '1.5', marginBottom: '14px' }}>
                        The widget design above is a functional preview. To add it to your canvas, you need to connect your WakaTime account.
                    </p>
                    <button
                        onClick={() => window.dispatchEvent(new CustomEvent('open-wakatime-activation'))}
                        style={{
                            width: '100%',
                            padding: '10px',
                            background: 'rgba(176, 38, 255, 0.15)',
                            border: '1px solid rgba(176, 38, 255, 0.5)',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(176, 38, 255, 0.25)';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(176, 38, 255, 0.2)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(176, 38, 255, 0.15)';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        🔗 Connect WakaTime API Key
                    </button>
                </div>
            )}

            {/* Add to Canvas Button */}
            <div className={styles.settingsSection}>
                {wakatimeKey ? (
                    <button
                        onClick={() => {
                            window.dispatchEvent(new CustomEvent('waka-10k-hours-add'))
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
                            window.dispatchEvent(new CustomEvent('open-wakatime-activation'))
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
        </div>
    )
}
