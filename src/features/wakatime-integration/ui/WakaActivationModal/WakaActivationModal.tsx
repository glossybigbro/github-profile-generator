'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useProfileStore } from '@/entities/profile/model/useProfileStore'
import styles from './WakaActivationModal.module.css'

export function WakaActivationModal() {
    const [isOpen, setIsOpen] = useState(false)
    const githubId = useProfileStore(state => state.username)
    const setWakatimeKey = useProfileStore(state => state.setWakatimeKey)

    const [inputValue, setInputValue] = useState('')
    const [isVerifying, setIsVerifying] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [successData, setSuccessData] = useState<{ username: string, isMatch: boolean } | null>(null)

    useEffect(() => {
        const handleOpen = () => {
            setIsOpen(true)
            setInputValue('')
            setError(null)
            setSuccessData(null)
        }
        window.addEventListener('open-wakatime-activation', handleOpen)
        return () => window.removeEventListener('open-wakatime-activation', handleOpen)
    }, [])

    const handleClose = () => {
        setIsOpen(false)
    }

    const handleVerify = async () => {
        if (!inputValue.trim()) {
            setError('Please enter your Secret API Key.')
            return
        }

        setIsVerifying(true)
        setError(null)
        setSuccessData(null)

        try {
            const res = await fetch('/api/wakatime/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey: inputValue.trim() })
            })

            const data = await res.json()

            if (data.success) {
                const rawUsername = data.user.username || data.user.displayName || 'Anonymous User'
                const wakaUser = rawUsername.trim()

                const isAnonymous = wakaUser.toLowerCase() === 'anonymous user' || wakaUser.toLowerCase() === 'anonymous' || wakaUser === 'Unknown'
                const isMatch = !isAnonymous && wakaUser.toLowerCase() === githubId.toLowerCase()

                // successData에 isAnonymous 플래그 추가
                setSuccessData({ username: wakaUser, isMatch, isAnonymous } as any)
                setWakatimeKey(inputValue.trim())

                // Auto close after 3 seconds on success
                setTimeout(() => {
                    setIsOpen(false)
                }, 3000)
            } else {
                setError(data.message || 'Invalid API Key.')
            }
        } catch (err) {
            setError('Verification failed. Please check your network or key.')
        } finally {
            setIsVerifying(false)
        }
    }

    if (!isOpen) return null

    return createPortal(
        <div className={styles.overlay} onClick={handleClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <button className={styles.closeBtn} onClick={handleClose}>✕</button>

                <div className={styles.scrollArea}>
                    <div className={styles.header}>
                        <div className={styles.iconWrapper}>⏱️</div>
                        <h2 className={styles.title}>WakaTime Integration</h2>
                        <p className={styles.subtitle}>
                            Connect your WakaTime account to unlock WakaTime widgets.
                        </p>
                    </div>

                    <div className={styles.content}>
                        <div className={styles.introBox}>
                            <h3 className={styles.introTitle}>⚠️ Important: Have you installed the editor plugin?</h3>
                            <p className={styles.introDesc}>
                                WakaTime requires an extension to be installed in your code editor (VSCode, IntelliJ, etc.) to track your coding time. An API key alone is not enough.
                            </p>
                            <div className={styles.guideStep}>
                                <strong>VSCode Setup:</strong><br />
                                1. Open Extensions (Cmd/Ctrl + Shift + X)<br />
                                2. Search for <code>WakaTime</code> and install it<br />
                                3. Paste your Secret API Key when prompted<br />
                                <br />
                                <a href="https://wakatime.com/plugins" target="_blank" rel="noreferrer" style={{ color: '#df9cff', textDecoration: 'underline' }}>
                                    View installation guides for other editors ↗
                                </a>
                            </div>
                            <p className={styles.pricingNote}>
                                💡 <strong>Free vs Premium Tier:</strong><br />
                                The core time tracking functionality is <strong>fully supported on the Free Tier</strong>. The Premium tier simply offers extended historical data retention. Rest assured, the Free version works perfectly for this widget.
                            </p>
                        </div>

                        <div className={styles.stepBox}>
                            <div className={styles.stepHeader}>
                                <span className={styles.stepNum}>1</span>
                                <span>Get your Secret API Key</span>
                            </div>
                            <p className={styles.stepDesc}>
                                Go to your WakaTime Settings and copy your Secret API Key (starts with <code>waka_</code>).
                            </p>
                            <a
                                href="https://wakatime.com/settings/api-key"
                                target="_blank"
                                rel="noreferrer"
                                className={styles.linkBtn}
                            >
                                Open WakaTime Settings ↗
                            </a>
                        </div>

                        <div className={styles.inputSection}>
                            <label className={styles.label}>Secret API Key</label>
                            <div className={styles.inputWrapper}>
                                <input
                                    type="password"
                                    placeholder="waka_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                                    className={styles.input}
                                    disabled={isVerifying || successData !== null}
                                />
                                <button
                                    className={styles.verifyBtn}
                                    onClick={handleVerify}
                                    disabled={isVerifying || successData !== null}
                                >
                                    {isVerifying ? 'Verifying...' : 'Verify'}
                                </button>
                            </div>
                            {error && <p className={styles.errorText}>{error}</p>}
                        </div>

                        {successData && (
                            <div className={`${styles.resultBox} ${successData.isMatch ? styles.matchBox : styles.warnBox}`}>
                                <div className={styles.resultHeader}>
                                    {successData.isMatch ? '✅ Perfect Match!' : ((successData as any).isAnonymous ? '⚠️ Anonymous Profile' : '⚠️ Account Verified')}
                                </div>
                                <p className={styles.resultDesc}>
                                    WakaTime Username: <strong>{successData.username}</strong><br />
                                    GitHub ID: <strong>{githubId}</strong>
                                </p>

                                {(successData as any).isAnonymous && (
                                    <p className={styles.warnDesc}>
                                        Your WakaTime profile is set to Anonymous, but your API Key is perfectly valid! The integration is now active.
                                    </p>
                                )}

                                {!successData.isMatch && !(successData as any).isAnonymous && (
                                    <p className={styles.warnDesc}>
                                        The usernames differ, but the key is valid. The integration is now active!
                                    </p>
                                )}
                                {successData.isMatch && (
                                    <p className={styles.matchDesc}>
                                        Usernames match perfectly. The integration is now active!
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    )
}
