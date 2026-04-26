import 'server-only'
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'

// Read R2 config eagerly at module load. Fail fast at boot if anything is missing,
// rather than silently failing on the first upload request.
const accountId = process.env.R2_ACCOUNT_ID
const accessKeyId = process.env.R2_ACCESS_KEY_ID
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
const bucket = process.env.R2_BUCKET_NAME
const publicUrl = process.env.R2_PUBLIC_URL

if (!accountId) throw new Error('Missing R2_ACCOUNT_ID')
if (!accessKeyId) throw new Error('Missing R2_ACCESS_KEY_ID')
if (!secretAccessKey) throw new Error('Missing R2_SECRET_ACCESS_KEY')
if (!bucket) throw new Error('Missing R2_BUCKET_NAME')
if (!publicUrl) throw new Error('Missing R2_PUBLIC_URL')

// Strip a single trailing slash from R2_PUBLIC_URL so concatenation is predictable
// regardless of how the env var was provided.
const publicUrlBase = publicUrl.replace(/\/+$/, '')

export type R2Prefix = 'images' | 'invitations' | 'maps'

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
})

export function r2PublicUrl(prefix: R2Prefix, id: string): string {
  return `${publicUrlBase}/${prefix}/${id}`
}

export interface PutR2ObjectInput {
  prefix: R2Prefix
  id: string
  body: Buffer | Uint8Array
  contentType: string
}

/**
 * Uploads an object to R2 under `${prefix}/${id}` and returns its public URL.
 * Throws on upload failure (caller is expected to translate to a user-facing error).
 */
export async function putR2Object({
  prefix,
  id,
  body,
  contentType,
}: PutR2ObjectInput): Promise<string> {
  const Key = `${prefix}/${id}`
  await r2Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key,
      Body: body,
      ContentType: contentType,
    })
  )
  return r2PublicUrl(prefix, id)
}

/**
 * Best-effort delete by public URL. Parses the `${R2_PUBLIC_URL}/` prefix to
 * recover the object key (`<prefix>/<id>`), then issues a DeleteObjectCommand.
 * Swallows all errors — semantics match the prior Supabase implementation:
 * the DB row is already gone, the object is "garbage" either way.
 */
export async function deleteR2ObjectByUrl(url: string): Promise<void> {
  try {
    const marker = `${publicUrlBase}/`
    if (!url.startsWith(marker)) return
    const Key = url.slice(marker.length)
    if (!Key) return
    await r2Client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key,
      })
    )
  } catch {
    // Best-effort — swallow.
  }
}
