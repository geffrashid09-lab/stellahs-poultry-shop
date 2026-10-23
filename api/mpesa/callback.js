
export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      MPESA_CONSUMER_KEY,
      MPESA_CONSUMER_SECRET,
      MPESA_PASSKEY,
      MPESA_SHORTCODE,
      MPESA_CALLBACK_URL,
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY
    } = process.env;

    if (
      !MPESA_CONSUMER_KEY ||
      !MPESA_CONSUMER_SECRET ||
      !MPESA_PASSKEY ||
      !MPESA_SHORTCODE ||
      !MPESA_CALLBACK_URL ||
      !SUPABASE_URL ||
      !SUPABASE_SERVICE_ROLE_KEY
    ) {
      return res.status(500).json({
        error: "Server payment configuration is incomplete."
      });
    }

    const { phone, product, quantity } = req.body || {};
    const qty = Number(quantity);

    const prices = {
      broiler: 400,
      kienyeji_male: 1500,
      kienyeji_female: 1000
    };

    if (
      typeof product !== "string" ||
      !Object.hasOwn(prices, product) ||
      !Number.isSafeInteger(qty) ||
      qty < 1 ||
      qty > 20
    ) {
      return res.status(400).json({
        error: "Invalid product or quantity."
      });
    }

    const amount = prices[product] * qty;
    const digits = String(phone || "").replace(/[\s+()-]/g, "");
    let normalizedPhone = digits;

    if (/^0[17]\d{8}$/.test(digits)) {
      normalizedPhone = "254" + digits.slice(1);
    } else if (/^[17]\d{8}$/.test(digits)) {
      normalizedPhone = "254" + digits;
    }

    if (!/^254[17]\d{8}$/.test(normalizedPhone)) {
      return res.status(400).json({
        error: "Enter a valid Kenyan mobile number."
      });
    }

    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Nairobi",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23"
    }).formatToParts(new Date());

    const date = Object.fromEntries(
      parts.map(({ type, value }) => [type, value])
    );

    const timestamp =
      date.year + date.month + date.day +
      date.hour + date.minute + date.second;

    const password = Buffer.from(
      MPESA_SHORTCODE + MPESA_PASSKEY + timestamp
    ).toString("base64");

    const baseUrl = "https://sandbox.safaricom.co.ke";

    const authResponse = await fetch(
      baseUrl + "/oauth/v1/generate?grant_type=client_credentials",
      {
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(
              MPESA_CONSUMER_KEY + ":" + MPESA_CONSUMER_SECRET
            ).toString("base64")
        }
      }
    );

    const auth = await authResponse.json();

    if (!authResponse.ok || !auth.access_token) {
      return res.status(502).json({
        error: "Could not authenticate with M-PESA Sandbox."
      });
    }

    const stkResponse = await fetch(
      baseUrl + "/mpesa/stkpush/v1/processrequest",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + auth.access_token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          BusinessShortCode: MPESA_SHORTCODE,
          Password: password,
          Timestamp: timestamp,
          TransactionType: "CustomerPayBillOnline",
          Amount: amount,
          PartyA: normalizedPhone,
          PartyB: MPESA_SHORTCODE,
          PhoneNumber: normalizedPhone,
          CallBackURL: MPESA_CALLBACK_URL,
          AccountReference: "StellahsShop",
          TransactionDesc: "Poultry order"
        })
      }
    );

    const result = await stkResponse.json();

    if (!stkResponse.ok || result.ResponseCode !== "0" ||
        !result.CheckoutRequestID) {
      return res.status(502).json({
        error: "M-PESA Sandbox did not accept the request."
      });
    }

    const dbResponse = await fetch(
      SUPABASE_URL.replace(/\/$/, "") +
        "/rest/v1/mpesa_payments",
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: "Bearer " + SUPABASE_SERVICE_ROLE_KEY,
          "Content-Type": "application/json",
          Prefer: "return=minimal"
        },
        body: JSON.stringify({
          checkout_request_id: result.CheckoutRequestID,
          merchant_request_id: result.MerchantRequestID || null,
          phone_number: normalizedPhone,
          amount,
          product_code: product,
          quantity: qty,
          status: "pending"
        })
      }
    );

    if (!dbResponse.ok) {
      console.error("Payment tracking insert failed:", dbResponse.status);
      return res.status(502).json({
        error:
          "The payment prompt may have been sent, but tracking failed. " +
          "Do not retry immediately; ask the shop to check the payment."
      });
    }

    return res.status(200).json({
      message: "Sandbox prompt accepted. Payment is still pending.",
      checkoutRequestId: result.CheckoutRequestID
    });
  } catch {
    return res.status(500).json({
      error: "Unable to process the M-PESA request."
    });
  }
}
