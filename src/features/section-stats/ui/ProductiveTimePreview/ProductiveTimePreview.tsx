'use client'

import { Block } from '@/entities/block/model/types'
import {
    generateCyberDeckAscii,
    generateModernSquareAscii,
    generateMinimalDotAscii,
    generateTerminalAscii,
    generateSliderAscii,
    generateCoffeeBreakAscii,
    getDynamicTitle
} from '@/entities/profile/lib/markdown/ascii-art'
import { useProfileStore } from '@/entities/profile/model/useProfileStore'

interface ProductiveTimePreviewProps {
    block: Block
}

export function ProductiveTimePreview({ block }: ProductiveTimePreviewProps) {
    const { accentColor } = useProfileStore()

    // Retrieve config from block
    const productiveTime = (block as any).config?.productiveTime

    if (!productiveTime || !productiveTime.stats) {
        return (
            <div style={{ padding: '20px', marginTop: '16px', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '8px', textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
                Please analyze your activity in the settings to generate the graph.
            </div>
        )
    }

    const { style, stats } = productiveTime

    const totalCommits = stats.commits.morning + stats.commits.daytime + stats.commits.evening + stats.commits.night

    // Generate ASCII Art based on style or empty state
    let ascii = ''
    if (totalCommits === 0) {
        ascii = generateCoffeeBreakAscii()
    } else {
        switch (style) {
            case 'modern':
                ascii = generateModernSquareAscii(stats)
                break
            case 'minimal':
                ascii = generateMinimalDotAscii(stats)
                break
            case 'terminal':
                ascii = generateTerminalAscii(stats)
                break
            case 'slider':
                ascii = generateSliderAscii(stats)
                break
            case 'cyber':
            default:
                ascii = generateCyberDeckAscii(stats)
                break
        }
    }

    // Strip markdown code fences (```text ... ```) for preview
    const cleanAscii = ascii
        .replace(/^```text\n/, '') // Remove Start Fence
        .replace(/```\n?$/, '')    // Remove End Fence

    const title = totalCommits === 0 ? '☕ Taking a Break' : getDynamicTitle(style, stats)

    return (
        <div style={{
            width: '100%',
            marginTop: '12px',
            marginBottom: '12px',
            backgroundColor: '#0d1117',
            borderRadius: '6px',
            border: '1px solid #30363d',
            padding: '16px',
            fontFamily: 'monospace',
            whiteSpace: 'pre',
            overflowX: 'auto',
            fontSize: '12px',
            lineHeight: '1.5',
            color: '#c9d1d9'
        }}>
            <div style={{ marginBottom: '12px', fontWeight: 'bold', color: accentColor }}>{title}</div>
            <div style={{ color: 'inherit' }}>{cleanAscii}</div>
        </div>
    )
}
