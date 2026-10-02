# lattey WALA

Premium fashion commerce starter built with Next.js, TypeScript, Tailwind-ready styling, PostgreSQL and Prisma.

## Run locally

1. Install Node.js 18.17+ and PostgreSQL.
2. Copy `.env.example` to `.env` and set `DATABASE_URL`.
3. Install dependencies with `npm install`.
4. Generate the Prisma client with `npx prisma generate`.
5. Create the database with `npx prisma migrate dev --name init`.
6. Start the storefront with `npm run dev`.

The homepage currently uses curated development catalog data in `lib/products.ts` so the visual experience is immediately usable. The Prisma schema is ready for moving catalog, inventory, orders, coupons, CMS content and admin records into the database-backed API layer. Razorpay and object storage credentials are intentionally environment-only.

## Production

Set the variables in `.env.example` in Vercel, use a managed PostgreSQL provider, run migrations during deployment, and configure Razorpay webhooks to a server-side payment verification route. Product media should be stored in S3-compatible object storage rather than PostgreSQL.
