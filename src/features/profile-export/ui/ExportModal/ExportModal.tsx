import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useProfileExport } from '../../model/useProfileExport'
import { useBlockStore } from '@/entities/block/model/useBlockStore'
import { useProfileStore } from '@/entities/profile/model/useProfileStore'
import { ExportTutorial } from '../ExportTutorial/ExportTutorial'
import styles from './ExportModal.module.css'

interface ExportModalProps {
    isOpen: boolean
    onClose: () => void
}

type Tab = 'export' | 'import'

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
    const { markdown, handleDownload, isCopied, copyToClipboard, restoreConfig, setExportCronFrequency } = useProfileExport()
    const blocks = useBlockStore((state) => state.blocks)
    const timezone = useProfileStore((state) => state.timezone)
    const setTimezone = useProfileStore((state) => state.setTimezone)
    const [activeTab, setActiveTab] = useState<Tab>('export')
    const [mounted, setMounted] = useState(false)
    const [cronFrequency, setCronFrequency] = useState('0 0 * * *') // Daily
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        setMounted(true)
        return () => setMounted(false)
    }, [])

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) onClose()
    }

    // Calculate required secrets based on widgets used in the canvas
    const requiredSecrets: string[] = []
    const hasGitHubWidgets = blocks.some((b: any) => b.type === 'widget' && ['productive-time', 'weekly-languages', 'weekly-projects'].includes(b.widgetType || b.id))
    const hasWakaTimeWidget = blocks.some((b: any) => b.type === 'widget' && (b.widgetType || b.id) === 'waka-10k-hours')

    if (hasGitHubWidgets) requiredSecrets.push('GH_TOKEN')
    if (hasWakaTimeWidget) requiredSecrets.push('WAKATIME_API_KEY')

    const hasDynamicFeatures = requiredSecrets.length > 0

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (event) => {
            try {
                const jsonText = (event.target?.result as string).replace(/^\s*\/\/.*$/gm, '')
                const json = JSON.parse(jsonText)
                const success = restoreConfig(json)
                if (success) {
                    alert("Configuration restored successfully!")
                    onClose()
                } else {
                    alert("Failed to restore configuration. Unsupported file format.")
                }
            } catch (err) {
                alert("Invalid configuration file. Please check the glossy-config.json file.")
            }
        }
        reader.readAsText(file)
    }

    if (!mounted) return null

    const modalContent = (
        <AnimatePresence>
            {isOpen && (
                <div className={styles.overlay} onClick={handleOverlayClick}>
                    <motion.div
                        className={styles.modal}
                        initial={{ opacity: 0, scale: 0.95, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 30 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                    >
                        {/* Header */}
                        <div className={styles.header}>
                            <h2 className={styles.title}>GitHub Profile: Export & Import Assistant</h2>
                            <button className={styles.closeButton} onClick={onClose}>×</button>
                        </div>

                        {/* Tabs */}
                        <div className={styles.tabs}>
                            <button
                                className={`${styles.tab} ${activeTab === 'export' ? styles.activeTab : ''}`}
                                onClick={() => setActiveTab('export')}
                            >
                                Export & Setup
                            </button>
                            <button
                                className={`${styles.tab} ${activeTab === 'import' ? styles.activeTab : ''}`}
                                onClick={() => setActiveTab('import')}
                            >
                                Import & Restore
                            </button>
                        </div>

                        {/* Content Area */}
                        <div className={styles.content}>
                            {activeTab === 'export' ? (
                                <div className={styles.exportPanel}>
                                    <div className={styles.configSection}>
                                        <h3 className={styles.sectionTitle}>Configuration & Export</h3>

                                        <div className={styles.dynamicContainer}>
                                            {hasDynamicFeatures && (
                                                <>
                                                    <div className={styles.formGroup}>
                                                        <label>Update Frequency (Cron)</label>
                                                        <div className={styles.selectWrapper}>
                                                            <select
                                                                className={styles.dropdown}
                                                                value={cronFrequency}
                                                                onChange={(e) => {
                                                                    setCronFrequency(e.target.value)
                                                                    setExportCronFrequency(e.target.value)
                                                                }}
                                                            >
                                                                <option value="0 * * * *">Hourly</option>
                                                                <option value="0 */6 * * *">Every 6 hours</option>
                                                                <option value="0 0 * * *">Daily</option>
                                                                <option value="0 0 * * 1">Weekly</option>
                                                            </select>
                                                        </div>
                                                        <p className={styles.helperText}>
                                                            Determines how often GitHub Actions update your stats.
                                                        </p>
                                                    </div>
                                                    <div className={styles.formGroup}>
                                                        <label>Timezone (TZ)</label>
                                                        <div className={styles.selectWrapper}>
                                                            <select
                                                                className={styles.dropdown}
                                                                value={timezone}
                                                                onChange={(e) => setTimezone(e.target.value)}
                                                            >
                                                                <option value="Asia/Seoul">Asia/Seoul (KST)</option>
                                                                <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                                                                <option value="America/New_York">America/New_York (EST/EDT)</option>
                                                                <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
                                                                <option value="Europe/London">Europe/London (GMT/BST)</option>
                                                                <option value="Europe/Paris">Europe/Paris (CET/CEST)</option>
                                                                <option value="UTC">UTC</option>
                                                            </select>
                                                        </div>
                                                        <p className={styles.helperText}>
                                                            Used by GitHub actions for accurate time aggregations.
                                                        </p>
                                                    </div>
                                                </>
                                            )}

                                            <button className={styles.primaryButton} onClick={handleDownload}>
                                                Download Full Project ZIP
                                            </button>

                                            {hasDynamicFeatures ? (
                                                <>
                                                    <ExportTutorial requiredSecrets={requiredSecrets} />
                                                    <details className={styles.guideBox}>
                                                        <summary className={styles.guideHeader}>
                                                            <span className={styles.guideIcon}>⚠️</span>
                                                            <h4>Important: Do Not Edit Inside Markers</h4>
                                                        </summary>
                                                        <div className={styles.guideText}>
                                                            <p>
                                                                GitHub Actions will completely overwrite anything inside the <code>&lt;!-- glossy-...-start --&gt;</code> and <code>-end</code> markers every day.
                                                            </p>
                                                            <ul>
                                                                <li>Any manual text or design changes you make <strong>inside the markers</strong> will be lost.</li>
                                                                <li>To permanently customize widgets, update your <code>glossy-config.json</code> file instead.</li>
                                                                <li>You can safely add your own markdown <strong>above or below</strong> the markers.</li>
                                                            </ul>
                                                        </div>
                                                    </details>

                                                    <details className={styles.guideBox} style={{ marginTop: '1rem' }}>
                                                        <summary className={styles.guideHeader}>
                                                            <span className={styles.guideIcon}>⚠️</span>
                                                            <h4>Advanced: Duplicating Widgets via JSON</h4>
                                                        </summary>
                                                        <div className={styles.guideText}>
                                                            <p>
                                                                If you manually duplicate widgets (via Copy & Paste) by opening the downloaded <code>glossy-config.json</code>:
                                                            </p>
                                                            <ul>
                                                                <li>You <strong>MUST</strong> change the <code>id</code> value of the duplicated widget to a new random string.</li>
                                                                <li>If two widgets share the exact same <code>id</code>, the GitHub Action script will mix them up and rendering will break!</li>
                                                            </ul>
                                                        </div>
                                                    </details>
                                                </>
                                            ) : (
                                                <div className={styles.staticNotice}>
                                                    <div className={styles.staticText}>
                                                        <h4>✨ Static Profile Detected</h4>
                                                        <p>No API widgets detected on the canvas. The ZIP file will only include your markdown and config backup without any GitHub Actions workflow.</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className={styles.previewSection}>
                                        <div className={styles.previewHeader}>
                                            <h3 className={styles.sectionTitle}>
                                                {hasDynamicFeatures ? "Initial Marker Code" : "Final Markdown Code"}
                                            </h3>
                                            <button className={styles.copyButton} onClick={copyToClipboard}>
                                                {isCopied ? 'Copied!' : 'Copy'}
                                            </button>
                                        </div>
                                        <div className={styles.codeBlock}>
                                            <pre>
                                                <code>{markdown || '<!-- No content generated -->'}</code>
                                            </pre>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className={styles.importPanel}>
                                    <div className={styles.importHeader}>
                                        <h3 className={styles.sectionTitle}>Restore & Migration</h3>
                                        <p className={styles.importDesc}>
                                            Upload a previously backed-up or GitHub-hosted <code>glossy-config.json</code> file to restore your design 100%.
                                        </p>
                                    </div>
                                    <div
                                        className={styles.dropZone}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileChange}
                                            accept=".json"
                                            style={{ display: 'none' }}
                                        />
                                        <div className={styles.dropZoneContent}>
                                            <div className={styles.cloudIcon}>☁️</div>
                                            <h4>Drag and drop your config JSON here or</h4>
                                            <button className={styles.browseButton}>Select File</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer Logo area */}
                        <div className={styles.footer}>
                            <div className={styles.logoBadge}>
                                <span>POWERED BY</span>
                                <strong>GITHUB API</strong>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )

    return createPortal(modalContent, document.body)
}

