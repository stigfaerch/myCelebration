'use server'
import { putR2Object, deleteR2ObjectByUrl, r2PublicUrl } from './r2'

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

// Magic-byte signatures for supported image types.
// Extension is derived server-side from the verified signature, never from file.name.
type ImageKind = 'jpeg' | 'png' | 'heic'

const SIGNATURES: Array<{ kind: ImageKind; ext: 'jpg' | 'png' | 'heic'; contentType: string; match: (bytes: Uint8Array) => boolean }> = [
  {
    kind: 'jpeg',
    ext: 'jpg',
    contentType: 'image/jpeg',
    match: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    kind: 'png',
    ext: 'png',
    contentType: 'image/png',
    match: (b) =>
      b.length >= 8 &&
      b[0] === 0x89 &&
      b[1] === 0x50 &&
      b[2] === 0x4e &&
      b[3] === 0x47 &&
      b[4] === 0x0d &&
      b[5] === 0x0a &&
      b[6] === 0x1a &&
      b[7] === 0x0a,
  },
  {
    kind: 'heic',
    ext: 'heic',
    contentType: 'image/heic',
    // ISO-BMFF 'ftyp' box at bytes 4-7, followed by a HEIC brand identifier.
    // Accept common HEIC/HEIF brands: heic, heix, hevc, hevx, mif1, msf1, heim, heis.
    match: (b) => {
      if (b.length < 12) return false
      if (b[4] !== 0x66 || b[5] !== 0x74 || b[6] !== 0x79 || b[7] !== 0x70) return false
      const brand = String.fromCharCode(b[8], b[9], b[10], b[11])
      return ['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1', 'heim', 'heis'].includes(brand)
    },
  },
]

export interface UploadResult {
  storage_url: string
  path: string
}

/**
 * Uploads a guest-provided image to R2 under the `images/` prefix.
 *
 * Magic-byte verification is preserved unchanged: the extension is derived from
 * the verified signature, never from `file.name`.
 *
 * The `opts.prefix` parameter is retained for call-site stability and logging
 * intent ('photo' vs 'memory'), but no longer affects the object key. The new
 * key scheme is `images/${uuid}.${ext}` — no `original/` subfolder, no
 * `photo-` / `memory-` infix.
 */
export async function uploadImage(
  file: File,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- informational only; kept to avoid touching call sites
  opts: { prefix: 'photo' | 'memory' }
): Promise<UploadResult> {
  if (file.size > MAX_BYTES) throw new Error('Filen er for stor (maks 10 MB)')
  if (file.size === 0) throw new Error('Tom fil')

  const headBytes = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  const sig = SIGNATURES.find((s) => s.match(headBytes))
  if (!sig) throw new Error('Filtype ikke understøttet')

  const id = `${crypto.randomUUID()}.${sig.ext}`
  const path = `images/${id}`

  const body = Buffer.from(await file.arrayBuffer())
  try {
    await putR2Object({
      prefix: 'images',
      id,
      body,
      contentType: sig.contentType,
    })
  } catch {
    throw new Error('Upload fejlede')
  }

  return { storage_url: r2PublicUrl('images', id), path }
}

export async function deleteStorageObjectByUrl(storage_url: string): Promise<void> {
  // Best-effort — DB row already deleted. r2.ts swallows errors internally.
  await deleteR2ObjectByUrl(storage_url)
}
