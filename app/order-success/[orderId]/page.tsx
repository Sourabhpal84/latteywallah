'use client'

import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'
import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'

type Order = { displayOrderId?: string; totalAmount?: number; paymentStatus?: string; orderStatus?: string }
const steps = ['NEW', 'CONFIRMED', 'PREPARING', 'READY', 'OUT FOR DELIVERY', 'DELIVERED']
const title = (value: string) => value.toLowerCase().replace(/(^| )\S/g, character => character.toUpperCase())
export default function OrderSuccessPage({ params }: { params: { orderId: string } }) {
  const [order, setOrder] = useState<Order | null>(null)
  useEffect(() => { if (!auth) return; return auth.onAuthStateChanged(user => { if (!user) return; return onSnapshot(doc(db, 'orders', params.orderId), snapshot => setOrder(snapshot.exists() ? snapshot.data() as Order : null)) }) }, [params.orderId])
  const active = Math.max(0, steps.indexOf(order?.orderStatus || 'NEW'))
  return <main className="order-page"><section className="order-card"><p className="eyebrow">ORDER PLACED SUCCESSFULLY</p><div className="success-mark"><Check size={24} /></div><h1>Thank you for your order.</h1><p className="order-number">#{order?.displayOrderId || params.orderId}</p><div className="order-payment"><span>PAYMENT: {order?.paymentStatus || 'PAID'}</span><strong>₹{(order?.totalAmount || 0).toLocaleString('en-IN')}</strong></div><div className="timeline">{steps.map((step, index) => <div className={`timeline-item ${index <= active ? 'done' : ''}`} key={step}><span>{index <= active ? <Check size={14} /> : index + 1}</span><p>{title(step)}</p></div>)}</div><Link className="button button-dark" href={`/orders/${params.orderId}`}>TRACK ORDER <ArrowRight size={16} /></Link></section></main>
}
