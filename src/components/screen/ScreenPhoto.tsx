interface Props {
  photo: {
    storage_url: string
  }
}

/**
 * Full-viewport single photo on black background.
 * `object-contain` preserves aspect ratio.
 */
export function ScreenPhoto({ photo }: Props) {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-black">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.storage_url}
        alt=""
        className="h-screen w-screen object-contain"
      />
    </div>
  )
}
