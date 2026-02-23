import { octokit, retryWithBackoff } from './client'
import { isGitHubError } from '../model/github-dto'

export interface ProjectStats {
    name: string
    commits: number
    percent: number
}

// Simplified Event Interfaces
interface PushEvent {
    type: 'PushEvent'
    repo: { name: string }
    payload: { commits: Array<any> }
}

interface PullRequestEvent {
    type: 'PullRequestEvent'
    repo: { name: string }
    payload: { action: string }
}

interface CreateEvent {
    type: 'CreateEvent'
    repo: { name: string }
}

/**
 * Fetch public events for a user
 */
export async function fetchUserEvents(username: string): Promise<any[]> {
    try {
        return await retryWithBackoff(async () => {
            const { data } = await octokit.rest.activity.listPublicEventsForUser({
                username,
                per_page: 100 // Max limit to get most recent activity
            })
            return data
        })
    } catch (error: any) {
        if (isGitHubError(error)) {
            if (error.status === 404) {
                throw new Error(`User "${username}" not found`)
            }
            if (error.status === 403) {
                throw new Error('GitHub API rate limit exceeded. Please try again later.')
            }
            throw new Error(`GitHub API error: ${error.message}`)
        }
        throw new Error('Network error. Please check your connection and try again.')
    }
}

/**
 * Aggregate project statistics from events
 * Includes: Push (commits), PullRequest (opened/merged), Create (repo/branch)
 */
export function aggregateProjectStats(events: any[]): ProjectStats[] {
    const projectMap = new Map<string, number>()
    let totalCount = 0

    events.forEach(event => {
        let count = 0

        if (event.type === 'PushEvent') {
            count = (event as PushEvent).payload.commits?.length || 0
        } else if (event.type === 'PullRequestEvent') {
            const action = (event as PullRequestEvent).payload.action
            if (action === 'opened' || action === 'closed') {
                count = 1
            }
        } else if (event.type === 'CreateEvent') {
            count = 1
        }

        if (count > 0) {
            const repoName = event.repo.name.split('/')[1] || event.repo.name
            projectMap.set(repoName, (projectMap.get(repoName) || 0) + count)
            totalCount += count
        }
    })

    if (totalCount === 0) return []

    // Convert to array and calculate percentages
    return Array.from(projectMap.entries())
        .map(([name, count]) => ({
            name,
            commits: count, // Keeping property name 'commits' for compatibility, but it means 'contributions'
            percent: Math.round((count / totalCount) * 100 * 100) / 100
        }))
        .sort((a, b) => b.commits - a.commits)
}

/**
 * Main function to analyze weekly projects for a user
 */
export async function analyzeWeeklyProjects(
    username: string
): Promise<ProjectStats[]> {
    // 1. Fetch user events
    const events = await fetchUserEvents(username)

    // 2. Aggregate stats from PushEvents
    return aggregateProjectStats(events)
}
