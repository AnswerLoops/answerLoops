import { getInstallationOctokit } from './app'

export async function searchCode(query: string, repo: string, orgId: number) {
  const [owner, name] = repo.split('/')
  try {
    const octokit = await getInstallationOctokit(owner, name, orgId)
    const { data } = await octokit.rest.search.code({
      q: `${query} repo:${repo}`,
      per_page: 5,
    })
    return data.items.map((item) => ({
      path: item.path,
      url: item.html_url,
      sha: item.sha,
      fragment: (item as { text_matches?: Array<{ fragment?: string }> }).text_matches?.[0]?.fragment ?? '',
    }))
  } catch (err) {
    return { error: String(err) }
  }
}

export async function readFile(path: string, repo: string, orgId: number, ref = 'main') {
  const [owner, name] = repo.split('/')
  try {
    const octokit = await getInstallationOctokit(owner, name, orgId)
    const { data } = await octokit.rest.repos.getContent({ owner, repo: name, path, ref })
    if ('content' in data && typeof data.content === 'string') {
      const content = Buffer.from(data.content, 'base64').toString('utf8')
      // Cap at 8k chars to keep context manageable
      return content.length > 8000 ? content.slice(0, 8000) + '\n... (truncated)' : content
    }
    return { error: 'Not a file or no content' }
  } catch (err) {
    return { error: String(err) }
  }
}

export async function listFiles(path: string, repo: string, orgId: number) {
  const [owner, name] = repo.split('/')
  try {
    const octokit = await getInstallationOctokit(owner, name, orgId)
    const { data } = await octokit.rest.repos.getContent({ owner, repo: name, path })
    if (Array.isArray(data)) {
      return data.map((f) => ({ name: f.name, type: f.type, path: f.path, size: f.size }))
    }
    return { error: 'Not a directory' }
  } catch (err) {
    return { error: String(err) }
  }
}
