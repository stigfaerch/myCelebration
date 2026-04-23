import { getMyPhotos } from '@/lib/actions/guest/photos'
import { PhotoGrid } from '@/components/guest/PhotoGrid'

interface Props {
  params: Promise<{ uuid: string }>
}

export default async function BillederPage({ params }: Props) {
  const { uuid } = await params
  const photos = await getMyPhotos()
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Mine billeder</h1>
      <PhotoGrid initialPhotos={photos} uuid={uuid} />
    </div>
  )
}
