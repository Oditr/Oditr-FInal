import { generateFixSnippet } from '@/lib/intelligence/fix-generation-engine'
import type { Framework } from '@/lib/intelligence/types'

/**
 * Autonomous PR Fix Engine
 * 
 * 1. Takes an issue payload from GitHub
 * 2. Uses the Intelligence Engine to find the relevant fix snippet
 * 3. Uses GitHub API to clone, branch, commit, and open a PR
 */
export async function autonomousPRFix(payload: any) {
  const repoFullName = payload.repository.full_name
  const issueNumber = payload.issue.number
  const token = process.env.GITHUB_PAT || process.env.GITHUB_TOKEN

  if (!token) {
    console.error('Oditr Agent: Missing GITHUB_PAT or GITHUB_TOKEN')
    return
  }

  console.log(`Oditr Agent: Processing issue #${issueNumber} in ${repoFullName}`)

  // 1. In a real app, we would parse the issue body to understand the failing audit.
  // For simulation, let's assume the issue mentions a specific Lighthouse ID or framework.
  const issueBody = payload.issue.body || ''
  const framework: Framework = issueBody.includes('nextjs') ? 'nextjs' : 'unknown'
  
  // Extract a fake audit ID from the issue body if present (e.g. "Audit: largest-contentful-paint")
  let targetAuditId = 'largest-contentful-paint'
  const match = issueBody.match(/Audit:\s*([a-z-]+)/i)
  if (match) targetAuditId = match[1]

  // 2. Generate Fix Snippets
  const snippets = generateFixSnippet(targetAuditId, framework)
  
  if (!snippets) {
    console.log(`Oditr Agent: No snippets found for audit ${targetAuditId} and framework ${framework}`)
    await addCommentToIssue(repoFullName, issueNumber, token, `Oditr Agent couldn't find a confident automated fix for ${targetAuditId}.`)
    return
  }

  const bestFix = snippets
  console.log(`Oditr Agent: Found fix snippet for ${targetAuditId}`)

  // 3. GitHub PR workflow (simulated for now, as it requires complex Git/tree manipulation)
  try {
    // 3.1 Get default branch
    const repoInfo = await fetchGitHubAPI(`repos/${repoFullName}`, token)
    const defaultBranch = repoInfo.default_branch

    // 3.2 Get latest commit SHA on default branch
    const refInfo = await fetchGitHubAPI(`repos/${repoFullName}/git/ref/heads/${defaultBranch}`, token)
    const baseSha = refInfo.object.sha

    // 3.3 Create a new branch
    const branchName = `vitalfix/auto-fix-${targetAuditId}-${Date.now()}`
    await fetchGitHubAPI(`repos/${repoFullName}/git/refs`, token, 'POST', {
      ref: `refs/heads/${branchName}`,
      sha: baseSha
    })

    // 3.4 In a full implementation, we would:
    // - Get the tree of the base commit
    // - Create a new blob with the modified file (using the fix snippet)
    // - Create a new tree
    // - Create a new commit
    // - Update the branch ref
    
    // For now, we simulate success and just comment.
    await addCommentToIssue(repoFullName, issueNumber, token, `🚀 **Oditr Agent** has analyzed this issue.\n\nI recommend applying the following fix:\n\n\`\`\`${bestFix.language}\n${bestFix.code}\n\`\`\`\n\n_Note: Autonomous PR creation is in simulation mode._`)
    
    console.log(`Oditr Agent: Successfully responded to issue #${issueNumber}`)
  } catch (e) {
    console.error('Oditr Agent Git Error:', e)
  }
}

async function fetchGitHubAPI(endpoint: string, token: string, method = 'GET', body?: any) {
  const res = await fetch(`https://api.github.com/${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'Oditr-Agent'
    },
    body: body ? JSON.stringify(body) : undefined
  })
  
  if (!res.ok) {
    throw new Error(`GitHub API Error: ${res.status} ${await res.text()}`)
  }
  
  return res.json()
}

async function addCommentToIssue(repoFullName: string, issueNumber: number, token: string, body: string) {
  return fetchGitHubAPI(`repos/${repoFullName}/issues/${issueNumber}/comments`, token, 'POST', { body })
}
