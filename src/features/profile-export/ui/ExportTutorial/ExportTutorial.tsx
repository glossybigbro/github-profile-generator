import React from 'react'
import styles from './ExportTutorial.module.css'

export interface ExportTutorialProps {
    requiredSecrets: string[]
}

const SECRETS_REGISTRY: Record<string, { title: string, desc: React.ReactNode, url: string }> = {
    'GH_TOKEN': {
        title: 'GitHub Personal Access Token',
        desc: <>Generate a classic token with <code>repo</code> and <code>user</code> scopes. Required to fetch github stats securely.</>,
        url: 'https://github.com/settings/tokens/new'
    },
    'WAKATIME_API_KEY': {
        title: 'WakaTime Secret API Key',
        desc: "Copy your Secret API Key from account settings. Required to calculate your coding hours.",
        url: 'https://wakatime.com/settings/api-key'
    }
}

export function ExportTutorial({ requiredSecrets }: ExportTutorialProps) {
    if (requiredSecrets.length === 0) return null

    return (
        <div className={styles.tutorialContainer}>
            <div className={styles.tutorialHeader}>
                <div className={styles.headerIcon}>🚀</div>
                <div className={styles.headerText}>
                    <h4>Action Required: Setup Keys</h4>
                    <p>Follow these steps to unlock auto-updates for your specific widgets.</p>
                </div>
            </div>

            <div className={styles.stepsContainer}>
                <div className={styles.step}>
                    <div className={styles.stepNumber}>1</div>
                    <div className={styles.stepContent}>
                        <h5>Upload ZIP to your repository</h5>
                        <p>
                            Extract the downloaded ZIP file and push all contents into the root of your <span className={styles.codePath}>username/username</span> repository.
                        </p>
                    </div>
                </div>

                <div className={styles.step}>
                    <div className={styles.stepNumber}>2</div>
                    <div className={styles.stepContent}>
                        <h5>Save Required Secrets to GitHub</h5>
                        <p>
                            In your repository, go to <strong>Settings {'>'} Secrets and variables {'>'} Actions</strong>. Add the following {requiredSecrets.length} secret keys to authorize the bots:
                        </p>
                        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {requiredSecrets.map(secretId => {
                                const secretInfo = SECRETS_REGISTRY[secretId]
                                if (!secretInfo) return null
                                return (
                                    <div key={secretId} style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <strong style={{ color: '#58a6ff', fontFamily: 'monospace' }}>{secretId}</strong>
                                            <a href={secretInfo.url} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#8b949e', textDecoration: 'underline' }}>
                                                Where to get it ↗
                                            </a>
                                        </div>
                                        <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>{secretInfo.title}</div>
                                        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>{secretInfo.desc}</div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
