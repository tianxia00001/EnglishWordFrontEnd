function escapeHtml(raw) {
  return String(raw || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeRegExp(text) {
  return String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function replaceMarkedWords(htmlText, highlight = false) {
  return htmlText.replace(/\*\*([^*]+)\*\*|\*([^*]+)\*/g, (_match, p1, p2) => {
    const word = p1 || p2 || ''
    if (!highlight) return word
    return `<span class="selected-word-highlight">${word}</span>`
  })
}

function extractChineseTerms(text) {
  const raw = String(text || '').trim()
  if (!raw) return []

  const normalized = raw
    .replace(/\[[^\]]*]/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[A-Za-z]+\./g, ' ')

  const chunks = normalized.match(/[\u4e00-\u9fff]{2,16}/g) || []
  const terms = []
  chunks.forEach((chunk) => {
    const value = chunk.trim()
    if (value.length >= 2) {
      terms.push(value)
    }
    value.split(/[的了和与及并将把]/g).forEach((part) => {
      const item = part.trim()
      if (item.length >= 2) {
        terms.push(item)
      }
    })
  })

  return [...new Set(terms)]
}

function highlightByTerms(htmlText, terms, useWordBoundary = false) {
  let result = htmlText
  const sortedTerms = [...new Set((terms || []).filter(Boolean).map(item => String(item).trim()).filter(Boolean))]
    .sort((a, b) => b.length - a.length)

  sortedTerms.forEach((term) => {
    const escaped = escapeRegExp(term)
    const pattern = useWordBoundary ? `\\b${escaped}\\b` : escaped
    const regex = new RegExp(pattern, useWordBoundary ? 'gi' : 'g')
    result = result.replace(regex, '<span class="selected-word-highlight">$&</span>')
  })

  return result
}

export function getStoryContentHtml(story, language = 'en') {
  if (!story) return ''

  if (language === 'en') {
    const highlightedEnglish = String(story.highlightedEnglishText || '').trim()
    if (highlightedEnglish) {
      const normalized = replaceMarkedWords(
        highlightedEnglish
          .replace(/class="highlight-word"/g, 'class="selected-word-highlight"')
          .replace(/class="highlight"/g, 'class="selected-word-highlight"')
      )
      return normalized.replace(/\n/g, '<br>')
    }
  }

  const rawText = language === 'zh'
    ? (story.chineseText || story.chinese_text || '')
    : (story.englishText || story.english_text || '')

  const safeText = escapeHtml(rawText)
  const hasMarkers = /\*\*[^*]+\*\*|\*[^*]+\*/.test(rawText)
  let html = replaceMarkedWords(safeText, language === 'zh' && hasMarkers)

  if (!(language === 'zh' && hasMarkers)) {
    const storyWords = Array.isArray(story.words) ? story.words : []
    const terms = language === 'zh'
      ? storyWords.flatMap(item => extractChineseTerms(item.translation))
      : storyWords.map(item => item.text)
    html = highlightByTerms(html, terms, language === 'en')
  }

  return html.replace(/\n/g, '<br>')
}

