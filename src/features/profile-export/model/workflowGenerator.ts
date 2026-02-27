/**
 * GitHub Actions Workflow Generator
 * 
 * @description
 * Generates a YAML file for GitHub Actions that automatically updates
 * the user's profile README with the latest data using the downloaded scripts.
 */

export interface WorkflowConfig {
  username: string
  updateInterval: string // cron expression
  timezone: string
  hasGithub?: boolean
  hasWakatime?: boolean
}

/**
 * Generate GitHub Actions workflow YAML
 * 
 * @param config - Configuration for the workflow
 * @returns YAML content as string
 */
export function generateWorkflowYAML(config: WorkflowConfig): string {
  const { username, updateInterval } = config

  return `name: Update Profile README

on:
  schedule:
    # Action will run on this schedule
    - cron: '${updateInterval}'
  
  # Allow manual trigger from GitHub UI
  workflow_dispatch:

jobs:
  update-readme:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install Dependencies
        run: npm install
        
      - name: Run Update Script
        env:
          TZ: '${config.timezone}'
${config.hasGithub !== false ? '          GITHUB_TOKEN: ${{ secrets.GH_TOKEN }}\n' : ''}${config.hasWakatime ? '          WAKATIME_API_KEY: ${{ secrets.WAKATIME_API_KEY }}\n' : ''}        run: npm run update-profile
      
      - name: Commit and push if changed
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add README.md
          git diff --quiet && git diff --staged --quiet || (git commit -m "🤖 Auto-update Profile README" && git push)
`
}

/**
 * Get default cron expression for 6-hour updates
 */
export function getDefaultCronExpression(): string {
  return '0 0 * * *' // Default Daily
}

/**
 * Generate complete workflow file content
 * 
 * @param username - GitHub username
 * @param cronFrequency - Cron frequency for schedule
 * @returns YAML content for .github/workflows/update-profile.yml
 */
export function generateProfileUpdateWorkflow(
  username: string,
  cronFrequency: string = '0 0 * * *',
  timezone: string = 'Asia/Seoul',
  hasGithub: boolean = true,
  hasWakatime: boolean = false
): string {
  const config: WorkflowConfig = {
    username,
    updateInterval: cronFrequency,
    timezone,
    hasGithub,
    hasWakatime
  }

  return generateWorkflowYAML(config)
}

