import { fetchPSI } from '@/lib/psi-pool'

/**
 * Post-PR Verification Loop
 * 
 * Runs a performance audit against a preview URL (e.g., from a Vercel deployment)
 * to verify if the automated PR actually improved the UX score.
 */
export async function verificationLoop(previewUrl: string, payload: any) {
  const repoFullName = payload.repository.full_name
  const token = process.env.GITHUB_PAT || process.env.GITHUB_TOKEN
  const prNumber = payload.deployment?.payload?.pull_request_number || payload.pull_request?.number

  if (!token || !prNumber) {
    console.log('Oditr Agent: Missing token or PR number for verification loop')
    return
  }

  console.log(`Oditr Agent: Running post-PR verification on ${previewUrl}`)

  try {
    // 1. Run Lighthouse Audit on the preview URL
    const res = await fetchPSI({
      url: previewUrl,
      strategy: 'mobile',
      categories: ['performance'],
      timeout: 30000
    })
    
    if (!res.ok) throw new Error(`PSI Fetch failed: ${res.status}`)
    const data = await res.json()
    const auditData = data.lighthouseResult

    const healthScore = Math.round((auditData.categories.performance?.score || 0) * 100)

    // 2. Fetch the target UX score we wanted to achieve (this would normally be stored in DB)
    const targetScore = 80 // Example target
    
    // 3. Compare and report
    let commentBody = ''
    if (healthScore >= targetScore) {
      commentBody = `✅ **Oditr Verification Passed!**\n\nPreview URL: ${previewUrl}\nNew Performance Score: **${healthScore}**\n\nThe fix was successful and improved the metrics. Ready to merge!`
    } else {
      commentBody = `⚠️ **Oditr Verification Failed**\n\nPreview URL: ${previewUrl}\nNew Performance Score: **${healthScore}** (Target: ${targetScore})\n\nThe fix did not improve the metrics sufficiently. Further manual tuning may be required.`
    }

    // 4. Post comment to PR
    await fetch(`https://api.github.com/repos/${repoFullName}/issues/${prNumber}/comments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Oditr-Agent'
      },
      body: JSON.stringify({ body: commentBody })
    })

    console.log(`Oditr Agent: Verification comment posted to PR #${prNumber}`)

  } catch (error) {
    console.error('Oditr Agent Verification Error:', error)
  }
}
