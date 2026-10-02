import { Check, Circle, Clock3 } from 'lucide-react'

export const ORDER_STATUSES = ['NEW', 'CONFIRMED', 'PREPARING', 'READY', 'OUT FOR DELIVERY', 'DELIVERED', 'CANCELLED', 'REJECTED'] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const titleCase = (value = '') => value.toLowerCase().replace(/(^| )\S/g, character => character.toUpperCase())
export const money = (value = 0) => `₹${Number(value || 0).toLocaleString('en-IN')}`
export const dateTime = (value?: string) => value ? new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—'

export function StatusBadge({ status, payment = false }: { status?: string; payment?: boolean }) {
  const value = status || (payment ? 'PENDING' : 'NEW')
  const tone = value.toLowerCase().replace(/\s+/g, '-')
  return <span className={`status-badge status-${tone}`}>{titleCase(value)}</span>
}

export function TrackingTimeline({ status, history = [] }: { status?: string; history?: Array<{ status?: string; timestamp?: string }> }) {
  const flow = ['NEW', 'CONFIRMED', 'PREPARING', 'READY', 'OUT FOR DELIVERY', 'DELIVERED']
  const current = flow.indexOf((status || 'NEW').toUpperCase())
  return <div className="tracking-timeline">{flow.map((step, index) => {
    const completed = index < current; const active = index === current
    const entry = history.find(item => item.status === step || (step === 'NEW' && item.status === 'PLACED'))
    return <div className={`tracking-step ${completed ? 'complete' : ''} ${active ? 'current' : ''}`} key={step}><span>{completed ? <Check size={14} /> : active ? <Clock3 size={14} /> : <Circle size={12} />}</span><div><b>{titleCase(step)}</b><small>{entry?.timestamp ? dateTime(entry.timestamp) : active ? `Currently ${titleCase(step).toLowerCase()}` : 'Upcoming'}</small></div></div>
  })}</div>
}
