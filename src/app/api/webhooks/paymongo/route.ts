import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signatureHeader = req.headers.get("paymongo-signature");
    const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;

    // 1. I-verify ang signature mula sa PayMongo
    if (webhookSecret && signatureHeader) {
      const parts = Object.fromEntries(
        signatureHeader.split(",").map((part) => part.split("="))
      );
      const timestamp = parts.t;
      const signature = parts.te || parts.li; // 'te' = Test Mode, 'li' = Live Mode

      const signedPayload = `${timestamp}.${rawBody}`;
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(signedPayload)
        .digest("hex");

      if (signature !== expectedSignature) {
        console.error("[PayMongo Webhook] Invalid signature");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody);
    const eventType = payload?.data?.attributes?.type;

    // 2. Kapag bayad na ang Checkout Session, i-update ang tier sa Supabase
    if (eventType === "checkout_session.payment.paid") {
      const sessionData = payload.data.attributes.data;
      const metadata = sessionData?.attributes?.metadata;

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
          console.error("[PayMongo Webhook] Supabase update failed:", error);
          return NextResponse.json({ error: "Database update failed" }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error("[PayMongo Webhook Error]:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 400 });
  }
}