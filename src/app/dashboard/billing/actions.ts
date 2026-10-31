"use server";

import { createClient } from "@/lib/supabase/server";

const PLAN_PRICES: Record<"standard" | "premium", { amount: number; name: string }> = {
  standard: { amount: 79900, name: "KonekTap Standard Tier" }, // ₱799.00
  premium: { amount: 149900, name: "KonekTap Premium Tier" },   // ₱1,499.00
};

export async function createCheckoutSession(targetTier: "standard" | "premium") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Kailangan mong mag-login muna." };
  }

  const plan = PLAN_PRICES[targetTier];
  if (!plan) {
    return { error: "Invalid subscription plan." };
  }

  const secretKey = process.env.PAYMONGO_SECRET_KEY;
  if (!secretKey) {
    return { error: "Payment configuration error (Missing PAYMONGO_SECRET_KEY)." };
  }

  const authHeader = Buffer.from(`${secretKey}:`).toString("base64");
  const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const appUrl = rawAppUrl.replace(/\/$/, "");

  const response = await fetch("https://api.paymongo.com/v1/checkout_sessions", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Basic ${authHeader}`,
    },
    body: JSON.stringify({
      data: {
        attributes: {
          send_email_receipt: true,
          show_description: true,
          show_line_items: true,
          description: `Upgrade account (${user.email}) to ${plan.name}`,
          line_items: [
            {
              currency: "PHP",
              amount: plan.amount,
              name: plan.name,
              quantity: 1,
            },
          ],
          payment_method_types: ["gcash", "paymaya", "qrph", "card"],
          success_url: `${appUrl}/dashboard/billing?upgrade=success&tier=${targetTier}`,
          cancel_url: `${appUrl}/dashboard/billing?upgrade=cancelled`,
          metadata: {
            user_id: user.id,
            target_tier: targetTier,
          },
        },
      },
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    console.error("[PayMongo Checkout Error]:", result);
    return { error: result?.errors?.[0]?.detail || "Hindi makagawa ng checkout session." };
  }

  return { checkoutUrl: result.data.attributes.checkout_url as string };
}