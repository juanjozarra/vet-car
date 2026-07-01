import { BellIcon, GearIcon } from '@/components/ui/icons'
import { AvatarMenu } from './AvatarMenu'
import styles from './DashboardNav.module.scss'

export function DashboardNav({ userName, userEmail }: { userName: string; userEmail?: string }) {
  return (
    <header className={`${styles.nav} fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-8`}>
      <div className="flex items-center gap-4">
        <span className={`${styles.logo} text-2xl font-bold tracking-tight`}>
          VetCar
        </span>
        <nav className="flex items-center gap-4 ml-4">
          <span className={`${styles.navLinkActive} text-sm`}>Panel</span>
          <span className={`${styles.navLink} text-sm`}>Órdenes de trabajo</span>
          <span className={`${styles.navLink} text-sm`}>Inventario</span>
          <span className={`${styles.navLink} text-sm`}>Turnos</span>
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <button className={styles.btnNewOrder}>Nueva orden</button>
        <div className="flex items-center gap-2">
          <button className="p-1 hover:opacity-70 transition-opacity"><BellIcon /></button>
          <button className="p-1 hover:opacity-70 transition-opacity"><GearIcon /></button>
        </div>
        <AvatarMenu userName={userName} userEmail={userEmail} />
      </div>
    </header>
  )
}
