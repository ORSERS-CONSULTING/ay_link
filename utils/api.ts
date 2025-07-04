import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

const token = Constants.expoConfig?.extra?.API_SECRET;

const BASE_URL =
  "https://gv4andgjujwej5rfjwo2fpdunq.apigateway.me-dubai-1.oci.customer-oci.com/creditapproval";

console.log("🔐 API TOKEN AT RUNTIME:", token);
console.log("🌐 BASE_URL AT RUNTIME:", BASE_URL);

export const fetchClientRequests = async () => {
  //console.log(token, "token");
  const res = await fetch(`${BASE_URL}/requests`, {
    headers: {
      "X-Api-Key": `${token}`,
    },
  });
  if (!res.ok) {
    throw new Error("Failed to fetch client requests");
  }

  const data = await res.json();

  return data.items.map((item: any) => ({
    ...item,
    clientName: item.clientName?.trim(),
    companyCode: item.companyCode?.trim(),
    departmentName: item.departmentName?.trim(),
    status: item.status?.trim(),
    approver: item.approver?.trim(),
  }));
};

export const fetchClientRequests2 = async (datefil: string) => {
  //console.log(token, "token");
  const res = await fetch(`${BASE_URL}/filteredrequests`, {
    headers: {
      "X-Api-Key": `${token}`,
    },
  });
  if (!res.ok) {
    throw new Error("Failed to fetch client requests");
  }

  const data = await res.json();

  return data.items.map((item: any) => ({
    ...item,
    clientName: item.clientName?.trim(),
    companyCode: item.companyCode?.trim(),
    departmentName: item.departmentName?.trim(),
    status: item.status?.trim(),
    approver: item.approver?.trim(),
  }));
};

// ✅ Updated to safely handle 200 OK with or without JSON

export async function approveRequest(requestId: string) {
  const approver = await AsyncStorage.getItem("email");
  const url = `${BASE_URL}/approve?request_id=${requestId}&approver_name=${encodeURIComponent(
    approver || "unknown"
  )}`;

  console.log("📤 Sending APPROVE:", { requestId, url });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "X-Api-Key": `${token}`,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("❌ Approval failed:", errorText);
    throw new Error("Approval failed");
  }

  try {
    return await res.json();
  } catch (err) {
    console.warn("⚠️ Approve succeeded but no JSON returned.");
    return {};
  }
}

export async function rejectRequest(requestId: string, comment: string) {
  const approver = await AsyncStorage.getItem("email");
  const url = `${BASE_URL}/reject?request_id=${requestId}&rejection_comment=${encodeURIComponent(
    comment
  )}&approver_name=${encodeURIComponent(approver || "unknown")}`;
  console.log("📤 Sending REJECT:", { requestId, url });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "X-Api-Key": `${token}`,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("❌ Rejection failed:", errorText);
    throw new Error("Rejection failed");
  }

  try {
    return await res.json();
  } catch (err) {
    console.warn("⚠️ Reject succeeded but no JSON returned.");
    return {};
  }
}

export async function sendBackRequest(requestId: string, remarks: string) {
  const url = `${BASE_URL}/sendBack?request_id=${requestId}&returned_remarks=${encodeURIComponent(
    remarks
  )}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "X-Api-Key": `${token}`,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("❌ Send back failed:", errorText);
    throw new Error("Send back failed");
  }

  try {
    return await res.json();
  } catch (err) {
    console.warn("⚠️ Send back succeeded but no JSON returned.");
    return {}; // fallback
  }
}

export async function fetchTransactionStats(companyCode: string) {
  const url = `${BASE_URL}/transactionnumber?company_code=${companyCode}`;

  const res = await fetch(url, {
    headers: {
      "X-Api-Key": `${token}`,
    },
  });
  if (!res.ok) throw new Error("Failed to fetch transaction stats");

  const data = await res.json();
  console.log("📥 Fetching transaction stats:", data);

  return data.items?.[0] ?? { invoice_count: 0, transaction_count: 0 };
}

export async function loginUser(username: string, password: string) {
  try {
    const res = await fetch(
      `${BASE_URL}/userAuthentication?password=${password}&username=${username}`,
      {
        method: "POST",
        headers: {
          "X-Api-Key": `${token}`,
        },
      }
    );

    const data = await res.json();

    if (data.success === true) {
      return { success: true, message: data.message || "Login successful" };
    } else {
      return { success: false, message: data.message || "Invalid credentials" };
    }
  } catch (error) {
    console.error("❌ Login error:", error);
    return { success: false, message: "Something went wrong. Try again." };
  }
}
