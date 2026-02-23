'use client'

import { useState } from 'react'
import { SectionBuilder } from '@/widgets/section-builder'
import { APP_CONFIG } from '@/shared/config/constants'
import { ExportModal } from '@/features/profile-export'
import styles from './EditorPanel.module.css'
import { useEditorPanel } from '../../model/useEditorPanel'

export function EditorPanel() {
    const { username, handleChangeUser } = useEditorPanel()
    const [isExportModalOpen, setIsExportModalOpen] = useState(false)

    return (
        <div className={styles.leftPanel}>
            <div className={styles.panelHeader}>
                <h3 className={styles.panelTitle}>{username}</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        className={styles.changeUserButton}
                        onClick={() => setIsExportModalOpen(true)}
                        style={{ backgroundColor: '#238636', borderColor: 'transparent' }}
                    >
                        Export
                    </button>
                    <button
                        className={styles.changeUserButton}
                        onClick={handleChangeUser}
                        aria-label="Change User"
                    >
                        {APP_CONFIG.BUTTONS.CHANGE_USER}
                    </button>
                </div>
            </div>

            <ExportModal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
            />

            <div className={styles.sections}>
                <SectionBuilder />
            </div>
        </div>
    )
}
