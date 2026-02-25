import React from 'react'
import styles from './ExportTutorial.module.css'

export function ExportTutorial() {
    return (
        <div className={styles.tutorialContainer}>
            <div className={styles.tutorialHeader}>
                <div className={styles.headerIcon}>🚀</div>
                <div className={styles.headerText}>
                    <h4>How to setup GitHub Actions</h4>
                    <p>Follow these 3 simple steps to automate your profile updates.</p>
                </div>
            </div>

            <div className={styles.stepsContainer}>
                <div className={styles.step}>
                    <div className={styles.stepNumber}>1</div>
                    <div className={styles.stepContent}>
                        <h5>Upload to your repository</h5>
                        <p>
                            Extract the downloaded ZIP file and move all contents into the root of your <span className={styles.codePath}>username/username</span> repository.
                            <br /><span style={{ fontSize: '13px', opacity: 0.8, fontStyle: 'italic', marginTop: '6px', display: 'inline-block', lineHeight: 1.4 }}>* Why? The uploaded YAML file acts as an alarm clock, telling GitHub exactly when to run the stats update script automatically.</span>
                        </p>
                    </div>
                </div>

                <div className={styles.step}>
                    <div className={styles.stepNumber}>2</div>
                    <div className={styles.stepContent}>
                        <h5>Get Personal Access Token</h5>
                        <p>
                            Go to GitHub <strong>Settings {'>'} Developer settings {'>'} Personal access tokens (classic)</strong>. Generate a new token with <code>repo</code> and <code>user</code> scopes.
                            <br /><span style={{ fontSize: '13px', opacity: 0.8, fontStyle: 'italic', marginTop: '6px', display: 'inline-block', lineHeight: 1.4 }}>* Why? The script needs read & write permission to fetch your private commit history and calculate accurate language stats.</span>
                        </p>
                    </div>
                </div>

                <div className={styles.step}>
                    <div className={styles.stepNumber}>3</div>
                    <div className={styles.stepContent}>
                        <h5>Save Secret & Done!</h5>
                        <p>
                            In your repository, go to <strong>Settings {'>'} Secrets and variables {'>'} Actions</strong>. Click <strong>New repository secret</strong>, name it <span className={styles.codePath}>GH_TOKEN</span>, and paste the token.
                            <br /><span style={{ fontSize: '13px', opacity: 0.8, fontStyle: 'italic', marginTop: '6px', display: 'inline-block', lineHeight: 1.4 }}>* Why? This securely hides your token from the public while allowing the automated script to log in as you to draw the widgets.</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
