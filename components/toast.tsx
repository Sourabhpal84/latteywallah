'use client'

import { Check, CircleAlert, Info, X } from 'lucide-react'
import { createContext, useCallback, useContext, useState } from 'react'

type ToastKind = 'success' | 'error' | 'warning' | 'info'
type Toast = { id: number; kind: ToastKind; title: string; message?: string; image?: string }
type ToastInput = Omit<Toast, 'id'>

const ToastContext = createContext<{ notify: (toast: ToastInput) => void }>({ notify: () => undefined })
export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const notify = useCallback((toast: ToastInput) => {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    setToasts(current => [...current, { ...toast, id }])
    window.setTimeout(() => setToasts(current => current.filter(item => item.id !== id)), 2800)
  }, [])
  const remove = (id: number) => setToasts(current => current.filter(item => item.id !== id))
  const icon = (kind: ToastKind) => kind === 'success' ? <Check size={16} /> : kind === 'info' ? <Info size={16} /> : <CircleAlert size={16} />
  return <ToastContext.Provider value={{ notify }}>{children}<div className="toast-stack" aria-live="polite">{toasts.map(toast => <div className={`toast toast-${toast.kind}`} key={toast.id}>{toast.image ? <img src={toast.image} alt="" /> : <span className="toast-icon">{icon(toast.kind)}</span>}<div><b>{toast.title}</b>{toast.message && <p>{toast.message}</p>}</div><button onClick={() => remove(toast.id)} aria-label="Dismiss notification"><X size={15} /></button></div>)}</div></ToastContext.Provider>
}
