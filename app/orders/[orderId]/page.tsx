'use client'

import Link from 'next/link'
import { ArrowLeft, Check } from 'lucide-react'
import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'

const statuses = ['NEW', 'CONFIRMED', 'PREPARING', 'READY', 'OUT FOR DELIVERY', 'DELIVERED']
const label = (status: string) => status.toLowerCase().replace(/(^| )\S/g, value => value.toUpperCase())
const money = (value: number) => `₹${value.toLocaleString('en-IN')}`
type OrderData = { displayOrderId?: string; totalAmount?: number; subtotal?: number; deliveryCharge?: number; paymentStatus?: string; orderStatus?: string; items?: Array<{ name?: string; color?: string; size?: string; quantity?: number; price?: number }> }
export default function OrderPage({ params }: { params: { orderId: string } }) {
  const [order, setOrder] = useState<OrderData | null>(null); const [loading, setLoading] = useState(true); const [accessError, setAccessError] = useState('')
  useEffect(() => { if (!auth) { setLoading(false); setAccessError('Please sign in to view this order.'); return }; let unsubscribeOrder: (() => void) | undefined; const unsubscribeAuth = auth.onAuthStateChanged(user => { unsubscribeOrder?.(); if (!user) { setLoading(false); setAccessError('Please sign in to view this order.'); return }; unsubscribeOrder = onSnapshot(doc(db, 'orders', params.orderId), snapshot => { if (!snapshot.exists()) { setAccessError('This order could not be found.'); setLoading(false); return }; setOrder(snapshot.data() as OrderData); setLoading(false) }, () => { setAccessError('You do not have access to this order.'); setLoading(false) }) }); return () => { unsubscribeOrder?.(); unsubscribeAuth() } }, [params.orderId])
  const activeIndex = Math.max(0, statuses.indexOf(order?.orderStatus || 'NEW'))
  return <main className="order-page"><header className="detail-header"><Link href="/" className="back-link"><ArrowLeft size={16} /> LATTEY WALLAH</Link><span className="eyebrow">ORDER TRACKING</span></header><section className="order-card"><p className="eyebrow">{order?.orderStatus === 'NEW' ? 'ORDER PLACED SUCCESSFULLY' : 'ORDER STATUS'}</p><h1>{order?.orderStatus === 'NEW' ? 'Thank you for your order.' : 'Order tracking'}</h1><p className="order-number">Order #{order?.displayOrderId || params.orderId}</p>{loading ? <p>Loading order details…</p> : accessError ? <><p>{accessError}</p><Link className="button button-dark" href="/account/login">SIGN IN</Link></> : order ? <><div className="order-payment"><span>PAYMENT: {order.paymentStatus || 'PENDING'}</span><strong>{money(order.totalAmount || 0)}</strong></div><div className="timeline">{statuses.map((status, index) => <div className={`timeline-item ${index <= activeIndex ? 'done' : ''}`} key={status}><span>{index <= activeIndex ? <Check size={14} /> : index + 1}</span><p>{label(status)}</p></div>)}</div><div className="order-breakdown"><p><span>Subtotal</span><b>{money(order.subtotal || 0)}</b></p><p><span>Delivery</span><b>{order.deliveryCharge ? money(order.deliveryCharge) : 'FREE'}</b></p>{order.items?.map((item, index) => <p key={`${item.name}-${index}`}><span>{item.name} · {item.color} · {item.size} × {item.quantity}</span><b>{money((item.price || 0) * (item.quantity || 1))}</b></p>)}</div></> : null}<Link className="button button-dark" href="/#shop">CONTINUE SHOPPING</Link></section></main>
}
