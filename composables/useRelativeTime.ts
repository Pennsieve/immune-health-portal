export function useRelativeTime() {
  function relativeTime(dateStr: string): string {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return ''

    const diff = Date.now() - date.getTime()
    const minutes = Math.floor(diff / 60_000)
    const hours = Math.floor(diff / 3_600_000)
    const days = Math.floor(diff / 86_400_000)
    const weeks = Math.floor(days / 7)
    const months = Math.floor(days / 30)

    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days === 1) return 'yesterday'
    if (days < 7) return `${days}d ago`
    if (weeks < 5) return `${weeks}w ago`
    return `${months}mo ago`
  }

  return { relativeTime }
}
