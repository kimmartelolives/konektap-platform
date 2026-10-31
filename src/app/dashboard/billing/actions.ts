"use server";

import { createClient } from "@/lib/supabase/server";

const PLAN_PRICES: Record<"standard" | "premium", { amount: number; name: string }> = {
  standard: { amount: 299, name: "KonekTap Standard Tier" },
  premium: { amount: 599, name: "KonekTap Premium Tier" },
};

export async function createCheckoutSession(targetTier: "standard" | "premium") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Kailangan mong mag-login muna." };
  }

  const plan = PLAN_PRICES[targetTier];
  if (!plan) {
    return { error: "Invalid subscription plan." };
  }

  const secretKey = process.env.XENDIT_SECRET_KEY;
  if (!secretKey) {
    return { error: "Missing XENDIT_SECRET_KEY in environment variables." };
  }

  const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const appUrl = rawAppUrl.replace(/\/$/, "");

  const externalId = `inv_${user.id}_${targetTier}_${Date.now()}`;
  const authHeader = Buffer.from(`${secretKey}:`).toString("base64");

  try {
    const response = await fetch("https://api.xendit.co/v2/invoices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Basic ${authHeader}`,
      },
      body: JSON.stringify({
        external_id: externalId,
        amount: plan.amount,
        currency: "PHP",
        description: `Upgrade account (${user.email}) to ${plan.name}`,
        payer_email: user.email,
        success_redirect_url: `${appUrl}/dashboard/billing?upgrade=success&tier=${targetTier}`,
        failure_redirect_url: `${appUrl}/dashboard/billing?upgrade=cancelled`,
        metadata: {
          user_id: user.id,
          target_tier: targetTier,
        },
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("[Xendit Invoice Error]:", result);
      return { error: result?.message || "Hindi makagawa ng payment link." };
    }

    return { checkoutUrl: result.invoice_url as string };
  } catch (err) {
    console.error("[Xendit Network Error]:", err);
    return { error: "Network error habang kumokonekta sa Xendit." };
  }
}