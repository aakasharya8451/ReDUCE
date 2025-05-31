// Helper: Fetch HEAD data
async function fetchHeadData(url, id) {
  try {
    const response = await fetch(url, { method: "HEAD" });
    const headers = {};
    response.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });
    console.log(`[DownloadUtils] HEAD fetched for download ${id}`);
    return headers;
  } catch (error) {
    console.error(`[DownloadUtils] Failed to fetch HEAD for ${url}:`, error);
    return {};
  }
}

// Helper: Extract domain
function extractDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "unknown-domain";
  }
}

// Helper: Compute partial hash
async function computePartialHash(url, totalBytes) {
  const MB = 1024 * 1024;
  let downloadSize = null;

  if (totalBytes >= 10 * MB && totalBytes < 25 * MB) downloadSize = 2.5 * MB;
  else if (totalBytes >= 25 * MB && totalBytes < 50 * MB) downloadSize = 5 * MB;
  else if (totalBytes >= 50 * MB) downloadSize = 10 * MB;

  if (!downloadSize) {
    console.log("[DownloadUtils] Partial hashing skipped (small file)");
    return null;
  }

  try {
    const response = await fetch(url, {
      headers: { Range: `bytes=0-${downloadSize - 1}` },
    });
    if (!response.ok) throw new Error("Range request not supported");

    const buffer = await response.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch (error) {
    console.error("[DownloadUtils] Failed partial hashing:", error);
    return null;
  }
}

export { fetchHeadData, extractDomain, computePartialHash };
