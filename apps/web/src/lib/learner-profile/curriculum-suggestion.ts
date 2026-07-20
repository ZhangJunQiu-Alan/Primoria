import type { SuggestedCurriculumRegion } from "./education-context";

export function suggestedCurriculumRegion(headers: Pick<Headers, "get">): SuggestedCurriculumRegion {
  const country = (headers.get("cf-ipcountry") ?? headers.get("x-vercel-ip-country") ?? "").toUpperCase();
  if (country === "CN") return "mainland_china";
  if (country === "SG") return "singapore";

  const languages = headers.get("accept-language")?.toLowerCase() ?? "";
  if (/\b(?:zh|en)-sg\b/u.test(languages)) return "singapore";
  if (/\bzh-cn\b/u.test(languages)) return "mainland_china";
  return "international";
}

export async function getSuggestedCurriculumRegion(): Promise<SuggestedCurriculumRegion> {
  try {
    const { headers } = await import("next/headers");
    return suggestedCurriculumRegion(await headers());
  } catch {
    return "international";
  }
}
