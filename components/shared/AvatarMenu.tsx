'use client'

import Link from 'next/link'
import { signOut } from 'next-auth/react'
import { getInitials } from '@/lib/utils'
import { LogOutIcon, UserIcon } from '@/components/ui/icons'
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
  profileHref = '/owner/profile',
}: {
  userName: string
  userEmail?: string
  userImage?: string | null
  profileHref?: string | null
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Abrir menú de usuario"
          className="cursor-pointer rounded-full outline-none ring-1 ring-white/[0.1] transition-[box-shadow] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:ring-primary/50 focus-visible:ring-3 focus-visible:ring-ring/40 aria-expanded:ring-primary/50"
        >
          <Avatar className="size-9 bg-white/[0.06]">
            {userImage && <AvatarImage src={userImage} alt="" />}
            <AvatarFallback className="bg-white/[0.06] font-mono text-[0.625rem] font-semibold text-primary">
              {getInitials(userName)}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5 px-2.5 py-2 normal-case tracking-normal">
          <span className="truncate font-sans text-sm font-medium text-foreground">{userName}</span>
          {userEmail && (
            <span className="truncate font-sans text-xs font-normal text-muted-foreground">
              {userEmail}
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {profileHref && (
          <DropdownMenuItem asChild>
            <Link href={profileHref} className="text-sm">
              <UserIcon className="size-3.5 text-muted-foreground" />
              Mi perfil
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => signOut({ callbackUrl: '/login' })}
          className="text-sm"
        >
          <LogOutIcon className="size-3.5" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
