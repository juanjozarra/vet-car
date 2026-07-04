'use client'

import Link from 'next/link'
import { signOut } from 'next-auth/react'
import { getInitials } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function AvatarMenu({
  userName,
  userEmail,
  userImage,
}: {
  userName: string
  userEmail?: string
  userImage?: string | null
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Abrir menú de usuario"
          className="rounded-full border border-border transition-colors hover:border-primary cursor-pointer outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Avatar className="size-8 bg-muted">
            {userImage && <AvatarImage src={userImage} alt="" />}
            <AvatarFallback className="text-[0.625rem] font-semibold text-primary bg-muted">
              {getInitials(userName)}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="flex flex-col gap-0.5 px-2 py-1.5">
          <span className="text-sm font-semibold text-foreground truncate">{userName}</span>
          {userEmail && <span className="text-xs text-muted-foreground truncate">{userEmail}</span>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/owner/profile" className="text-sm">Mi perfil</Link>
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={() => signOut({ callbackUrl: '/login' })} className="text-sm">
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
