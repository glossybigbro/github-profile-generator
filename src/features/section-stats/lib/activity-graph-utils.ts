import { MARKDOWN_URLS } from '@/entities/profile/config/urls'

export interface ActivityGraphConfig {
    activityGraphTheme?: string
    activityGraphAreaFill?: boolean
    activityGraphHideBorder?: boolean
    activityGraphHideTitle?: boolean
    activityGraphGrid?: boolean
    activityGraphDays?: number
    activityGraphRadius?: number
    activityGraphCustomTitle?: string
}

export function generateActivityGraphUrl(username: string, config: ActivityGraphConfig): string {
    const {
        activityGraphTheme = 'tokyo-night',
        activityGraphAreaFill = true,
        activityGraphHideBorder = false,
        activityGraphHideTitle = false,
        activityGraphGrid = false,
        activityGraphDays = 31,
        activityGraphRadius = 0,
        activityGraphCustomTitle = ''
    } = config

    const params = new URLSearchParams({
        username: username,
        theme: activityGraphTheme,
        area: activityGraphAreaFill.toString(),
        hide_border: activityGraphHideBorder.toString(),
        hide_title: activityGraphHideTitle.toString(),
        grid: activityGraphGrid.toString(),
        days: activityGraphDays.toString(),
        radius: activityGraphRadius.toString(),
    })

    if (activityGraphCustomTitle) {
        params.append('custom_title', activityGraphCustomTitle)
    }

    return `${MARKDOWN_URLS.GITHUB_README_ACTIVITY_GRAPH}?${params.toString()}`
}
