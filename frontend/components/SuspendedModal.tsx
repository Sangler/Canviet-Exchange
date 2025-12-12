import React from 'react'
import { useRouter } from 'next/router'
import { useLanguage } from '../context/LanguageContext'

type Props = {
  open: boolean
  onClose: () => void
}

export default function SuspendedModal({ open, onClose }: Props) {
  const router = useRouter()
  const { t } = useLanguage()
  
  if (!open) return null

  return (
    <div className="suspended-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="suspended-modal-title">
      <div className="suspended-modal">
        <h2 id="suspended-modal-title" className="h5">{t('suspended.title')}</h2>
        <p>{t('suspended.message')}</p>
        <div className="d-flex justify-content-end gap-2">
          <button type="button" className="btn btn-outline-secondary" onClick={() => onClose()}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              onClose()
              if (router.pathname !== '/general/help') router.push('/general/help')
            }}
          >
            {t('suspended.contactSupport')}
          </button>
        </div>
      </div>
    </div>
  )
}
