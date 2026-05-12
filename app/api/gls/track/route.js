// app/api/gls/track/route.js
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const rawRef = searchParams.get("ref");
  if (!rawRef) {
    return new Response(JSON.stringify({ error: "Missing ref" }), { status: 400 });
  }

  // Rens: tillad TrackID (8 tegn) eller ParcelNo (11–12 cifre)
  const match = rawRef.toUpperCase().match(/[A-Z0-9]{8}|\d{11,12}/);
  const ref = match ? match[0] : null;
  if (!ref) {
    return new Response(JSON.stringify({ error: "Invalid GLS reference" }), { status: 400 });
  }

  // 1) Hent OAuth2 token
  const tokenRes = await fetch("https://api.gls-group.net/oauth2/v1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.GLS_CLIENT_ID,
      client_secret: process.env.GLS_CLIENT_SECRET,
    }),
  });
  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) {
    return new Response(JSON.stringify(tokenData), { status: tokenRes.status });
  }
  const accessToken = tokenData.access_token;

  // 2) Kald Track And Trace V1 references endpoint
  const res = await fetch(
    `https://api.gls-group.net/track-and-trace-v1/tracking/simple/references/${encodeURIComponent(ref)}?showEvents=true`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    }
  );

  const data = await res.json();

  // 3) Tilføj fallback beskrivelser
  const parcels = (data?.parcels || []).map((p) => ({
    ...p,
    events: (p?.events || []).map((ev) => ({
      ...ev,
      description:fallbackDesc(ev.code),
    })),
  }));

  return new Response(JSON.stringify({ parcels }), { status: res.status });
}

// Fallback-lookup for kendte GLS event codes
function fallbackDesc(code) {
  const lut = {
    "INTIAL.PREADVICE": "Pakkedata modtaget – endnu ikke indleveret",
    "INTIAL.NORMAL": "Pakken er indleveret til GLS",
    "INTIAL.E48_DATA": "Pakken er meldt klar til afhentning",
    "INBOUD.NORMAL": "Pakken er ankommet til depot",
    "OUTBOD.NORMAL": "Pakken er afsendt fra depot",
    "OUTDEL.NORMAL": "Pakken er ude til levering",
    "DELIVD.PARCELSHOP": "Leveret til Pakkeshop",
    "DELIVD.DEL_BY_PSAPP": "Udleveret fra Pakkeshop via app",
    "DELIVERED": "Leveret",
  };
  return lut[code] || code;
}


