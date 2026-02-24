export const markdownToHtml = (markdown: string): string => {
    if (!markdown) return ''

    let html = markdown
        // Escape HTML characters first to prevent XSS and confusion
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')

    // Image: ![alt](url) - Must be before links
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')

    // Bold: **text**
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')

    // Italic: *text* or _text_
    // Handle * separately to avoid matching inside **
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')
    html = html.replace(/_([^_]+)_/g, '<em>$1</em>')

    // Strike: ~~text~~
    html = html.replace(/~~(.*?)~~/g, '<del>$1</del>')

    // Inline Code: `text`
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>')

    // Link: [text](url) - Allow empty text and url to prevent breakage
    html = html.replace(/\[([^\]]*)\]\(([^)]*)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')

    return html
}

export const htmlToMarkdown = (html: string): string => {
    if (!html) return ''

    // Create a temporary DOM element to parse HTML
    const div = document.createElement('div')
    div.innerHTML = html

    const walk = (node: Node): string => {
        if (node.nodeType === Node.TEXT_NODE) {
            return node.textContent || ''
        }

        if (node.nodeType !== Node.ELEMENT_NODE) return ''

        const el = node as HTMLElement
        let content = ''

        el.childNodes.forEach(child => {
            content += walk(child)
        })

        switch (el.tagName.toLowerCase()) {
            case 'strong':
            case 'b':
                return `**${content}**`
            case 'em':
            case 'i':
                return `*${content}*` // Standardize on * for italic
            case 'del':
            case 's':
            case 'strike':
                return `~~${content}~~`
            case 'code':
                return `\`${content}\``
            case 'a':
                return `[${content}](${el.getAttribute('href') || ''})`
            case 'img':
                return `![${el.getAttribute('alt') || ''}](${el.getAttribute('src') || ''})`
            case 'br':
            case 'div':
            case 'p':
                // Block elements in contentEditable might add newlines, but we want single line mostly?
                // But Shift+Enter might add <br>. For now, handle <br>
                if (el.tagName.toLowerCase() === 'br') return '\n'
                return content // fallback for divs/p (unwrap)
            default:
                return content
        }
    }

    // Unescape HTML entities at the end
    let markdown = walk(div)

    // Simple unescape for basic entities if needed, but textContent handles most
    return markdown
}

// Helper to estimate cursor position in rendered HTML based on markdown source
// This estimates where the cursor should be in "textContent" space
export const getSmartCursorPosition = (markdown: string, rawOffset: number): number => {
    const prefix = markdown.slice(0, rawOffset)

    // We need to simulate how the text looks after rendering
    // This is a heuristic that strips markdown syntax to match textContent length
    let clean = prefix
        // Images: ![alt](url) -> length 0 in textContent (usually)
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '')

        // Links: [text](url) -> text
        .replace(/\[([^\]]*)\]\(([^)]*)\)/g, '$1')

        // Bold: **text** -> text
        .replace(/\*\*(.*?)\*\*/g, '$1')

        // Italic: *text* or _text_ -> text
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/_([^_]+)_/g, '$1')

        // Strike: ~~text~~ -> text
        .replace(/~~(.*?)~~/g, '$1')

        // Inline Code: `text` -> text
        .replace(/`([^`]+)`/g, '$1')

        // Remove lingering markers if partial (e.g. typing `**` at start)
        .replace(/\*\*/g, '')
        .replace(/__/g, '')
        .replace(/~~/g, '')
        .replace(/!\[/g, '')
        .replace(/\]\(/g, '')
        .replace(/\)/g, '')
        // Single chars last
        .replace(/\*/g, '')
        .replace(/_/g, '')
        .replace(/`/g, '')
        .replace(/\[/g, '')

    return clean.length
}

export const mapHtmlOffsetToMarkdownOffset = (markdown: string, htmlOffset: number): number => {
    let visualCounter = 0
    let mdIndex = 0
    let remaining = markdown

    while (remaining.length > 0 && visualCounter < htmlOffset) {
        // Precedence matches markdownToHtml

        // 1. Image: ![alt](url) -> Visual: 0
        const imgMatch = remaining.match(/^!\[([^\]]*)\]\(([^)]+)\)/)
        if (imgMatch) {
            mdIndex += imgMatch[0].length
            remaining = markdown.slice(mdIndex)
            continue
        }

        // 2. Bold: **text** -> Visual: text.length
        const boldMatch = remaining.match(/^\*\*(.*?)\*\*/)
        if (boldMatch) {
            const text = boldMatch[1]
            if (visualCounter + text.length >= htmlOffset) {
                const offsetInText = htmlOffset - visualCounter
                // If at end of visual text, jump to end of MD syntax
                if (offsetInText === text.length) return mdIndex + boldMatch[0].length
                return mdIndex + 2 + offsetInText
            }
            visualCounter += text.length
            mdIndex += boldMatch[0].length
            remaining = markdown.slice(mdIndex)
            continue
        }

        // 3. Italic: *text* or _text_
        const italicMatch = remaining.match(/^\*([^*]+)\*/) || remaining.match(/^_([^_]+)_/)
        if (italicMatch) {
            const text = italicMatch[1]
            if (visualCounter + text.length >= htmlOffset) {
                const offsetInText = htmlOffset - visualCounter
                if (offsetInText === text.length) return mdIndex + italicMatch[0].length
                return mdIndex + 1 + offsetInText
            }
            visualCounter += text.length
            mdIndex += italicMatch[0].length
            remaining = markdown.slice(mdIndex)
            continue
        }

        // 4. Strike: ~~text~~
        const strikeMatch = remaining.match(/^~~(.*?)~~/)
        if (strikeMatch) {
            const text = strikeMatch[1]
            if (visualCounter + text.length >= htmlOffset) {
                const offsetInText = htmlOffset - visualCounter
                if (offsetInText === text.length) return mdIndex + strikeMatch[0].length
                return mdIndex + 2 + offsetInText
            }
            visualCounter += text.length
            mdIndex += strikeMatch[0].length
            remaining = markdown.slice(mdIndex)
            continue
        }

        // 5. Code: `text`
        const codeMatch = remaining.match(/^`([^`]+)`/)
        if (codeMatch) {
            const text = codeMatch[1]
            if (visualCounter + text.length >= htmlOffset) {
                const offsetInText = htmlOffset - visualCounter
                if (offsetInText === text.length) return mdIndex + codeMatch[0].length
                return mdIndex + 1 + offsetInText
            }
            visualCounter += text.length
            mdIndex += codeMatch[0].length
            remaining = markdown.slice(mdIndex)
            continue
        }

        // 6. Link: [text](url)
        const linkMatch = remaining.match(/^\[([^\]]*)\]\(([^)]*)\)/)
        if (linkMatch) {
            const text = linkMatch[1]
            if (visualCounter + text.length >= htmlOffset) {
                const offsetInText = htmlOffset - visualCounter
                // CRITICAL FIX: If at end of link text, return AFTER closing paren
                if (offsetInText === text.length) return mdIndex + linkMatch[0].length
                return mdIndex + 1 + offsetInText
            }
            visualCounter += text.length
            mdIndex += linkMatch[0].length
            remaining = markdown.slice(mdIndex)
            continue
        }

        // Plain char
        mdIndex++
        visualCounter++
        remaining = markdown.slice(mdIndex)
    }

    return mdIndex
}


export const restoreCursorToOffset = (element: HTMLElement | null, targetOffset: number) => {
    if (!element) return

    try {
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null)
        let currentPos = 0
        let targetNode = null
        let targetLocalOffset = 0

        while (walker.nextNode()) {
            const node = walker.currentNode
            const length = node.textContent?.length || 0

            if (currentPos + length >= targetOffset) {
                targetNode = node
                targetLocalOffset = targetOffset - currentPos
                break
            }
            currentPos += length
        }

        const newRange = document.createRange()
        if (targetNode) {
            const safeOffset = Math.min(targetLocalOffset, targetNode.textContent?.length || 0)
            newRange.setStart(targetNode, safeOffset)
            newRange.collapse(true)
        } else {
            // Fallback to end
            newRange.selectNodeContents(element)
            newRange.collapse(false)
        }

        const sel = window.getSelection()
        sel?.removeAllRanges()
        sel?.addRange(newRange)
    } catch (e) {
        // Ignore selection errors
    }
}
