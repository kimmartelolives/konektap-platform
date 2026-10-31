"use server";

import { createClient } from "@/lib/supabase/server";

export async function createCheckoutSession(targetTier: "standard" | "premium") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Kailangan mong mag-login muna." };

  // 1. Kunin ang dynamic pricing mula sa Supabase
  const { data: plan, error: dbError } = await supabase
    .from("pricing_tiers")
    .select("*")
    .eq("id", targetTier)
    .single();

  if (dbError || !plan) return { error: "Hindi mahanap ang pricing plan." };

  // 2. Kalkulahin kung gagamitin ang base price o discount price
  const now = new Date();
  const hasActiveDiscount = 
    plan.discount_price !== null && 
    plan.discount_end_date && 
    new Date(plan.discount_end_date) > now;

  const finalAmount = hasActiveDiscount ? plan.discount_price : plan.base_price;

  const secretKey = process.env.XENDIT_SECRET_KEY;
  if (!secretKey) return { error: "Missing XENDIT_SECRET_KEY" };

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
        amount: finalAmount, // Dito papasok ang dynamic o discounted price
        currency: "PHP",
        description: `Upgrade account to ${plan.name}`,
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
    if (!response.ok) return { error: result?.message || "Payment link creation failed." };
    
    return { checkoutUrl: result.invoice_url as string };
  } catch (err) {
    return { error: "Network error sa payment gateway." };
  }
}