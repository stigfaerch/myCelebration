import { getResolvedNavForAdmin } from '@/lib/actions/settings'
import { MenuManager } from '@/components/admin/MenuManager'
import { getScreenGuests } from '@/lib/actions/screen'
import {
  getAssignmentsMapByPage,
  getRotationCountsForScreen,
  getStaticAssignmentsMapByKey,
} from '@/lib/actions/screenAssignments'
import { getStaticItemVisibilityMap } from '@/lib/actions/staticItemVisibility'
import { ScreenCycleSettingsSection } from '@/components/admin/ScreenCycleSettings'

export default async function SiderPage() {
  // Fetch independent data in parallel — five queries that share no
  // dependencies. Counts per screen run once-per-screen but those are short.
  // The two new fetches (Plan 08-03) cover static-item visibility + static
  // screen-assignments so MenuManager can render parity controls on static
  // rows.
  const [
    items,
    screens,
    assignmentsByPageId,
    staticVisibilityMap,
    staticAssignmentsByKey,
  ] = await Promise.all([
    getResolvedNavForAdmin(),
    getScreenGuests(),
    getAssignmentsMapByPage(),
    getStaticItemVisibilityMap(),
    getStaticAssignmentsMapByKey(),
  ])

  const rotationCounts = await Promise.all(
    screens.map(async (s) => {
      const c = await getRotationCountsForScreen(s.id)
      return { id: s.id, ...c }
    })
  )
  const countsById = new Map(rotationCounts.map((r) => [r.id, r]))

  const sectionScreens = screens.map((s) => ({
    id: s.id,
    name: s.name,
    is_primary_screen: s.is_primary_screen,
    cycle_seconds: s.screen_cycle_seconds,
    transition: s.screen_transition,
    screen_width: s.screen_width,
    screen_height: s.screen_height,
    visibleCount: countsById.get(s.id)?.visible ?? 0,
    hiddenCount: countsById.get(s.id)?.hidden ?? 0,
  }))

  // The MenuManager toggle only needs the identity fields, not the cycle
  // settings — narrow the props to the toggle's expected shape.
  const screenInfos = screens.map((s) => ({
    id: s.id,
    name: s.name,
    is_primary_screen: s.is_primary_screen,
  }))

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Sider og menu</h1>
        <p className="text-sm text-muted-foreground">
          Her administrerer du sider og rækkefølgen i bundmenuen. Slot 1 (Hjem)
          og slot 4 (Menu) er faste. De første to elementer i listen vises som
          slot 2 og 3 i bundmenuen — resten ligger i Menu-sheet&apos;en.
        </p>
      </div>
      <MenuManager
        initialItems={items}
        screens={screenInfos}
        assignmentsByPageId={assignmentsByPageId}
        staticVisibilityMap={staticVisibilityMap}
        staticAssignmentsByKey={staticAssignmentsByKey}
      />
      <ScreenCycleSettingsSection screens={sectionScreens} />
    </div>
  )
}
