const BASE_URL =
  "https://yawrhzry16j0fw1-adtgsw3okapc1zpw.adb.me-dubai-1.oraclecloudapps.com/ords/aly_sandbox/credit_notify_api";

export const fetchClientRequests = async () => {
  const res = await fetch(`${BASE_URL}/requests/`);
  if (!res.ok) {
    throw new Error("Failed to fetch client requests");
  }

  const data = await res.json();
  return data.items;
};

// ✅ Updated to safely handle 200 OK with or without JSON
export async function approveRequest(requestId: string) {
  const url = `${BASE_URL}/approve/?request_id=${requestId}`;
  const res = await fetch(url, { method: "POST" });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("❌ Approval failed:", errorText);
    throw new Error("Approval failed");
  }

  try {
    return await res.json();
  } catch (err) {
    console.warn("⚠️ Approve succeeded but no JSON returned.");
    return {}; // fallback
  }
}

export async function rejectRequest(requestId: string, comment: string) {
  const url = `${BASE_URL}/reject/?request_id=${requestId}&rejection_comment=${encodeURIComponent(
    comment
  )}`;
  const res = await fetch(url, { method: "POST" });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("❌ Rejection failed:", errorText);
    throw new Error("Rejection failed");
  }

  try {
    return await res.json();
  } catch (err) {
    console.warn("⚠️ Reject succeeded but no JSON returned.");
    return {}; // fallback
  }
}
