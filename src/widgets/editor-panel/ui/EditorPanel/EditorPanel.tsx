'use client'

import { useState } from 'react'
import { SectionBuilder } from '@/widgets/section-builder'
import { APP_CONFIG } from '@/shared/config/constants'
import styles from './EditorPanel.module.css'
import { useEditorPanel } from '../../model/useEditorPanel'

export function EditorPanel() {
    const { username, handleChangeUser } = useEditorPanel()

    return (
        <div className={styles.leftPanel}>
            <div className={styles.panelHeader}>
                <h3 className={styles.panelTitle}>{username}</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        className={styles.changeUserButton}
                        onClick={handleChangeUser}
                        aria-label="Change User"
                    >
                        {APP_CONFIG.BUTTONS.CHANGE_USER}
                    </button>
                </div>
            </div>

            <div className={styles.sections}>
                <SectionBuilder />
            </div>
        </div>
    )
}
