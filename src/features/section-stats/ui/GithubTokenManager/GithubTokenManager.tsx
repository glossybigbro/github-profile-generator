import { useState } from 'react'
import { useProfileStore } from '@/entities/profile/model/useProfileStore'
import styles from '@/shared/styles/SectionSettings.module.css'

export function GithubTokenManager() {
    const githubToken = useProfileStore(state => state.githubToken)
    const setGithubToken = useProfileStore(state => state.setGithubToken)

    // Start editing automatically if no token exists
    const [isEditing, setIsEditing] = useState(!githubToken)
    const [inputValue, setInputValue] = useState(githubToken || '')
    const [isVerifying, setIsVerifying] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleVerify = async () => {
        if (!inputValue.trim()) {
            setError('Please enter a GitHub Token.')
            return
        }

        setIsVerifying(true)
        setError(null)

        try {
            const response = await fetch('https://api.github.com/user', {
                headers: {
                    Authorization: `Bearer ${inputValue.trim()}`,
                    Accept: 'application/vnd.github.v3+json'
                }
            })

            if (response.ok) {
                // Token is valid
                setGithubToken(inputValue.trim())
                setIsEditing(false)
            } else {
                setError('Invalid GitHub Token. Please check and try again.')
            }
        } catch (err) {
            setError('Failed to verify token. Network error.')
        } finally {
            setIsVerifying(false)
        }
    }

    const startEditing = () => {
        setInputValue(githubToken || '')
        setIsEditing(true)
        setError(null)
    }

    if (githubToken && !isEditing) {
        return (
            <div className={styles.settingsSection} style={{
                background: 'rgba(46, 160, 67, 0.15)',
                border: '1px solid rgba(46, 160, 67, 0.3)',
                borderRadius: '12px',
                padding: '16px',
                boxShadow: 'inset 0 0 20px rgba(46, 160, 67, 0.05)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>✅</span>
                        <span style={{ color: '#4ade80', fontWeight: 600, fontSize: '14px' }}>Token Active</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={startEditing}
                            style={{
                                background: 'rgba(255, 255, 255, 0.1)',
                                border: 'none',
                                color: '#fff',
                                fontSize: '11px',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            Change Token
                        </button>
                        <button
                            onClick={() => setGithubToken('')}
                            style={{
                                background: 'rgba(239, 68, 68, 0.2)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                color: '#fca5a5',
                                fontSize: '11px',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            Remove
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className={styles.settingsSection} style={{
            background: 'linear-gradient(145deg, rgba(34, 211, 238, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)',
            border: '1px solid rgba(34, 211, 238, 0.3)',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: 'inset 0 0 20px rgba(34, 211, 238, 0.05), 0 4px 12px rgba(0,0,0,0.1)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px', filter: 'drop-shadow(0 0 8px rgba(34, 211, 238, 0.8))' }}>✨</span>
                    <span style={{ color: '#67e8f9', fontWeight: 700, fontSize: '14px', letterSpacing: '0.3px', textShadow: '0 0 10px rgba(34, 211, 238, 0.4)' }}>
                        {githubToken ? 'Update Token' : 'Real-Time Data Access'}
                    </span>
                </div>
                {githubToken && (
                    <button
                        onClick={() => setIsEditing(false)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'rgba(255,255,255,0.5)',
                            fontSize: '11px',
                            cursor: 'pointer',
                            textDecoration: 'underline'
                        }}
                    >
                        Cancel
                    </button>
                )}
            </div>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', lineHeight: '1.5', marginBottom: '14px' }}>
                {githubToken ? 'Your existing token remains active until you verify a new one.' : 'Connect your GitHub Personal Access Token to analyze your real stats.'}
            </p>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                <input
                    type="password"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                    placeholder="ghp_xxxxxxxxxxxx"
                    className={styles.textInput}
                    disabled={isVerifying}
                    style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid rgba(34, 211, 238, 0.3)',
                        backgroundColor: 'rgba(0,0,0,0.3)',
                        color: '#fff',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        outline: 'none'
                    }}
                />
                <button
                    onClick={handleVerify}
                    disabled={isVerifying}
                    style={{
                        padding: '0 16px',
                        background: 'rgba(34, 211, 238, 0.2)',
                        border: '1px solid rgba(34, 211, 238, 0.5)',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: isVerifying ? 'not-allowed' : 'pointer',
                        opacity: isVerifying ? 0.7 : 1
                    }}
                >
                    {isVerifying ? '...' : 'Verify'}
                </button>
            </div>

            {error && (
                <p style={{ color: '#ef4444', fontSize: '11px', marginBottom: '10px' }}>
                    {error}
                </p>
            )}

            <button
                onClick={() => window.open('https://github.com/settings/tokens/new?scopes=repo,read:user&description=GlossyBigBro%20Profile%20Generator', '_blank')}
                style={{
                    width: '100%',
                    padding: '10px',
                    background: 'rgba(34, 211, 238, 0.1)',
                    border: '1px solid rgba(34, 211, 238, 0.3)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease'
                }}
            >
                🔗 Generate GitHub Token
            </button>
        </div>
    )
}
