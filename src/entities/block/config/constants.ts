export const BLOCK_TYPES = {
    HEADER: 'header',
    TEXT: 'text',
    BULLET: 'bullet', // Added Bullet type
    DIVIDER: 'divider',
    WIDGET: 'widget',
} as const

export const DEFAULT_BLOCK_TYPE = BLOCK_TYPES.TEXT

export const TOOLBAR_LABELS = {
    BOLD: 'Bold',
    ITALIC: 'Italic',
    LINK: 'Link',
    INSERT_H1: 'Heading 1',
    INSERT_H2: 'Heading 2',
    INSERT_H3: 'Heading 3',
    INSERT_TEXT: 'Text',
    INSERT_DIVIDER: 'Divider',
}

export const PLACEHOLDER_TEXT = {
    HEADER: "Heading",
    TEXT: "Type '/' for commands",
}

export const SLASH_TRIGGER_CHAR = '/'


export const FOOTER_LABELS = {
    PREVIEW_MODE: 'Preview Mode',
    EXPORT_MD: 'Export Markdown',
    DOWNLOAD: 'Download',
}

export const SLASH_MENU_ITEMS = [
    { id: 'text', label: 'Text', desc: 'Just start writing with plain text', icon: 'Aa', disabled: false },
    { id: 'h1', label: 'Heading 1', desc: 'Big section heading', icon: 'H1', disabled: false },
    { id: 'h2', label: 'Heading 2', desc: 'Medium section heading', icon: 'H2', disabled: false },
    { id: 'h3', label: 'Heading 3', desc: 'Small section heading', icon: 'H3', disabled: false },
    { id: 'bullet-list', label: 'Bullet List', desc: 'Create a simple bulleted list', icon: '•', disabled: true },
    { id: 'numbered-list', label: 'Numbered List', desc: 'Create a list with numbering', icon: '1.', disabled: true },
    { id: 'todo-list', label: 'To-do List', desc: 'Track tasks with a to-do list', icon: '☐', disabled: true },
    { id: 'toggle-list', label: 'Toggle List', desc: 'Toggles can hide and show content inside', icon: '▶', disabled: true },
    { id: 'table', label: 'Table', desc: 'Add simple tabular content', icon: '▦', disabled: true },
    { id: 'code', label: 'Code', desc: 'Capture a code snippet', icon: '<>', disabled: true },
    { id: 'quote', label: 'Quote', desc: 'Capture a quote', icon: '“', disabled: true },
    { id: 'divider', label: 'Divider', desc: 'Visually divide blocks', icon: '―', disabled: false },
    { id: 'callout', label: 'Callout', desc: 'Make writing stand out', icon: '💡', disabled: true },
] as const
