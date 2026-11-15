const COUNTRY_CODES = {
  India:"IN",Japan:"JP",Brazil:"BR","United States":"US","United Kingdom":"GB",
  Canada:"CA",Kenya:"KE","Other / prefer not to say":"OT"
};
export const isSupabaseConfigured = true;
export const supabase = null;

export async function submitStory(payload) {
  const body = {
    body: String(payload.story || "").trim(),
    country: payload.country || "Not shared",
    country_code: COUNTRY_CODES[payload.country] || "OT",
    theme: payload.theme || "Kindness",
    consent: true
  };
  const response = await fetch("/api/submit-story", {
    method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)
  });
  const data = await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(data.error || "Could not submit story.");
  return data;
}

export async function translateStory() {
  throw new Error("Automatic translation is not enabled in the Render PostgreSQL migration yet.");
}
