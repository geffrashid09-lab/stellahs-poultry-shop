# Stellah's Poultry Shop

A mobile-friendly poultry order-request and business-records app for Stellah's Poultry Shop in Thika, Kiambu County, Kenya.

## Customer experience

- Browse Broiler and Kienyeji poultry categories.
- Choose live or slaughtered-and-dressed preparation.
- Submit an order request for collection or delivery.
- Share the request using the device share menu where supported; otherwise download it as a text file.
- Use the interface in Kiswahili or English.
- Listen to key instructions using the browser's speech feature where supported.
- Prices, stock, delivery charges and payment are confirmed directly by Stellah before any payment is made.

## Staff records

- Supabase email/password sign-in is currently restricted in the app to profiles with the `admin` role.
- Poultry batch creation and batch purchase expenses are written to Supabase.
- Broiler and Kienyeji batches are kept separate.
- The next Broiler batch is blocked while an earlier Broiler batch still has birds unaccounted for.
- Sales, losses and expenses have write paths to Supabase, but the register currently relies on browser-local transaction history for its displayed calculations. It is **not yet a complete cross-device cloud register**.
- Browser-local records use the key `stellahPoultryRecordsV1`. Export backups regularly and do not clear browser data without a verified backup.

## Current implementation status

This is an in-progress application, not a fully launched production accounting system. In particular:

- Customer order requests are not automatically stored as orders in the database.
- Staff access is currently admin-only; worker-specific permissions are not implemented.
- Sales and stock movement history still need a verified, complete database read/synchronization workflow before the register can be treated as authoritative across devices.
- The Supabase project and its database policies must be reviewed by an authorized project owner before production use. Front-end role checks are not a substitute for database Row Level Security.
- Payment selection in the customer form is only a preference recorded in the request; it does not collect or confirm payment.

## Local preview

This is a static HTML application. Open `stellahs_poultry_shop_batches.html` in a browser for a basic preview. A live Supabase connection requires the configured project URL and publishable key in the HTML, plus the matching database schema, authentication users and secure Row Level Security policies.

## Data and safety notes

- Never commit Supabase secret/service-role keys or payment-provider credentials to this repository.
- Keep business contact details unpublished until Stellah confirms the correct public number.
- Do not enter real customer or financial records into an unverified test deployment.
- Take and securely store CSV/JSON backups of the local register.
- Verify database permissions, backups and recovery procedures before using the app for daily business records.

## Project ownership

Maintained as a community-focused digital project to support Stellah's poultry business.
