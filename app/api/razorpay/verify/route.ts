import { createHmac, timingSafeEqual } from 'crypto'
import { NextResponse } from 'next/server'
import { getAdminDb, requireUser } from '@/lib/firebase-admin'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const user = await requireUser(request); const adminDb = getAdminDb()
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await request.json()
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !process.env.RAZORPAY_KEY_SECRET) return NextResponse.json({ verified: false, error: 'Missing payment verification data' }, { status: 400 })
    const expected = createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex'); const valid = expected.length === razorpay_signature.length && timingSafeEqual(Buffer.from(expected), Buffer.from(razorpay_signature))
    if (!valid) return NextResponse.json({ verified: false, error: 'Invalid payment signature' }, { status: 400 })
    const checkoutRef = adminDb.collection('checkoutRequests').doc(razorpay_order_id); const checkoutSnapshot = await checkoutRef.get(); if (!checkoutSnapshot.exists) return NextResponse.json({ verified: false, error: 'Payment order not found' }, { status: 404 })
    const checkout = checkoutSnapshot.data() as { customerId: string; customer: object; deliveryAddress: object; items: object[]; subtotal: number; deliveryCharge: number; totalAmount: number; amountPaise: number; status?: string; orderId?: string }
    if (checkout.customerId !== user.uid) return NextResponse.json({ verified: false, error: 'Payment owner mismatch' }, { status: 403 })
    if (checkout.status === 'PAID' && checkout.orderId) return NextResponse.json({ verified: true, orderId: checkout.orderId })
    if (!process.env.RAZORPAY_KEY_ID) return NextResponse.json({ verified: false, error: 'Razorpay is not configured' }, { status: 503 })
    const paymentResponse = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, { headers: { Authorization: `Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64')}` } }); const payment = await paymentResponse.json() as { status?: string; amount?: number }
    if (!paymentResponse.ok || !['authorized', 'captured'].includes(payment.status || '') || payment.amount !== checkout.amountPaise) return NextResponse.json({ verified: false, error: 'Payment was not captured for the expected amount' }, { status: 400 })
    const orderReference = await adminDb.collection('orders').add({ customerId: checkout.customerId, customer: checkout.customer, deliveryAddress: checkout.deliveryAddress, items: checkout.items, subtotal: checkout.subtotal, discount: 0, deliveryCharge: checkout.deliveryCharge, totalAmount: checkout.totalAmount, paymentMethod: 'RAZORPAY', paymentStatus: 'PAID', orderStatus: 'CONFIRMED', razorpayOrderId: razorpay_order_id, razorpayPaymentId: razorpay_payment_id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    await checkoutRef.update({ status: 'PAID', orderId: orderReference.id, paymentId: razorpay_payment_id, updatedAt: new Date().toISOString() })
    return NextResponse.json({ verified: true, orderId: orderReference.id })
  } catch (error) { return NextResponse.json({ verified: false, error: error instanceof Error ? error.message : 'Payment verification failed' }, { status: 400 }) }
}
