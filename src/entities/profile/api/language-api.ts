import { octokit, retryWithBackoff } from './client'
import { isGitHubError } from '../model/github-dto'

/**
 * Language statistics interface
 */
export interface LanguageData {
    name: string
    bytes: number
    repoCount: number
}

export interface AggregatedLanguageStats {
    name: string
    count: number  // number of repos using this language
    percent: number  // percentage based on total bytes across all languages
}

/**
 * Fetch all repositories for a given user
 */
export async function fetchUserRepositories(username: string): Promise<any[]> {
    try {
        return await retryWithBackoff(async () => {
            const { data } = await octokit.rest.repos.listForUser({
                username,
                per_page: 100,  // Max 100 repos
                sort: 'updated',
                direction: 'desc'
            })
            return data
        })
    } catch (error) {
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
 * Fetch languages for a single repository
 */
export async function fetchRepositoryLanguages(
    owner: string,
    repo: string
): Promise<Record<string, number>> {
    try {
        const { data } = await octokit.rest.repos.listLanguages({
            owner,
            repo
        })
        return data
    } catch (error) {
        // Silently fail for individual repos to avoid blocking entire analysis
        console.warn(`Failed to fetch languages for ${owner}/${repo}:`, error)
        return {}
    }
}

/**
 * Aggregate language statistics from multiple repositories
 */
export function aggregateLanguageStats(
    reposWithLanguages: Array<{ languages: Record<string, number> }>
): AggregatedLanguageStats[] {
    const languageMap = new Map<string, LanguageData>()

    // Aggregate bytes and repo count for each language
    reposWithLanguages.forEach(({ languages }) => {
        Object.entries(languages).forEach(([name, bytes]) => {
            const existing = languageMap.get(name) || { name, bytes: 0, repoCount: 0 }
            languageMap.set(name, {
                name,
                bytes: existing.bytes + bytes,
                repoCount: existing.repoCount + 1
            })
        })
    })

    // Calculate total bytes for percentage calculation
    const totalBytes = Array.from(languageMap.values()).reduce(
        (sum, lang) => sum + lang.bytes,
        0
    )

    // Convert to array and calculate percentages
    const stats: AggregatedLanguageStats[] = Array.from(languageMap.values())
        .map(lang => ({
            name: lang.name,
            count: lang.repoCount,
            percent: totalBytes > 0 ? Math.round((lang.bytes / totalBytes) * 100 * 100) / 100 : 0
        }))
        .sort((a, b) => b.percent - a.percent)  // Sort by percentage descending

    return stats
}

/**
 * Main function to analyze weekly languages for a user
 */
export async function analyzeWeeklyLanguages(
    username: string
): Promise<AggregatedLanguageStats[]> {
    // 1. Fetch user repositories
    const repos = await fetchUserRepositories(username)

    if (repos.length === 0) {
        throw new Error('No public repositories found for this user')
    }

    // 2. Fetch languages for each repository (with batching to avoid rate limits)
    const reposWithLanguages: Array<{ languages: Record<string, number> }> = []

    for (const repo of repos) {
        const languages = await fetchRepositoryLanguages(repo.owner.login, repo.name)
        reposWithLanguages.push({ languages })

        // Small delay to avoid hitting rate limits
        await new Promise(resolve => setTimeout(resolve, 100))
    }

    // 3. Aggregate and return statistics
    return aggregateLanguageStats(reposWithLanguages)
}
