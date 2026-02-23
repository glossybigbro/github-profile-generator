/**
 * Bio Settings UI Constants
 * 
 * Centralized configuration for SimpleBioSettings component
 */

export const BIO_UI_LABELS = {
    HEADING: 'Heading',
    INTRODUCTION: 'Introduction',
    DETAILS: 'Details (Bullets)',
    ADD_BULLET: '+ Add Bullet Item',
    REMOVE_ITEM: 'Remove item',
    ADD_TO_CANVAS: '✨ Add to Canvas',
} as const

export const BIO_PLACEHOLDERS = {
    HEADING: "e.g. Hey there! I'm Alex 👋",
    INTRODUCTION: 'Tell us about yourself... (Markdown supported)',
    BULLET: 'e.g. ⚡ Fun fact: I love coding',
} as const

export const HEADING_SIZE_OPTIONS = [
    { value: 'h1', label: 'H1' },
    { value: 'h2', label: 'H2' },
    { value: 'h3', label: 'H3' },
] as const

export const TEXTAREA_CONFIG = {
    HEADING_MIN_HEIGHT: 40,
    INTRODUCTION_MIN_HEIGHT: 80,
} as const
