'use client'

import { useProfileStore } from '@/entities/profile/model/useProfileStore'
import { Block } from '@/entities/block/model/types'
import { generateActivityGraphUrl, ActivityGraphConfig } from '@/features/section-stats/lib/activity-graph-utils'

interface ActivityGraphPreviewProps {
    block: Block
}

export function ActivityGraphPreview({ block }: ActivityGraphPreviewProps) {
    const { username } = useProfileStore()

    // Retrieve config from block
    const config = ((block as any).config || {}) as ActivityGraphConfig

    if (!username) {
        return (
            <div style={{ padding: '20px', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '8px', textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
                Please set your GitHub username in the profile settings.
            </div>
        )
    }

    const graphUrl = generateActivityGraphUrl(username, config)

    return (
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: '12px', marginBottom: '12px' }}>
            <img
                src={graphUrl}
                alt={`${username}'s Activity Graph`}
                style={{ maxWidth: '100%', height: 'auto' }}
            />
        </div>
    )
}
