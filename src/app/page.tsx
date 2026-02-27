'use client'

import { useState } from 'react'
import { SpaceBackground } from '@/shared/ui'
import { EditorPanel } from '@/widgets/editor-panel'
import { CanvasEditor } from '@/widgets/canvas-editor'
import { OnboardingCard } from '@/features/onboarding'
import { HudTransmission, ReleaseModal } from '@/features/release-notification'
import { ExportFAB } from '@/features/profile-export/ui/ExportFAB'
import { ExportModal } from '@/features/profile-export/ui/ExportModal'
import { WakaActivationModal } from '@/features/wakatime-integration/ui/WakaActivationModal'
import { useProfileStore } from '@/entities/profile/model/useProfileStore'
import styles from './page.module.css'

export default function GeneratorPage() {
    const { currentStep } = useProfileStore()
    const [showNotice, setShowNotice] = useState(false)
    const [isExportOpen, setIsExportOpen] = useState(false)

    return (
        <>
            <SpaceBackground />

            <div className={styles.pageContainer}>
                {currentStep === 'hero' ? (
                    <div className={styles.onboardingWrapper}>
                        <OnboardingCard />
                        <HudTransmission onClick={() => setShowNotice(true)} />
                        <ReleaseModal isOpen={showNotice} onClose={() => setShowNotice(false)} />
                    </div>
                ) : (
                    <main className={styles.editorLayout}>
                        <EditorPanel />
                        <CanvasEditor />
                    </main>
                )}
            </div>

            {/* Export UI - Fixed to Viewport */}
            {currentStep !== 'hero' && (
                <>
                    <ExportFAB onClick={() => setIsExportOpen(true)} />
                    <ExportModal
                        isOpen={isExportOpen}
                        onClose={() => setIsExportOpen(false)}
                    />
                    <WakaActivationModal />
                </>
            )}
        </>
    )
}
