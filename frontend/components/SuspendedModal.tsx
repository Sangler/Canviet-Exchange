import React from 'react'
import { useRouter } from 'next/router'

type Props = {
  open: boolean
  onClose: () => void
}

export default function SuspendedModal({ open, onClose }: Props) {
  const router = useRouter()
  if (!open) return null

  return (
    <div className="suspended-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="suspended-modal-title">
      <div className="suspended-modal">
        <h2 id="suspended-modal-title" className="h5">Account Suspended</h2>
        <p>Your account has been suspended due to compliance concerns. Please contact our support team to continue.</p>
        <div className="d-flex justify-content-end gap-2">
          <button type="button" className="btn btn-outline-secondary" onClick={() => onClose()}>
            Dismiss
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              onClose()
              if (router.pathname !== '/general/help') router.push('/general/help')
            }}
          >
            Contact Help
          </button>
        </div>
      </div>
    </div>
  )
}
