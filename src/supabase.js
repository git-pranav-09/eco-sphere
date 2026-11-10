import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey && !url.includes("YOUR_PROJECT"));
export const supabase = isSupabaseConfigured ? createClient(url, anonKey) : null;

export async function submitStory(payload) {
  if (!supabase) throw new Error("Connect Supabase first. Follow SETUP.md.");
  const { data, error } = await supabase.functions.invoke("story-ai", {
    body: { action: "submit", ...payload }
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function translateStory(text, targetLanguage) {
  if (!supabase) throw new Error("AI translation needs the Supabase connection.");
  const { data, error } = await supabase.functions.invoke("story-ai", {
    body: { action: "translate", text, targetLanguage }
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.translation;
}
