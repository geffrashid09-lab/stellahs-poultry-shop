# Stellah's Poultry Shop

A mobile-friendly poultry order-request and business-records app for Stellah's Poultry Shop in Thika, Kiambu County, Kenya.

## Current features

- English and Kiswahili customer-facing interface.
- Browser speech synthesis for listening to key instructions (availability depends on the device/browser voice support).
- Broiler and Kienyeji product categories.
- Order-request form for collection or delivery; order requests do not confirm stock, final prices, or payment.
- Kenyan phone-number validation and delivery-location validation.
- Admin sign-in through Supabase Auth and an admin profile-role check.
- Poultry batch, sales, stock movement, and expense write paths connected to Supabase.
- CSV and JSON export controls for the business register.

## Important business rules

- Broiler and Kienyeji batches are tracked separately.
- A new broiler batch is blocked while the active broiler batch still has birds remaining.
- Stellah must confirm stock, final prices, delivery arrangements, and payment instructions before a customer pays.
- Customer order requests are not payment confirmations.

## Data and synchronization status

The app is in active development. The current register combines Supabase-backed operations with browser-local cached transaction data. Batch and expense data are fetched from Supabase, but the app does not yet fully rebuild the sales and stock-movement history from Supabase after a fresh session or on another device. Do not treat the current register as a complete, reliable multi-device cloud ledger.

Use the available export controls to make backups. Do not clear browser records unless a backup has been made and the consequences are understood.

## Payments

Live Till/M-PESA integration is intentionally not part of this improvement branch. The app must not be represented as accepting verified live M-PESA payments. Confirm payment instructions directly with Stellah before any transfer. No till details or payment credentials belong in public-facing code or documentation.

## Configuration

The customer-facing page uses the Supabase JavaScript client and the project's publishable key. A publishable key is designed for browser use, but database security must be enforced by Supabase Row Level Security policies. Never place a Supabase service-role key, M-PESA secret, passkey, or other private credential in this HTML file.

The Supabase project must be accessible to the project owner and its schema/policies must be verified before making backend or database changes.

## Running and hosting

The main page is `stellahs_poultry_shop_batches.html`. The repository includes a Vercel rewrite configuration for serving that page at the site root. Hosting is currently intended to use the existing free-tier setup; check provider limits before enabling any optional paid feature.

## Project status

This branch contains a limited, low-cost front-end and documentation polish. It does not complete worker-role permissions, full multi-device transaction synchronization, production payment integration, or final launch testing. Review and test changes before merging or deploying.
