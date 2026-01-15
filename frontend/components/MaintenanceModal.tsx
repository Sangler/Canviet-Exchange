import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import { useLanguage } from '../context/LanguageContext'

function parseBoolean(value: unknown): boolean {
  if (typeof value !== 'string') return false
  const normalized = value.trim().toLowerCase()
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on'
}

export default function MaintenanceModal() {
  const { t } = useLanguage()
  const router = useRouter()

  const maintenanceModeEnabled = useMemo(
    () => parseBoolean(process.env.WEBSITE_MAINTENANCE_MODE),
    [],
  )

  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!maintenanceModeEnabled) return

    const show = () => setOpen(true)

    // Show on initial load
    show()

    // Show again after every client-side navigation
    router.events.on('routeChangeComplete', show)
    return () => {
      router.events.off('routeChangeComplete', show)
    }
  }, [maintenanceModeEnabled, router.events])

  if (!open) return null

  return (
    <div
      className="maintenance-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="maintenance-modal-title"
    >
      <div className="maintenance-modal">
        <h2 id="maintenance-modal-title" className="h5">
          {t('maintenance.title')}
        </h2>
        <p>{t('maintenance.message')}</p>
        <div className="d-flex justify-content-end gap-2">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setOpen(false)
            }}
          >
            {t('maintenance.dismiss')}
          </button>
        </div>
      </div>
    </div>
  )
}
