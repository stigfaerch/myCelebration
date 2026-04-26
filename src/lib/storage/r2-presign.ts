'use server'
import { assertNotScreen } from '@/lib/auth/resolveGuest'
import { presignR2Upload, type R2Prefix } from './r2'

/**
 * Allowlist of MIME types the server will sign upload URLs for. Limiting this
 * is a defense-in-depth measure: even though the bucket is public-read, we do
 * not want an attacker requesting a presigned PUT for `text/html` or similar
 * that could be served from the public URL and used in a phishing context.
 */
const ALLOWED_CONTENT_TYPES: ReadonlySet<string> = new Set([
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp',
])

/**
 * Map MIME type to the canonical extension we use for object keys. Keeps the
 * key naming consistent with the legacy server-side `uploadImage` flow
 * (`images/<uuid>.<ext>`).
 */
const EXT_BY_CONTENT_TYPE: Readonly<Record<string, string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/heic': 'heic',
  'image/heif': 'heic',
  'image/webp': 'webp',
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Allowed presign prefixes for guest flows. We intentionally do NOT allow
 * `invitations` or `maps` here — those remain on the server-side
 * `putR2Object` path because they are admin-gated, low-volume, and small
 * enough to never hit the Vercel body cap.
 */
type GuestPresignPrefix = Extract<R2Prefix, 'images'>

const ALLOWED_PREFIXES: ReadonlySet<GuestPresignPrefix> = new Set(['images'])

export interface GetR2UploadUrlInput {
  prefix: GuestPresignPrefix
  /** Caller-supplied UUID. Server validates the shape. */
  id: string
  /** MIME type from `File.type`. Server validates against the allowlist. */
  contentType: string
}

export interface GetR2UploadUrlResult {
  url: string
  publicUrl: string
  key: string
}

/**
 * Generate a presigned PUT URL for a guest-uploaded image. The browser uses
 * the returned `url` to PUT the file bytes directly to R2, bypassing the
 * Vercel function body cap.
 *
 * Auth: `assertNotScreen()` — any non-screen guest may upload.
 * Validation: prefix is `images`-only, contentType is on an allowlist, id is UUID.
 * TTL: 5 minutes (300s) — long enough for slow networks, short enough that a
 * leaked URL is not durably reusable.
 *
 * The caller is responsible for following up with `confirmPhotoUpload` /
 * `confirmMemoryUpload` (or equivalent) once the PUT lands so the DB row
 * gets created. If the browser PUT fails, no DB row is written and the
 * presigned URL simply expires.
 */
export async function getR2UploadUrl(
  input: GetR2UploadUrlInput
): Promise<GetR2UploadUrlResult> {
  await assertNotScreen()

  const { prefix, id, contentType } = input

  if (!ALLOWED_PREFIXES.has(prefix)) {
    throw new Error('Ugyldig upload-destination')
  }
  if (!UUID_RE.test(id)) {
    throw new Error('Ugyldigt id')
  }
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    throw new Error('Filtype ikke understøttet')
  }

  const ext = EXT_BY_CONTENT_TYPE[contentType]
  // Object key includes the extension so the public URL has a recognizable
  // file ending — matches the legacy `uploadImage` key scheme.
  const key = `${id}.${ext}`

  return presignR2Upload({
    prefix,
    id: key,
    contentType,
    expiresIn: 300,
  })
}
