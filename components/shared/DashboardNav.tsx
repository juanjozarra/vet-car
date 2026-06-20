import { BellIcon, GearIcon, PlusIcon } from '@/components/ui/icons'

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function DashboardNav({ userName }: { userName: string }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-[#060e20] border-b border-[#434655] flex items-center justify-between px-8">
      {/* Logo + nav links */}
      <div className="flex items-center gap-4">
        <span className="text-2xl font-bold text-[#b4c5ff] tracking-tight">
          AutoStream Pro
        </span>
        <nav className="flex items-center gap-4 ml-4">
          <span className="text-sm text-[#b4c5ff] border-b-2 border-[#b4c5ff] pb-1.5 cursor-pointer">
            Dashboard
          </span>
          <span className="text-sm text-[#c3c6d7] hover:text-[#dae2fd] transition-colors cursor-pointer">
            Work Orders
          </span>
          <span className="text-sm text-[#c3c6d7] hover:text-[#dae2fd] transition-colors cursor-pointer">
            Inventory
          </span>
          <span className="text-sm text-[#c3c6d7] hover:text-[#dae2fd] transition-colors cursor-pointer">
            Scheduling
          </span>
        </nav>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-4">
        <button className="flex items-center justify-center h-10 px-4 rounded bg-[#2563eb] text-[#002a78] text-xs font-medium tracking-[0.6px]">
          New Order
        </button>
        <div className="flex items-center gap-2">
          <button className="p-1 hover:opacity-70 transition-opacity">
            <BellIcon />
          </button>
          <button className="p-1 hover:opacity-70 transition-opacity">
            <GearIcon />
          </button>
        </div>
        {/* Avatar */}
        <div className="size-8 rounded-full border border-[#434655] bg-[#222a3d] flex items-center justify-center">
          <span className="text-[10px] font-semibold text-[#b4c5ff]">
            {getInitials(userName)}
          </span>
        </div>
      </div>
    </header>
  )
}
