type KreditAdminApiOptions = {
  endpoint: string;
  searchParams?: URLSearchParams;
};

export async function callKreditAdminApi<T>({
  endpoint,
  searchParams,
}: KreditAdminApiOptions): Promise<T> {
  const kreditBaseUrl = process.env.KREDIT_BACKEND_URL?.trim();
  const kreditSecret = process.env.KREDIT_INTERNAL_SECRET || process.env.INTERNAL_API_KEY;

  if (!kreditBaseUrl) {
    throw new Error("KREDIT_BACKEND_URL is not configured");
  }
  if (!kreditSecret) {
    throw new Error("KREDIT_INTERNAL_SECRET or INTERNAL_API_KEY is not configured");
  }

  const normalizedBase = kreditBaseUrl.replace(/\/$/, "");
  const normalizedPath = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const qs = searchParams?.toString();
  const url = `${normalizedBase}${normalizedPath}${qs ? `?${qs}` : ""}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${kreditSecret}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const responseBody = await response.text();
  let parsed: unknown = null;
  if (responseBody) {
    try {
      parsed = JSON.parse(responseBody);
    } catch {
      parsed = responseBody;
    }
  }

  if (!response.ok) {
    const message =
      typeof parsed === "object" && parsed && "message" in parsed
        ? String((parsed as { message?: unknown }).message || "Kredit admin API request failed")
        : `Kredit admin API request failed (${response.status})`;
    throw new Error(message);
  }

  return parsed as T;
}
