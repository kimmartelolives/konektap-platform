import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const callbackTokenHeader = req.headers.get("x-callback-token");
    const configuredToken = process.env.XENDIT_WEBHOOK_VERIFICATION_TOKEN;

    if (configuredToken && callbackTokenHeader !== configuredToken) {
      console.error("[Xendit Webhook] Unauthorized token mismatch");
      return NextResponse.json({ error: "Invalid callback token" }, { status: 401 });
    }

    const payload = await req.json();
    const status = payload?.status; // "PAID" o "SETTLED"
    const metadata = payload?.metadata;

    if (status === "PAID" || status === "SETTLED") {
      const userId = metadata?.user_id;
      const targetTier = metadata?.target_tier;

      if (userId && (targetTier === "standard" || targetTier === "premium")) {
        const supabaseAdmin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { error } = await supabaseAdmin
          .from("profiles")
          .update({ tier: targetTier })
          .eq("id", userId);

        if (error) {
          console.error("[Xendit Webhook] Supabase update failed:", error);
          return NextResponse.json({ error: "Database update failed" }, { status: 500 });
        }

        console.log(`[Xendit Webhook] Successfully upgraded user ${userId} to ${targetTier}`);
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error("[Xendit Webhook Error]:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 400 });
  }
}