import { embed } from 'ai'
import { embeddingModel, DEFAULT_EMBEDDING_MODEL, type ModelPurpose } from '@/lib/ai/models'

export const EMBEDDING_MODEL = DEFAULT_EMBEDDING_MODEL

/**
 * Embed a piece of text into a vector. Caller is responsible for combining the
 * fields worth embedding (e.g. summary + content) into `text`.
 */
export async function embedText(text: string, orgId?: number, purpose: ModelPurpose = 'production'): Promise<number[]> {
  const { embedding } = await embed({
    model: await embeddingModel(EMBEDDING_MODEL, orgId, purpose),
    value: text,
  })
  return embedding
}
