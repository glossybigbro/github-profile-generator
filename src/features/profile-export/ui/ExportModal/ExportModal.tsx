import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useProfileExport } from '../../model/useProfileExport'
import styles from './ExportModal.module.css'

interface ExportModalProps {
    isOpen: boolean
    onClose: () => void
}

type Tab = 'preview' | 'settings'

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
    const { markdown, handleDownload, isCopied, copyToClipboard, hasDynamicFeatures } = useProfileExport()
    const [activeTab, setActiveTab] = useState<Tab>('preview')
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        return () => setMounted(false)
    }, [])

    // Force preview tab if static mode
    useEffect(() => {
        if (!hasDynamicFeatures) {
            setActiveTab('preview')
        }
    }, [hasDynamicFeatures])

    // Close on overlay click
    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) onClose()
    }

    if (!mounted) return null

    // Portal content
    const modalContent = (
        <AnimatePresence>
            {isOpen && (
                <div className={styles.overlay} onClick={handleOverlayClick}>
                    <motion.div
                        className={styles.modal}
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.2 }}
                    >
                        {/* Header */}
                        <div className={styles.header}>
                            <h2 className={styles.title}>Export Profile</h2>
                            <button className={styles.closeButton} onClick={onClose}>×</button>
                        </div>

                        {/* Tabs - Only show if dynamic features exist */}
                        {hasDynamicFeatures && (
                            <div className={styles.tabs}>
                                <button
                                    className={`${styles.tab} ${activeTab === 'preview' ? styles.activeTab : ''}`}
                                    onClick={() => setActiveTab('preview')}
                                >
                                    Preview Markdown
                                </button>
                                <button
                                    className={`${styles.tab} ${activeTab === 'settings' ? styles.activeTab : ''}`}
                                    onClick={() => setActiveTab('settings')}
                                >
                                    Automation Settings
                                </button>
                            </div>
                        )}

                        {/* Content Area */}
                        <div className={`${styles.content} ${!hasDynamicFeatures ? styles.staticMode : ''}`}>
                            {activeTab === 'preview' ? (
                                <div className={styles.codePreview}>
                                    <pre>
                                        <code>{markdown}</code>
                                    </pre>
                                </div>
                            ) : (
                                <div className={styles.settingsPanel}>
                                    <div className={styles.settingItem}>
                                        <label>Update Interval</label>
                                        <select className={styles.select}>
                                            <option value="0 */6 * * *">Every 6 hours</option>
                                            <option value="0 */12 * * *">Every 12 hours</option>
                                            <option value="0 0 * * *">Daily</option>
                                        </select>
                                        <p className={styles.helperText}>
                                            This determines how often GitHub Actions will update your stats.
                                        </p>
                                    </div>
                                    <div className={styles.yamlPreview}>
                                        <h4>Workflow Preview (update.yml)</h4>
                                        <pre>
                                            <code>
                                                {`name: Update Profile README

on:
  schedule:
    - cron: '0 */6 * * *'
  workflow_dispatch:

jobs:
  update-readme:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: curl -s "..." > README.md
      - run: |
          git config user.name "github-actions[bot]"
          git commit -am "Auto-update" && git push`}
                                            </code>
                                        </pre>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div className={styles.footer}>
                            <div className={styles.secondaryActions}>
                                <button className={styles.copyButton} onClick={copyToClipboard}>
                                    {isCopied ? 'Copied!' : 'Copy Markdown'}
                                </button>
                            </div>
                            <button className={styles.downloadButton} onClick={handleDownload}>
                                {hasDynamicFeatures ? 'Download ZIP Package' : 'Download README.md'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )

    return createPortal(modalContent, document.body)
}
