
function getTimestamp() {
  const d = new Date();
  return (
    d.getFullYear().toString() +
    String(d.getMonth() + 1).padStart(2, "0") +
    String(d.getDate()).padStart(2, "0") +
    String(d.getHours()).padStart(2, "0") +
    String(d.getMinutes()).padStart(2, "0") +
    String(d.getSeconds()).padStart(2, "0")
  );
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      MPESA_CONSUMER_KEY,
      MPESA_CONSUMER_SECRET,
      MPESA_SHORTCODE,
      MPESA_PASSKEY,
    } = process.env;

    if (
      !MPESA_CONSUMER_KEY ||
      !MPESA_CONSUMER_SECRET ||
      !MPESA_SHORTCODE ||
      !MPESA_PASSKEY
    ) {
      return res.status(500).json({ error: "M-PESA configuration incomplete" });
    }

    const { checkoutRequestId } = req.body || {};

    if (
      typeof checkoutRequestId !== "string" ||
      !/^ws_CO_[A-Za-z0-9_-]+$/.test(checkoutRequestId)
    ) {
      return res.status(400).json({ error: "Invalid checkout request ID" });
    }

    const auth = Buffer.from(
      `${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`
    ).toString("base64");

    const tokenResponse = await fetch(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      {
        headers: { Authorization: `Basic ${auth}` },
      }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      return res.status(502).json({ error: "M-PESA authentication failed" });
    }

    const timestamp = getTimestamp();
    const password = Buffer.from(
      `${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`
    ).toString("base64");

    const queryResponse = await fetch(
      "https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          BusinessShortCode: MPESA_SHORTCODE,
          Password: password,
          Timestamp: timestamp,
          CheckoutRequestID: checkoutRequestId,
        }),
      }
    );

    const queryData = await queryResponse.json();

    if (!queryResponse.ok) {
      return res.status(502).json({ error: "M-PESA query failed" });
    }

    // A query response alone does not authorize marking an order as paid.
    return res.status(200).json({
      message: "Query response received; payment still requires verification.",
      resultCode: queryData.ResultCode ?? null,
      resultDescription: queryData.ResultDesc ?? null,
    });
  } catch {
    return res.status(500).json({ error: "Unable to query M-PESA right now" });
  }
}
