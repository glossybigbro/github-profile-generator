import { getOctokit, retryWithBackoff } from './client'

export interface AggregatedLanguageStats {
    name: string
    count: number
    percent: number
}

/**
 * Analyze weekly languages using GraphQL — 100% identical to scriptGenerator.ts backend
 * 
 * This function uses the EXACT same GraphQL query and aggregation logic
 * as the GitHub Action backend (scriptGenerator.ts > fetchUserRepositories + calculateWeeklyLanguages)
 * to guarantee identical output between the Editor preview and the deployed Action.
 * 
 * Requires a GitHub Personal Access Token (PAT) for GraphQL API access.
 */
export async function analyzeWeeklyLanguages(
    username: string,
    token?: string
): Promise<AggregatedLanguageStats[]> {
    const octokit = getOctokit(token)

    try {
        return await retryWithBackoff(async () => {
            // ===== STEP 1: Fetch Repositories via GraphQL =====
            // This query is IDENTICAL to scriptGenerator.ts > fetchUserRepositories
            const query = `
                query($login: String!) {
                    user(login: $login) {
                        repositories(first: 100, isFork: false, orderBy: {field: PUSHED_AT, direction: DESC}) {
                            nodes {
                                name
                                pushedAt
                                languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
                                    edges { size node { name } }
                                }
                            }
                        }
                    }
                }
            `
            const repoRes: any = await octokit.graphql(query, { login: username })
            const repos = repoRes?.user?.repositories?.nodes || []

            if (repos.length === 0) {
                return []
            }

            // ===== STEP 2: Aggregate Languages =====
            // This logic is IDENTICAL to scriptGenerator.ts > calculateWeeklyLanguages
            const langMap = new Map<string, { size: number, count: number }>()
            let totalBytes = 0

            const sevenDaysAgo = new Date()
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

            for (const repo of repos) {
                if (!repo.languages?.edges) continue
                // Apply 7-day limit (identical to backend)
                if (repo.pushedAt && new Date(repo.pushedAt) < sevenDaysAgo) continue

                for (const { size, node } of repo.languages.edges) {
                    const current = langMap.get(node.name) || { size: 0, count: 0 }
                    langMap.set(node.name, { size: current.size + size, count: current.count + 1 })
                    totalBytes += size
                }
            }

            // ===== STEP 3: Calculate percentages =====
            // Math.round((val.size / totalBytes) * 100 * 100) / 100 — identical to backend
            const results: AggregatedLanguageStats[] = Array.from(langMap.entries()).map(([name, val]) => ({
                name,
                count: val.count,
                percent: totalBytes > 0 ? Math.round((val.size / totalBytes) * 100 * 100) / 100 : 0
            }))

            return results.sort((a, b) => b.percent - a.percent)
        })
    } catch (error: any) {
        if (error?.status === 401) {
            throw new Error('GitHub Token is invalid or expired. Please check your token and try again.')
        }
        if (error?.status === 403) {
            throw new Error('GitHub API rate limit exceeded. Please add a valid GitHub Token for higher limits.')
        }
        throw new Error(error?.message || 'Failed to fetch GitHub language data. Please check your token and try again.')
    }
}
