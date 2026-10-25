import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="policy-page">
      <header className="detail-header">
        <Link href="/" className="back-link">← BACK TO STORE</Link>
        <Link href="/" className="logo">
          <span className="brand-mark-frame"><img className="brand-mark" src="/icons/lattey-wala-logo.jpg" alt="" /></span>
          LATTEY <span>WALA</span>
        </Link>
      </header>
      <article className="policy-content about-content">
        <p className="eyebrow">OUR STORY</p>
        <h1>About Us – Lattey Wala</h1>
        <h2>Style That Speaks. Comfort That Lasts.</h2>
        <p>Welcome to Lattey Wala, where style meets comfort and everyday fashion gets a fresh identity.</p>
        <p>At Lattey Wala, we believe that what you wear is a reflection of who you are. Our goal is to bring you stylish, comfortable, and versatile clothing that fits effortlessly into your everyday lifestyle.</p>
        <p>From classic everyday T-shirts to stylish Henley Tees, we focus on creating a look that is timeless, easy to wear, and full of confidence. We believe that great style doesn’t need to be complicated — it starts with the right fit, the right feel, and the right attitude.</p>

        <h2>Our Mission</h2>
        <p>Our mission is to make everyday fashion simple, stylish, and accessible. We want every customer to find clothing that feels comfortable, looks great, and makes them feel confident.</p>

        <h2>Why Choose Lattey Wala?</h2>
        <ul>
          <li><strong>Everyday Style:</strong> Designs that complement your daily lifestyle.</li>
          <li><strong>Comfort First:</strong> Clothing designed with comfort in mind.</li>
          <li><strong>Timeless Appeal:</strong> Classic styles that never go out of fashion.</li>
          <li><strong>Made for You:</strong> Fashion that lets you express your own personality.</li>
        </ul>

        <h2>Our Promise</h2>
        <p>At Lattey Wala, we aim to make every shopping experience easy, enjoyable, and memorable. Your trust inspires us to keep improving, bringing you styles you’ll love wearing again and again.</p>
        <p><strong>Lattey Wala — Wear Your Style. Own Your Identity.</strong></p>
        <p>Thank you for being a part of our journey.</p>
      </article>
    </main>
  );
}
