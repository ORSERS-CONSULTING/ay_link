import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { safeFetch, saveTokens } from "@/utils/safeFetch";
import { getDeviceId } from "./device";
import * as SecureStore from "expo-secure-store";

const BACKEND_URL = Constants.expoConfig?.extra?.BACKEND_URL ?? "";
export const fetchClientRequests = async () => {
  const res = await safeFetch("/requests");

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
  const res = await safeFetch(
    `/filteredrequests?datefil=${encodeURIComponent(datefil)}`,
  );

  if (!res.ok) {
    throw new Error("Failed to fetch filtered client requests");
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

export async function approveRequest(requestId: string) {
  const approver = await AsyncStorage.getItem("email");

  const res = await safeFetch(
    `/approve2?request_id=${requestId}&approver_name=${encodeURIComponent(
      approver || "unknown",
    )}`,
    { method: "POST" },
  );

  if (!res.ok) throw new Error("Approval failed");

  return res.json().catch(() => ({}));
}

export async function rejectRequest(requestId: string, comment: string) {
  const approver = await AsyncStorage.getItem("email");

  const res = await safeFetch(
    `/reject2?request_id=${requestId}&rejection_comment=${encodeURIComponent(
      comment,
    )}&approver_name=${encodeURIComponent(approver || "unknown")}`,
    { method: "POST" },
  );

  if (!res.ok) throw new Error("Rejection failed");

  return res.json().catch(() => ({}));
}

export async function sendBackRequest(requestId: string, remarks: string) {
  const res = await safeFetch(
    `/sendBack2?request_id=${requestId}&returned_remarks=${encodeURIComponent(
      remarks,
    )}`,
    { method: "POST" },
  );

  if (!res.ok) throw new Error("Send back failed");

  return res.json().catch(() => ({}));
}

export async function fetchTransactionStats(companyCode: string) {
  const res = await safeFetch(`/transactionnumber?company_code=${companyCode}`);

  if (!res.ok) throw new Error("Failed to fetch transaction stats");

  const data = await res.json();

  return (
    data.items?.[0] ?? {
      invoice_count: 0,
      transaction_count: 0,
    }
  );
}
export async function loginUser(username: string, password: string) {
  const device_id = await getDeviceId();

  const res = await fetch(
    `${BACKEND_URL}/userAuthentication2?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ device_id }),
    }
  );

  const data = await res.json();

  // 🔹 Handle expected auth failure
  if (res.status === 401) {
    return { success: false, message: data.message || "Invalid credentials" };
  }

  // 🔹 Handle other server errors
  if (!res.ok) {
    throw new Error(data.message || "Server error");
  }

  // 🔹 Success
  await saveTokens(data.access_token, data.refresh_token);

  return { success: true, ...data };
}
