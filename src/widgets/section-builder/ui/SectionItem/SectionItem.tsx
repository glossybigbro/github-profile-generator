'use client'

import { Section } from '@/entities/profile/model/sections'
import styles from '@/shared/styles/SectionSettings.module.css'
import { ActivityGraphSettings, ProductiveTimeSettings, WeeklyLanguagesSettings, WeeklyProjectsSettings } from '@/features/section-stats'
import { WakaTenThousandSettings } from '@/features/section-stats/ui/WakaTenThousandSettings'
import { SimpleBioSettings } from '@/features/section-bio/ui/BioEditor/BioSettings'
import { SectionIcon } from '../SectionIcon'
import { useSectionItem } from '../../model/useSectionItem'
import { SECTION_UI_LABELS } from '../../config/sectionConstants'

interface SectionItemProps {
    section: Section
    onToggle: (id: string) => void
    onAdd?: (id: string) => void // For customizable sections
    onFinalize?: (id: string) => void
}

export function SectionItem({ section, onToggle, onAdd, onFinalize }: SectionItemProps) {
    // 4. DRY & Constants (Safe Access)
    const { id, name, locked } = section
    const isLocked = !!locked

    // 5. Headless UI (Logic in Hook)
    const {
        isSettingsOpen,
        popoverRef,
        isCustomizable,
        shouldShowAddButton,
        activeWidgetBlockId,
        handleToggleSettings,
        sectionOpacity,
        isWakaTimeLocked,
        isGitHubTokenLocked,
        isApiKeyLocked
    } = useSectionItem({
        section,
        isLocked,
        onToggle: () => onToggle(id),
        onAdd: onAdd ? () => onAdd(id) : undefined,
        onFinalize
    })

    return (
        <div style={{ position: 'relative', width: '100%', marginBottom: '8px' }}>
            <div
                style={{ opacity: sectionOpacity, marginBottom: 0 }}
                className={`${styles.item} ${isSettingsOpen ? styles.settingsOpen : ''}`}
                onClick={(e) => {
                    handleToggleSettings(e as any)
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleToggleSettings(e as any)
                    }
                }}
            >
                {/* 1. Icon Wrapper (Left) */}
                <div className={styles.itemIconWrapper}>
                    <SectionIcon id={id} />
                </div>

                {/* 2. Text Info (Center) */}
                <div className={styles.itemInfo}>
                    <span className={styles.itemName}>{name}</span>
                    {isLocked && (
                        <span className={`${styles.badge} ${styles.comingSoonBadge}`}>
                            {SECTION_UI_LABELS.STATUS.COMING_SOON}
                        </span>
                    )}
                    {!isLocked && isApiKeyLocked && (
                        <span className={`${styles.badge} ${styles.lockedBadge}`} style={{ background: 'rgba(255,0,0,0.1)', color: '#ff4d4d' }}>
                            NO API KEY
                        </span>
                    )}
                </div>

                {/* 3. Action Indicator (Right) */}
                {!isLocked && !shouldShowAddButton && (
                    <div className={styles.itemAction}>
                        {isApiKeyLocked ? (
                            <span style={{ fontSize: '14px', opacity: 0.7 }}>🔒</span>
                        ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.itemActionIcon}>
                                <path d="M12 3l1.912 5.813a2 2 0 001.272 1.272L21 12l-5.813 1.912a2 2 0 00-1.272 1.272L12 21l-1.912-5.813a2 2 0 00-1.272-1.272L3 12l5.813-1.912a2 2 0 001.272-1.272L12 3z"></path>
                                <path d="M5 5l.5 .5" opacity="0.5" />
                                <path d="M19 19l.5 .5" opacity="0.5" />
                            </svg>
                        )}
                    </div>
                )}

                {/* Locked Badge */}
                {isLocked && (
                    <div style={{ position: 'absolute', right: '12px', top: '12px' }}>
                        <span className={`${styles.badge} ${styles.lockedBadge}`}>
                            {SECTION_UI_LABELS.STATUS.LOCKED}
                        </span>
                    </div>
                )}
            </div>


            {/* Settings Popover */}
            {isSettingsOpen && isCustomizable && (
                <div className={styles.settingsPopOver} ref={popoverRef} data-block-id={activeWidgetBlockId}>
                    {id === 'activity-graph' && <ActivityGraphSettings blockId={activeWidgetBlockId} />}
                    {id === 'productive-time' && <ProductiveTimeSettings blockId={activeWidgetBlockId} />}
                    {id === 'weekly-languages' && <WeeklyLanguagesSettings blockId={activeWidgetBlockId} />}
                    {id === 'weekly-projects' && <WeeklyProjectsSettings blockId={activeWidgetBlockId} />}
                    {id === 'waka-10k-hours' && <WakaTenThousandSettings blockId={activeWidgetBlockId} />}
                    {id === 'yaml-bio' && <SimpleBioSettings />}
                </div>
            )}
        </div>
    )
}
