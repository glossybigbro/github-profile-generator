import { HeaderBlock, TextBlock, BulletBlock, DividerBlock, WidgetBlock, Block } from './types'
import { BLOCK_TYPES } from '../config/constants'

export const createBulletBlock = (content: string = '', indent: number = 0): BulletBlock => ({
    id: `${Date.now()}-${Math.random()}`,
    type: BLOCK_TYPES.BULLET,
    content,
    indent,
    createdAt: Date.now(),
})

export const createWidgetBlock = (widgetType: string, config: Record<string, unknown> = {}): WidgetBlock => ({
    id: `${Date.now()}-${Math.random()}`,
    type: 'widget',
    widgetType,
    config,
    createdAt: Date.now(),
})

export const createHeaderBlock = (level: 1 | 2 | 3): HeaderBlock => ({
    id: `${Date.now()}-${Math.random()}`,
    type: BLOCK_TYPES.HEADER,
    level,
    content: '',
    createdAt: Date.now(),
})

export const createTextBlock = (): TextBlock => ({
    id: `${Date.now()}-${Math.random()}`,
    type: BLOCK_TYPES.TEXT,
    content: '',
    createdAt: Date.now(),
})

export const createDividerBlock = (): DividerBlock => ({
    id: `${Date.now()}-${Math.random()}`,
    type: BLOCK_TYPES.DIVIDER,
    createdAt: Date.now(),
})

export const createBioTemplate = (previewId: string, bioData?: any): Block[] => {
    const timestamp = Date.now()
    const blocks: Block[] = []

    // Default fallback data
    const data = bioData || {
        heading: "👋 Hi there! I'm a Developer",
        description: "I'm passionate about building scalable web applications and open source software.",
        bullets: [
            { id: 'default-1', text: "🔭 I’m currently working on something cool" },
            { id: 'default-2', text: "🌱 I’m currently learning Rust and WebAssembly" }
        ],
        showHeading: true,
        showDescription: true,
        showBullets: true
    }

    // 1. Heading
    if (data.showHeading !== false) {
        blocks.push({
            id: `${timestamp}-bio-header`,
            type: BLOCK_TYPES.HEADER,
            level: data.headingSize === 'h2' ? 2 : data.headingSize === 'h3' ? 3 : 1,
            content: data.heading || "👋 Hi there!",
            createdAt: timestamp,
            previewId,
            style: { marginTop: '12px', marginBottom: '12px' }
        } as HeaderBlock)
    }

    // 2. Description
    if (data.showDescription !== false) {
        blocks.push({
            id: `${timestamp}-bio-desc`,
            type: BLOCK_TYPES.TEXT,
            content: data.description || "",
            createdAt: timestamp,
            previewId
        } as TextBlock)
    }

    // 3. Bullets
    if (data.showBullets !== false && data.bullets && data.bullets.length > 0) {
        data.bullets.forEach((bullet: any, index: number) => {
            blocks.push({
                id: `${timestamp}-bio-bullet-${index}`,
                type: BLOCK_TYPES.BULLET,
                content: bullet.text,
                createdAt: timestamp,
                previewId
            } as BulletBlock)
        })
    }

    // 4. Empty Line at the end
    blocks.push({
        id: `${timestamp}-bio-empty-end`,
        type: BLOCK_TYPES.TEXT,
        content: '',
        createdAt: timestamp,
        previewId
    } as TextBlock)

    return blocks
}
