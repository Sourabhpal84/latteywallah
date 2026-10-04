import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="policy-page">
      <header className="detail-header">
        <Link href="/" className="back-link">← BACK TO STORE</Link>
        <Link href="/" className="logo"><img className="brand-mark" src="/icons/lattey-walla-wolf-source.png" alt="" /> LATTEY <span>WALA</span></Link>
      </header>
      <article className="policy-content">
        <p className="eyebrow">CUSTOMER INFORMATION</p>
        <h1>Terms & Conditions</h1>
        <p>By browsing or placing an order with Lattey Wala, you agree to use this store for lawful purposes and to provide accurate contact and delivery information.</p>
        <h2>Orders and payment</h2>
        <p>Orders are subject to product availability and confirmation. Product prices and applicable delivery charges are shown during checkout. Please review your order details before placing it and follow the payment instructions shown at checkout.</p>
        <h2>Delivery, returns and support</h2>
        <p>Delivery estimates may vary by location. Please see our order and returns support page or contact us if you need help with an order.</p>
        <h2>Contact</h2>
        <p>LATTEYWALA GARMENTS CONCAVE PVT. LTD.<br /><a href="mailto:latteywala@gmail.com">latteywala@gmail.com</a><br /><a href="tel:+919821278468">+91 98212 78468</a></p>
        <p className="policy-updated">Last updated: October 4, 2026</p>
      </article>
    </main>
  );
}
