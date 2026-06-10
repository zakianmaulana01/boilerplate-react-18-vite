import { DemoSidePanel } from '@/components/demo/DemoSidePanel'

export function DemoViewerLayout({ canvas, side }) {
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
      <div className="min-w-0">{canvas}</div>
      <DemoSidePanel {...side} />
    </div>
  )
}
