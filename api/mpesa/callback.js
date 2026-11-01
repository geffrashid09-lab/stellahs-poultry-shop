
export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Supabase callback configuration is missing.");
      return res.status(500).json({ error: "Server configuration error." });
    }

    const callback = req.body?.Body?.stkCallback;

    if (!callback?.CheckoutRequestID ||
        callback.ResultCode === undefined) {
      return res.status(400).json({ error: "Invalid callback payload." });
    }

    const checkoutId = callback.CheckoutRequestID;
    const resultCode = String(callback.ResultCode);
    const resultDescription = callback.ResultDesc || "";

    const supabaseUrl = SUPABASE_URL.replace(/\/$/, "");
    const headers = {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: "Bearer " + SUPABASE_SERVICE_ROLE_KEY,
      "Content-Type": "application/json"
    };

    // Find the payment created by the STK Push endpoint.
    const lookupUrl = new URL(
      supabaseUrl + "/rest/v1/mpesa_payments"
    );

    lookupUrl.searchParams.set(
      "checkout_request_id",
      "eq." + checkoutId
    );
    lookupUrl.searchParams.set("select", "id,status");
    lookupUrl.searchParams.set("limit", "1");

    const lookupResponse = await fetch(lookupUrl, {
      method: "GET",
      headers
    });

    if (!lookupResponse.ok) {
      console.error("Payment lookup failed:", lookupResponse.status);
      return res.status(500).json({ error: "Payment lookup failed." });
    }

    const payments = await lookupResponse.json();
    const payment = payments[0];

    if (!payment) {
      console.error("No payment found for callback:", checkoutId);
      return res.status(200).json({ received: true });
    }

    // Do not let a repeated callback overwrite a completed payment.
    if (payment.status === "paid") {
      return res.status(200).json({ received: true });
    }

    let status;

    if (resultCode === "0") {
      status = "paid";
    } else if (resultCode === "1032") {
      status = "cancelled";
    } else {
      status = "failed";
    }

    const metadata =
      callback.CallbackMetadata?.Item || [];

    const receiptItem = metadata.find(
      item => item.Name === "MpesaReceiptNumber"
    );

    const receiptNumber = receiptItem?.Value
      ? String(receiptItem.Value)
      : null;

    const updateData = {
      status,
      result_code: resultCode,
      result_description: resultDescription,
      updated_at: new Date().toISOString()
    };

    if (receiptNumber) {
      updateData.mpesa_receipt_number = receiptNumber;
    }

    if (status === "paid") {
      updateData.paid_at = new Date().toISOString();
    }

    const updateUrl = new URL(
      supabaseUrl + "/rest/v1/mpesa_payments"
    );

    updateUrl.searchParams.set("id", "eq." + payment.id);

    const updateResponse = await fetch(updateUrl, {
      method: "PATCH",
      headers: {
        ...headers,
        Prefer: "return=minimal"
      },
      body: JSON.stringify(updateData)
    });

    if (!updateResponse.ok) {
      console.error("Payment update failed:", updateResponse.status);
      return res.status(500).json({ error: "Payment update failed." });
    }

    return res.status(200).json({ received: true });

  } catch (error) {
    console.error("M-PESA callback error:", error.message);
    return res.status(500).json({ error: "Callback processing failed." });
  }
}

