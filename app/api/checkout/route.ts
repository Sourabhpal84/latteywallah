import { NextResponse } from 'next/server'
import { calculateDelivery, defaultDeliverySettings } from '@/lib/commerce'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const subtotal = Number(body.subtotal)
    if (!Number.isFinite(subtotal) || subtotal < 0) return NextResponse.json({ error: 'Invalid subtotal' }, { status: 400 })
    const settings = { freeDeliveryThreshold: Number(process.env.FREE_DELIVERY_THRESHOLD || defaultDeliverySettings.freeDeliveryThreshold), deliveryCharge: Number(process.env.DELIVERY_CHARGE || defaultDeliverySettings.deliveryCharge) }
    const delivery = calculateDelivery(subtotal, settings)
    return NextResponse.json({ subtotal, delivery, total: subtotal + delivery, settings })
  } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }
}
