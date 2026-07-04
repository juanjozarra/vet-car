'use client'

import { useState, useRef, type ChangeEvent, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { motionTokens } from '@/lib/motionTokens'
import { getInitials } from '@/lib/utils'
import { UploadIcon } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const MotionButton = motion.create(Button)

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

const fieldLabel = 'text-sm font-medium text-muted-foreground'
const sectionLabel = 'text-xs font-medium text-muted-foreground tracking-[0.05em] uppercase font-mono'

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

  async function handleSubmit(e: FormEvent) {
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
    <motion.div
      initial={{ opacity: 0, y: motionTokens.distance.md }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth }}
    >
      <div className="mb-8 flex flex-col gap-1">
        <h1 className="text-[2.25rem] font-bold text-foreground tracking-[-0.02em] font-mono">Mi perfil</h1>
        <p className="text-base text-muted-foreground">Actualizá tu foto y tus datos personales.</p>
      </div>

      <div className="max-w-[600px] mx-auto">
        <form onSubmit={handleSubmit}>
          <div className="relative rounded-lg border border-border bg-card overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-primary opacity-50" />
            <div className="p-8 flex flex-col gap-8">

              <section className="flex flex-col gap-4">
                <div className="border-b border-border pb-2">
                  <h2 className={sectionLabel}>Foto de perfil</h2>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Cambiar foto de perfil"
                    className="shrink-0 rounded-full transition-colors hover:opacity-90"
                  >
                    <Avatar size="lg" className="size-[4.5rem] border border-border bg-muted">
                      {photo && <AvatarImage src={photo} alt="Foto de perfil" />}
                      <AvatarFallback className="text-xl font-semibold text-primary font-mono bg-muted">
                        {getInitials(name || email)}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                  <div className="flex flex-col gap-1">
                    <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}
                      className="w-fit h-9 px-3 text-xs tracking-[0.037em]">
                      <UploadIcon />
                      Cambiar foto
                    </Button>
                    <span className="text-xs text-muted-foreground">PNG, JPG o WEBP. Se ajusta automáticamente.</span>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp"
                    onChange={handlePhotoChange} className="sr-only" />
                </div>
              </section>

              <section className="flex flex-col gap-4">
                <div className="border-b border-border pb-2">
                  <h2 className={sectionLabel}>Datos personales</h2>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="name" className={fieldLabel}>Nombre</Label>
                  <Input id="name" name="name" type="text" placeholder="Tu nombre completo"
                    value={values.name} onChange={handleChange} className="h-11" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="email" className={fieldLabel}>Correo electrónico</Label>
                  <Input id="email" type="email" value={email} disabled readOnly
                    className="h-11 text-muted-foreground opacity-60 cursor-not-allowed" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="phone" className={fieldLabel}>Teléfono</Label>
                  <Input id="phone" name="phone" type="tel" placeholder="p. ej. 11 5555-5555"
                    value={values.phone} onChange={handleChange} className="h-11" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="address" className={fieldLabel}>Dirección</Label>
                  <Input id="address" name="address" type="text" placeholder="Calle, número, ciudad"
                    value={values.address} onChange={handleChange} className="h-11" />
                </div>
              </section>

              {error && <p className="text-sm text-destructive-foreground">{error}</p>}

              <div className="border-t border-border flex items-center justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => router.push('/owner')} className="px-4 py-2 text-sm">
                  Cancelar
                </Button>
                <MotionButton type="submit" disabled={submitting}
                  whileHover={!submitting ? { scale: 1.02, transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp } } : undefined}
                  whileTap={!submitting ? { scale: 0.97, transition: { duration: 0.1 } } : undefined}
                  className="h-10 px-4 text-xs tracking-[0.037em]">
                  {submitting ? 'Guardando…' : 'Guardar cambios'}
                </MotionButton>
              </div>

            </div>
          </div>
        </form>
      </div>
    </motion.div>
  )
}
