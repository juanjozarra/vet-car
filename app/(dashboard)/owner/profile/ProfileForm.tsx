'use client'

import { useState, useRef, type ChangeEvent, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { motionTokens } from '@/lib/motionTokens'
import { getInitials } from '@/lib/utils'
import { UploadIcon } from '@/components/ui/icons'
import styles from './ProfileForm.module.scss'

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
        <h1 className={styles.pageTitle}>Mi perfil</h1>
        <p className={styles.pageSub}>Actualizá tu foto y tus datos personales.</p>
      </div>

      <div className="max-w-[600px] mx-auto">
        <form onSubmit={handleSubmit}>
          <div className={`${styles.formCard} relative`}>
            <div className={styles.topAccent} />
            <div className="p-8 flex flex-col gap-8">

              <section className="flex flex-col gap-4">
                <div className={styles.sectionDivider}>
                  <h2 className={styles.sectionLabel}>Foto de perfil</h2>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={styles.avatarBtn}
                    aria-label="Cambiar foto de perfil"
                  >
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo} alt="Foto de perfil" className="h-full w-full object-cover" />
                    ) : (
                      <span className={styles.avatarInitials}>{getInitials(name || email)}</span>
                    )}
                  </button>
                  <div className="flex flex-col gap-1">
                    <button type="button" onClick={() => fileInputRef.current?.click()} className={styles.changePhotoBtn}>
                      <UploadIcon />
                      Cambiar foto
                    </button>
                    <span className={styles.uploadHint}>PNG, JPG o WEBP. Se ajusta automáticamente.</span>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp"
                    onChange={handlePhotoChange} className="sr-only" />
                </div>
              </section>

              <section className="flex flex-col gap-4">
                <div className={styles.sectionDivider}>
                  <h2 className={styles.sectionLabel}>Datos personales</h2>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="name" className={styles.fieldLabel}>Nombre</label>
                  <input id="name" name="name" type="text" placeholder="Tu nombre completo"
                    value={values.name} onChange={handleChange} className={styles.input} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="email" className={styles.fieldLabel}>Correo electrónico</label>
                  <input id="email" type="email" value={email} disabled readOnly
                    className={styles.inputDisabled} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="phone" className={styles.fieldLabel}>Teléfono</label>
                  <input id="phone" name="phone" type="tel" placeholder="p. ej. 11 5555-5555"
                    value={values.phone} onChange={handleChange} className={styles.input} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="address" className={styles.fieldLabel}>Dirección</label>
                  <input id="address" name="address" type="text" placeholder="Calle, número, ciudad"
                    value={values.address} onChange={handleChange} className={styles.input} />
                </div>
              </section>

              {error && <p className={styles.errorMsg}>{error}</p>}

              <div className={`${styles.actionsDivider} flex items-center justify-end gap-3 pt-2`}>
                <button type="button" onClick={() => router.push('/owner')} className={styles.cancelBtn}>
                  Cancelar
                </button>
                <motion.button type="submit" disabled={submitting}
                  whileHover={!submitting ? { scale: 1.02, transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp } } : undefined}
                  whileTap={!submitting ? { scale: 0.97, transition: { duration: 0.1 } } : undefined}
                  className={styles.submitBtn}>
                  {submitting ? 'Guardando…' : 'Guardar cambios'}
                </motion.button>
              </div>

            </div>
          </div>
        </form>
      </div>
    </motion.div>
  )
}
