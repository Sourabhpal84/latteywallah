'use client'

import Link from 'next/link'
import { ArrowLeft, Check } from 'lucide-react'
import { useEffect, useState } from 'react'

const statuses = ['Confirmed', 'Processing', 'Packed', 'Dispatched', 'Out for Delivery', 'Delivered']
export default function OrderPage({ params }: { params: { orderId: string } }) {
  const [order, setOrder] = useState<{ id: string; total: number; paymentStatus: string; status: string } | null>(null)
  useEffect(() => { const saved = localStorage.getItem(`lattey-wallah-order-${params.orderId}`); if (saved) setOrder(JSON.parse(saved)) }, [params.orderId])
  const activeIndex = Math.max(0, statuses.indexOf(order?.status || 'Confirmed'))
  return <main className="order-page"><header className="detail-header"><Link href="/" className="back-link"><ArrowLeft size={16} /> LATTEY WALLAH</Link><span className="eyebrow">ORDER TRACKING</span></header><section className="order-card"><p className="eyebrow">ORDER CONFIRMED</p><h1>Thank you for your order.</h1><p className="order-number">Order #{params.orderId}</p>{order ? <><div className="order-payment"><span>PAYMENT</span><b>{order.paymentStatus}</b><strong>₹{order.total.toLocaleString('en-IN')}</strong></div><div className="timeline">{statuses.map((status, index) => <div className={`timeline-item ${index <= activeIndex ? 'done' : ''}`} key={status}><span>{index <= activeIndex ? <Check size={14} /> : index + 1}</span><p>{status}</p></div>)}</div></> : <p>Order details are not available on this device.</p>}<Link className="button button-dark" href="/#shop">CONTINUE SHOPPING</Link></section></main>
}
