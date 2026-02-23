/**
 * GitHub Actions Workflow Generator
 * 
 * @description
 * Generates a YAML file for GitHub Actions that automatically updates
 * the user's profile README with the latest data.
 */

export interface WorkflowConfig {
  username: string
  apiEndpoint: string
  updateInterval: string // cron expression
}

/**
 * Generate GitHub Actions workflow YAML
 * 
 * @param config - Configuration for the workflow
 * @returns YAML content as string
 */
export function generateWorkflowYAML(config: WorkflowConfig): string {
  const { username, apiEndpoint, updateInterval } = config

  return `name: Update Profile README

on:
  schedule:
    # Runs every 6 hours
    - cron: '${updateInterval}'
  
  # Allow manual trigger
  workflow_dispatch:

jobs:
  update-readme:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v3
      
      - name: Fetch latest README
        run: |
          curl -s "${apiEndpoint}?username=${username}" > README.md
      
      - name: Commit and push if changed
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add README.md
          git diff --quiet && git diff --staged --quiet || (git commit -m "🤖 Auto-update README" && git push)
`
}

/**
 * Get default cron expression for 6-hour updates
 */
export function getDefaultCronExpression(): string {
  return '0 */6 * * *' // Every 6 hours at minute 0
}

/**
 * Generate complete workflow file content
 * 
 * @param username - GitHub username
 * @returns YAML content for .github/workflows/update-profile.yml
 */
export function generateProfileUpdateWorkflow(username: string): string {
  const config: WorkflowConfig = {
    username,
    apiEndpoint: process.env.NEXT_PUBLIC_SITE_URL
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/generate`
      : 'https://YOUR-DEPLOYED-APP.vercel.app/api/generate',
    updateInterval: getDefaultCronExpression()
  }

  return generateWorkflowYAML(config)
}
