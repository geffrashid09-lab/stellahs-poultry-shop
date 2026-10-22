
export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  return res.status(501).json({
    error: "M-PESA backend setup is in progress. No payment has been requested."
  });
}
