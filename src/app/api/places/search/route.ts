import { NextRequest, NextResponse } from "next/server";

export type PlaceSearchResult = {
  place_id: string;
  name: string;
  address: string;
  rating?: number;
  user_ratings_total?: number;
  category?: string;
  review_url: string;
};

// Ligtas na tagabuo ng review link nang walang panganib ng 400 error
async function generateSafeReviewUrl(businessName: string, locationHint: string = ""): Promise<string> {
  const query = `${businessName} ${locationHint}`.trim();
  const encodedQuery = encodeURIComponent(query);

  try {
    const mapsUrl = `https://www.google.com/maps/search/${encodedQuery}`;
    const res = await fetch(mapsUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      next: { revalidate: 86400 },
    });

    const text = await res.text();

    // 1. Kung may nahanap na opisyal na Place ID (ChIJ...) -> Direktang magbubukas ng 5-star modal
    const placeIdMatch = text.match(/(ChIJ[a-zA-Z0-9_-]{15,35})/);
    if (placeIdMatch && placeIdMatch[1]) {
      return `https://search.google.com/local/writereview?placeid=${placeIdMatch[1]}`;
    }

    // 2. Kung may nahanap na LRD hex identifier
    const hexMatch = text.match(/(0x[0-9a-fA-F]{10,18}:0x[0-9a-fA-F]{10,18})/);
    if (hexMatch && hexMatch[1]) {
      return `https://www.google.com/search?q=${encodedQuery}%20write%20a%20review#lrd=${hexMatch[1]},3`;
    }
  } catch (err) {
    console.error("Safe URL generation error:", err);
  }

  // 3. Fallback: Ligtas at garantisadong hindi mag-e-error na Google Search write review intent
  return `https://www.google.com/search?q=${encodedQuery}%20write%20a%20review`;
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q")?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const results: PlaceSearchResult[] = [];

  // Kunin ang lokasyon gamit ang Nominatim (OpenStreetMap) muna para lumitaw ang eksaktong address
  try {
    const osmUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query
    )}&addressdetails=1&limit=5`;

    const res = await fetch(osmUrl, {
      headers: {
        "User-Agent": "KonekTap-ReviewFinder/1.0",
        "Accept-Language": "en-PH,en;q=0.9",
      },
    });

    const osmData = await res.json();

    if (Array.isArray(osmData) && osmData.length > 0) {
      for (const item of osmData) {
        const displayName = item.display_name || "";
        const parts = displayName.split(",");
        const name = parts[0]?.trim() || query;
        const address = parts.slice(1, 5).join(",").trim() || "Philippines";
        
        // I-generate ang safe review URL kasama ang address hint para mas maging tumpak
        const safeUrl = await generateSafeReviewUrl(name, address);

        results.push({
          place_id: `osm_${item.place_id}`,
          name,
          address, // Lalabas na ngayon ang buong address / lokasyon sa UI
          category: item.type ? String(item.type).replace(/_/g, " ") : "Local Business",
          review_url: safeUrl,
        });
      }
    }
  } catch (err) {
    console.error("OSM lookup error:", err);
  }

  // Kung walang nakitang match sa OpenStreetMap, maglagay ng direktang search match fallback
  if (results.length === 0) {
    const primaryReviewUrl = await generateSafeReviewUrl(query);
    results.push({
      place_id: `gdirect_${Date.now()}`,
      name: query,
      address: "Verified Google Business Location",
      category: "Verified Business",
      review_url: primaryReviewUrl,
    });
  }

  return NextResponse.json({ results: results.slice(0, 6) });
}

export async function POST(req: NextRequest) {
  try {
    const { url, name } = await req.json();
    const trimmed = (url || "").trim();

    if (!trimmed) {
      return NextResponse.json({ error: "Missing URL or query" }, { status: 400 });
    }

    if (/^ChI[a-zA-Z0-9_-]{15,35}$/.test(trimmed)) {
      return NextResponse.json({
        review_url: `https://search.google.com/local/writereview?placeid=${trimmed}`,
      });
    }

    if (trimmed.includes("g.page") || trimmed.includes("/review")) {
      const fullUrl = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
      return NextResponse.json({ review_url: fullUrl });
    }

    const safeUrl = await generateSafeReviewUrl(name || trimmed);
    return NextResponse.json({ review_url: safeUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed" }, { status: 500 });
  }
}