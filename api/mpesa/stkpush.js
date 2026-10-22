// Sandbox testing branch
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
      MPESA_CALLBACK_URL
    } = process.env;

    if (
      !MPESA_CONSUMER_KEY ||
      !MPESA_CONSUMER_SECRET ||
      !MPESA_PASSKEY ||
      !MPESA_SHORTCODE ||
      !MPESA_CALLBACK_URL
    ) {
      return res.status(500).json({
        error: "M-PESA configuration is incomplete."
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
    if (amount < 1 || amount > 250000) {
      return res.status(400).json({ error: "Invalid amount." });
    }

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

    const timestamp = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Nairobi",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23"
    }).formatToParts(new Date());

    const dateParts = Object.fromEntries(
      timestamp.map(({ type, value }) => [type, value])
    );

    const timeStamp =
      dateParts.year + dateParts.month + dateParts.day +
      dateParts.hour + dateParts.minute + dateParts.second;

    const password = Buffer.from(
      MPESA_SHORTCODE + MPESA_PASSKEY + timeStamp
    ).toString("base64");

    const sandbox = "https://sandbox.safaricom.co.ke";

    const authResponse = await fetch(
      sandbox + "/oauth/v1/generate?grant_type=client_credentials",
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
      sandbox + "/mpesa/stkpush/v1/processrequest",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + auth.access_token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          BusinessShortCode: MPESA_SHORTCODE,
          Password: password,
          Timestamp: timeStamp,
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

    if (!stkResponse.ok || result.ResponseCode !== "0") {
      return res.status(502).json({
        error: "M-PESA Sandbox did not accept the request."
      });
    }

    return res.status(200).json({
      message: "Sandbox payment prompt accepted for processing.",
      checkoutRequestId: result.CheckoutRequestID
    });
  } catch {
    return res.status(500).json({
      error: "Unable to process the M-PESA request."
    });
  }
}

