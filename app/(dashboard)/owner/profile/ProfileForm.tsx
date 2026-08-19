'use client'

import { useState, useRef, type ChangeEvent, type SubmitEvent } from 'react'
import { useRouter } from 'next/navigation'
import { motion, MotionConfig } from 'motion/react'
import { motionTokens } from '@/lib/motionTokens'
import { getInitials } from '@/lib/utils'
import { UploadIcon, CheckIcon } from '@/components/ui/icons'
import { Button, ButtonIconIsland } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { FormErrorBanner } from '@/components/shared/FormErrorBanner'

const MAX_AVATAR_SIZE = 256

// ponytail: data-URL avatar; swap to Vercel Blob if images grow. There's no
// blob storage yet and the app deploys to Vercel (read-only FS), so the
// resized image is stored inline as a data URL in User.image.
function resizeImageToDataUrl(file: File, maxSize = MAX_AVATAR_SIZE): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'))
    reader.onload = () => {
      const img = new window.Image()
      img.onerror = () => reject(new Error('No se pudo procesar la imagen'))
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas no soportado'))
          return
        }
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

type ProfileFormProps = {
  name: string
  email: string
  phone: string
  address: string
  image: string | null
}

const fieldLabel =
  'font-mono text-[0.625rem] font-medium uppercase tracking-[0.16em] text-muted-foreground'
const sectionTitle =
  'font-mono text-[0.625rem] font-medium uppercase tracking-[0.18em] text-primary/80'

export function ProfileForm({ name, email, phone, address, image }: ProfileFormProps) {
  const router = useRouter()
  const [values, setValues] = useState({ name, phone, address })
  const [photo, setPhoto] = useState<string | null>(image)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const { name: field, value } = e.target
    setValues(prev => ({ ...prev, [field]: value }))
  }

  async function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const dataUrl = await resizeImageToDataUrl(file)
      setPhoto(dataUrl)
    } catch {
      setError('No se pudo procesar la imagen. Probá con otra.')
    }
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, image: photo }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Ocurrió un error')
        return
      }
      router.push('/owner')
      router.refresh()
    } catch {
      setError('Error de red. Intentá de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        initial={{ opacity: 0, y: motionTokens.distance.md, filter: 'blur(4px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.6, ease: motionTokens.easing.fluid }}
        className="mx-auto w-full max-w-[640px]"
      >
        <div className="mb-10 flex flex-col items-start gap-4">
          <span className="eyebrow">
            <span className="size-1 rounded-full bg-primary" aria-hidden="true" />
            Cuenta
          </span>
          <h1 className="font-display text-4xl font-medium leading-[1.05] tracking-[-0.03em] text-foreground sm:text-5xl">
            Mi perfil.
          </h1>
          <p className="text-base text-muted-foreground">Actualizá tu foto y tus datos personales.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="bezel">
            <div className="bezel-core flex flex-col gap-10 p-7 sm:p-9">

              <section className="flex flex-col gap-5">
                <h2 className={sectionTitle}>Foto de perfil</h2>
                <div className="flex flex-wrap items-center gap-5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Cambiar foto de perfil"
                    className="shrink-0 rounded-full outline-none ring-1 ring-white/[0.1] transition-[box-shadow,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:ring-primary/50 focus-visible:ring-3 focus-visible:ring-ring/40"
                  >
                    <Avatar size="lg" className="size-20 bg-white/[0.05]">
                      {photo && <AvatarImage src={photo} alt="Foto de perfil" />}
                      <AvatarFallback className="bg-white/[0.05] font-mono text-xl font-semibold text-primary">
                        {getInitials(name || email)}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                  <div className="flex flex-col gap-1.5">
                    <Button type="button" variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                      <UploadIcon className="size-3.5" />
                      Cambiar foto
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      PNG, JPG o WEBP. Se ajusta automáticamente.
                    </span>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp"
                    onChange={handlePhotoChange} className="sr-only" />
                </div>
              </section>

              <div className="h-px bg-white/[0.06]" />

              <section className="flex flex-col gap-5">
                <h2 className={sectionTitle}>Datos personales</h2>
                <div className="flex flex-col gap-2.5">
                  <Label htmlFor="name" className={fieldLabel}>Nombre</Label>
                  <Input id="name" name="name" type="text" placeholder="Tu nombre completo"
                    value={values.name} onChange={handleChange} />
                </div>
                <div className="flex flex-col gap-2.5">
                  <Label htmlFor="email" className={fieldLabel}>Correo electrónico</Label>
                  <Input id="email" type="email" value={email} disabled readOnly
                    className="cursor-not-allowed text-muted-foreground" />
                  <span className="text-xs text-muted-foreground/60">El email no se puede modificar.</span>
                </div>
                <div className="flex flex-col gap-2.5">
                  <Label htmlFor="phone" className={fieldLabel}>Teléfono</Label>
                  <Input id="phone" name="phone" type="tel" placeholder="p. ej. 11 5555-5555"
                    value={values.phone} onChange={handleChange} />
                </div>
                <div className="flex flex-col gap-2.5">
                  <Label htmlFor="address" className={fieldLabel}>Dirección</Label>
                  <Input id="address" name="address" type="text" placeholder="Calle, número, ciudad"
                    value={values.address} onChange={handleChange} />
                </div>
              </section>

              <FormErrorBanner error={error} />

              <div className="flex items-center justify-end gap-3 border-t border-white/[0.06] pt-6">
                <Button type="button" variant="ghost" onClick={() => router.push('/owner')}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Guardando…' : 'Guardar cambios'}
                  {!submitting && (
                    <ButtonIconIsland>
                      <CheckIcon className="size-3.5" />
                    </ButtonIconIsland>
                  )}
                </Button>
              </div>

            </div>
          </div>
        </form>
      </motion.div>
    </MotionConfig>
  )
}
