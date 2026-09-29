import { NextResponse } from 'next/server'
import { getAdminDb, requireUser } from '@/lib/firebase-admin'
import { calculateDelivery, defaultDeliverySettings, isServiceableLocation } from '@/lib/commerce'

export const runtime = 'nodejs'
type ClientItem = { productId: string; name?: string; color?: string; size?: string; quantity?: number; sku?: string }

export async function POST(request: Request) {
  try {
    const user = await requireUser(request)
    const body = await request.json() as { items?: ClientItem[]; address?: { name?: string; phone?: string; address?: string; city?: string; state?: string; pincode?: string; instructions?: string } }
    const address = body.address || {}; const items = body.items || []
    if (!items.length || !address.name || !address.phone || !address.address || !address.city || !address.state || !address.pincode) return NextResponse.json({ error: 'Complete delivery details are required' }, { status: 400 })
    if (!isServiceableLocation(address.city, address.pincode)) return NextResponse.json({ error: 'This delivery location is outside the service area' }, { status: 400 })
    const adminDb = getAdminDb(); const verifiedItems = []
    for (const item of items) {
      const quantity = Math.floor(Number(item.quantity)); if (!item.productId || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) return NextResponse.json({ error: 'Invalid cart item' }, { status: 400 })
      const productSnapshot = await adminDb.collection('products').doc(item.productId).get(); if (!productSnapshot.exists) return NextResponse.json({ error: 'A product is no longer available' }, { status: 400 })
      const product = productSnapshot.data() as { name?: string; image?: string; variants?: Array<{ color?: string; size?: string; price?: number; stock?: number; sku?: string }>; price?: number; active?: boolean }
      if (product.active === false) return NextResponse.json({ error: 'A product is no longer available' }, { status: 400 })
      const variant = product.variants?.find(value => value.sku === item.sku && value.color === item.color && value.size === item.size); const unitPrice = Number(variant?.price ?? product.price)
      if (!Number.isFinite(unitPrice) || unitPrice < 0 || (variant && Number(variant.stock) < quantity)) return NextResponse.json({ error: `${product.name || 'Item'} is out of stock` }, { status: 400 })
      verifiedItems.push({ productId: item.productId, name: product.name || item.name || 'Product', image: product.image || '', color: variant?.color || item.color || '', size: variant?.size || item.size || '', sku: variant?.sku || item.sku || item.productId, quantity, price: unitPrice, total: unitPrice * quantity })
    }
    const subtotal = verifiedItems.reduce((total, item) => total + item.total, 0); const settings = { freeDeliveryThreshold: Number(process.env.FREE_DELIVERY_THRESHOLD || defaultDeliverySettings.freeDeliveryThreshold), deliveryCharge: Number(process.env.DELIVERY_CHARGE || defaultDeliverySettings.deliveryCharge) }; const deliveryCharge = calculateDelivery(subtotal, settings); const totalAmount = subtotal + deliveryCharge
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) return NextResponse.json({ error: 'Razorpay is not configured on the server' }, { status: 503 })
    const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', { method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64')}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: Math.round(totalAmount * 100), currency: 'INR', receipt: `lw_${Date.now()}`, notes: { customerId: user.uid } }) })
    if (!razorpayResponse.ok) return NextResponse.json({ error: 'Unable to create Razorpay order' }, { status: 502 })
    const razorpayOrder = await razorpayResponse.json() as { id: string; amount: number; currency: string }
    await adminDb.collection('checkoutRequests').doc(razorpayOrder.id).set({ customerId: user.uid, customer: { name: address.name, phone: address.phone, email: user.email || '' }, deliveryAddress: address, items: verifiedItems, subtotal, deliveryCharge, totalAmount, amountPaise: razorpayOrder.amount, status: 'CREATED', createdAt: new Date().toISOString() })
    return NextResponse.json({ keyId: process.env.RAZORPAY_KEY_ID, orderId: razorpayOrder.id, amount: razorpayOrder.amount, currency: razorpayOrder.currency })
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to create payment order' }, { status: 400 }) }
}
