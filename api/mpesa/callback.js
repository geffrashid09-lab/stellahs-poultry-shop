export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  // Acknowledge Safaricom's callback.
  // This does not confirm or store a successful payment.
  console.log("M-PESA callback received");

  return res.status(200).json({
    ResultCode: 0,
    ResultDesc: "Accepted"
  });
}
