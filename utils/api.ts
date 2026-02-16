import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = "http://10.0.0.124:3000/api";

/* ============================= */
/* ========= REQUESTS ========= */
/* ============================= */

export const fetchClientRequests = async () => {
  const res = await fetch(`${BASE_URL}/requests`);

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
  const res = await fetch(
    `${BASE_URL}/filteredrequests?datefil=${encodeURIComponent(datefil)}`
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

/* ============================= */
/* ========= ACTIONS ========= */
/* ============================= */

export async function approveRequest(requestId: string) {
  const approver = await AsyncStorage.getItem("email");

  const res = await fetch(
    `${BASE_URL}/approve?request_id=${requestId}&approver_name=${encodeURIComponent(
      approver || "unknown"
    )}`,
    { method: "POST" }
  );

  if (!res.ok) throw new Error("Approval failed");

  return res.json().catch(() => ({}));
}

export async function rejectRequest(
  requestId: string,
  comment: string
) {
  const approver = await AsyncStorage.getItem("email");

  const res = await fetch(
    `${BASE_URL}/reject?request_id=${requestId}&rejection_comment=${encodeURIComponent(
      comment
    )}&approver_name=${encodeURIComponent(approver || "unknown")}`,
    { method: "POST" }
  );

  if (!res.ok) throw new Error("Rejection failed");

  return res.json().catch(() => ({}));
}

export async function sendBackRequest(
  requestId: string,
  remarks: string
) {
  const res = await fetch(
    `${BASE_URL}/sendBack?request_id=${requestId}&returned_remarks=${encodeURIComponent(
      remarks
    )}`,
    { method: "POST" }
  );

  if (!res.ok) throw new Error("Send back failed");

  return res.json().catch(() => ({}));
}

/* ============================= */
/* ========= STATS ========= */
/* ============================= */

export async function fetchTransactionStats(companyCode: string) {
  const res = await fetch(
    `${BASE_URL}/transactionnumber?company_code=${companyCode}`
  );

  if (!res.ok) throw new Error("Failed to fetch transaction stats");

  const data = await res.json();

  return data.items?.[0] ?? {
    invoice_count: 0,
    transaction_count: 0,
  };
}

/* ============================= */
/* ========= LOGIN ========= */
/* ============================= */

export async function loginUser(
  username: string,
  password: string
) {
  const res = await fetch(
    `${BASE_URL}/userAuthentication`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        password,
      }),
    }
  );

  return res.json();
}
