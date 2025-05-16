import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Ionicons } from "@expo/vector-icons";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { fetchClientRequests } from "@/utils/api";
import Toast from "react-native-toast-message";
import { useFocusEffect } from "@react-navigation/native";
import * as ScreenOrientation from "expo-screen-orientation";
import { useWindowDimensions } from "react-native";

type Log = {
  reason: string;
  companyCode: string;
  departmentName: string;
  id: string;
  clientName: string;
  requestedAmount: number;
  currentBalance: number;
  status: "Approved" | "Rejected" | "Pending";
  timestamp: string;
  decisionTime: string;
  rejectionNote: string;
  approver: string;
};

export default function DashboardScreen() {
  const insets = useSafeAreaInsets(); 
  const [logs, setLogs] = useState<Log[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const { width } = useWindowDimensions();
  const isLandscape = width > 700;
  const columnWidth = isLandscape ? 160 : 130;

  const loadLogs = async () => {
    try {
      const response = await fetchClientRequests();
      const filtered = response.filter(
        (item: any) =>
          item.status?.toLowerCase() === "approved" ||
          item.status?.toLowerCase() === "rejected"
      );
      const formatted: Log[] = filtered.map((item: any) => ({
        id: item.request_id.toString(),
        clientName: item.company_name.trim(),
        requestedAmount: item.credit_amount,
        currentBalance: 0,
        status: capitalize(item.status),
        timestamp: item.requested_at,
        decisionTime: item.decision_time || "",
        approver: item.approver || "",
        rejectionNote: item.rejection_comment || "",
        departmentName: item.department_name || "N/A",
        companyCode: item.company_code || "N/A",
        reason: item.reason || "",
      }));
      setLogs(
        formatted.sort(
          (a, b) =>
            new Date(b.decisionTime).getTime() -
            new Date(a.decisionTime).getTime()
        )
      );
    } catch {
      Toast.show({ type: "error", text1: "Failed to load logs." });
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadLogs();
    }, [])
  );

  useEffect(() => {
    // Allow both landscape and portrait for this screen
    ScreenOrientation.unlockAsync();

    return () => {
      // Lock back to portrait when leaving
      ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP
      );
    };
  }, []);

  const capitalize = (text: string | undefined | null) =>
    text ? text.charAt(0).toUpperCase() + text.slice(1).toLowerCase() : "";

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const logDate = new Date(log.decisionTime).toDateString(); // ✅ uses decision date
      const effectiveDate = selectedDate || new Date(); // ✅ use today's date if none selected
      return logDate === effectiveDate.toDateString();
    });
  }, [logs, selectedDate]);

  const handleExportPDF = async () => {
    const formattedDate = selectedDate
      ? new Date(selectedDate).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      : "All Dates";

    const html = `
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
            }
            h1 {
              text-align: center;
              color: #1E1E4B;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
              font-size: 12px;
            }
            th, td {
              border: 1px solid #ccc;
              padding: 6px 8px;
              text-align: left;
              vertical-align: top;
            }
            th {
              background-color: #F0F4F8;
              color: #1E1E4B;
              font-weight: bold;
            }
            tr:nth-child(even) {
              background-color: #FAFAFA;
            }
            .placeholder {
              color: #999;
              font-style: italic;
            }
          </style>
        </head>
        <body>
          <h1>Credit Approval Logs – ${formattedDate}</h1>
          <table>
            <thead>
              <tr>
                <th>Department</th>
                <th>Client</th>
                <th>Company Code</th>
                <th>Requested Amount</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Submitted At</th>
                <th>Decision Time</th>
                <th>Approver</th>
                <th>Rejection Note</th>
              </tr>
            </thead>
            <tbody>
              ${filteredLogs
                .map((log) => {
                  const submittedAt = new Date(log.timestamp).toLocaleString(
                    "en-GB",
                    {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    }
                  );

                  const decisionAt = log.decisionTime
                    ? new Date(log.decisionTime).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })
                    : `<span class="placeholder">–</span>`;

                  return `
                    <tr>
                      <td>${
                        log.departmentName ||
                        '<span class="placeholder">–</span>'
                      }</td>
                      <td>${log.clientName}</td>
                      <td>${
                        log.companyCode || '<span class="placeholder">–</span>'
                      }</td>
                      <td>AED ${log.requestedAmount.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                      })}</td>
                      <td>${
                        log.reason || '<span class="placeholder">–</span>'
                      }</td>
                      <td>${log.status}</td>
                      <td>${submittedAt}</td>
                      <td>${decisionAt}</td>
                      <td>${
                        log.approver || '<span class="placeholder">–</span>'
                      }</td>
                      <td>${
                        log.rejectionNote ||
                        '<span class="placeholder">–</span>'
                      }</td>
                    </tr>
                  `;
                })
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
      //fileName: `credit_logs_${selectedDate?.toISOString().split("T")[0] || "all"}`
    });
    await Sharing.shareAsync(uri);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.container, { paddingTop: insets.top - 35 }]}>
        {/* Header Row */}
        <View style={styles.topBar}>
          <Text style={styles.header}>Dashboard</Text>
          <TouchableOpacity onPress={handleExportPDF}>
            <Ionicons
              name="download-outline"
              size={22}
              color="#1E1E4B"
              style={{ marginLeft: 12 }}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.dateRow}>
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            style={{ flexDirection: "row", alignItems: "center" }}
          >
            <Ionicons name="calendar-outline" size={16} color="#1E1E4B" />
            <Text style={[styles.dateFilterText, { marginLeft: 4 }]}>
              {selectedDate
                ? selectedDate.toLocaleDateString()
                : new Date().toLocaleDateString()}
            </Text>
          </TouchableOpacity>
        </View>

        {selectedDate && (
          <TouchableOpacity
            onPress={() => setSelectedDate(null)}
            style={{ marginBottom: 10 }}
          >
            <Text
              style={{
                textAlign: "center",
                fontSize: 13,
                color: "#999",
                textDecorationLine: "underline",
              }}
            >
              Clear Date Filter
            </Text>
          </TouchableOpacity>
        )}

        {showDatePicker &&
          (Platform.OS === "ios" ? (
            <Modal
              transparent
              animationType="fade"
              onRequestClose={() => setShowDatePicker(false)}
            >
              <TouchableOpacity
                activeOpacity={1}
                onPressOut={() => setShowDatePicker(false)}
                style={{
                  flex: 1,
                  justifyContent: "flex-end",
                  backgroundColor: "rgba(0, 0, 0, 0.3)",
                }}
              >
                <TouchableOpacity
                  activeOpacity={1}
                  style={{
                    backgroundColor: "#fff",
                    padding: 16,
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16,
                  }}
                >
                  <DateTimePicker
                    value={selectedDate || new Date()}
                    mode="date"
                    display="spinner"
                    onChange={(event, date) => {
                      if (date) setSelectedDate(date);
                    }}
                    themeVariant="light"
                    style={{ backgroundColor: "#fff" }}
                  />
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginTop: 12,
                    }}
                  >
                    <TouchableOpacity
                      onPress={() => setShowDatePicker(false)}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 10,
                        backgroundColor: "#ccc",
                        alignItems: "center",
                        marginRight: 8,
                      }}
                    >
                      <Text style={{ color: "#000", fontWeight: "bold" }}>
                        Cancel
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setShowDatePicker(false)}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 10,
                        backgroundColor: "#1E1E4B",
                        alignItems: "center",
                        marginLeft: 8,
                      }}
                    >
                      <Text style={{ color: "#fff", fontWeight: "bold" }}>
                        Done
                      </Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </TouchableOpacity>
            </Modal>
          ) : (
            <DateTimePicker
              value={selectedDate || new Date()}
              mode="date"
              display="default"
              onChange={(event, date) => {
                setShowDatePicker(false);
                if (date) setSelectedDate(date);
              }}
            />
          ))}

        {/* Scrollable Table */}
        <ScrollView
          contentContainerStyle={[
            //styles.scrollWrapper,
            { paddingBottom: 10 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ paddingHorizontal: 8 }}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                {[
                  "Department",
                  "Client",
                  "Company Code",
                  "Requested",
                  "Reason",
                  "Status",
                  "Submitted",
                  "Decision Time",
                  "Approver",
                  "Rejection Note",
                ].map((col) => (
                  <Text
                    key={col}
                    style={[styles.headerCell, { width: columnWidth }]}
                  >
                    {col}
                  </Text>
                ))}
              </View>

              {/* Table Rows */}
              {filteredLogs.length === 0 ? (
                <Text style={styles.noDataText}>No records found.</Text>
              ) : (
                filteredLogs.map((log, index) => (
                  <View
                    key={log.id}
                    style={[
                      styles.tableRow,
                      {
                        backgroundColor: index % 2 === 0 ? "#fff" : "#F9FAFB",
                      },
                    ]}
                  >
                    <Text style={[styles.cell, { width: columnWidth }]}>
                      {log.departmentName}
                    </Text>
                    <Text
                      style={[styles.cell, { width: columnWidth }]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {log.clientName}
                    </Text>
                    <Text style={[styles.cell, { width: columnWidth }]}>
                      {log.companyCode}
                    </Text>
                    <Text style={[styles.cell, { width: columnWidth }]}>
                      AED {log.requestedAmount.toFixed(2)}
                    </Text>
                    <Text style={[styles.cell, { width: columnWidth }]}>
                      {log.reason || "-"}
                    </Text>
                    <Text
                      style={[
                        styles.cell,
                        {
                          color:
                            log.status === "Approved"
                              ? "#2E7D32"
                              : log.status === "Rejected"
                              ? "#C62828"
                              : "#F5A623",
                        },
                      ]}
                    >
                      {log.status}
                    </Text>
                    <Text style={[styles.cell, { width: columnWidth }]}>
                      {new Date(log.timestamp).toLocaleString("en-GB")}
                    </Text>
                    <Text style={[styles.cell, { width: columnWidth }]}>
                      {log.decisionTime
                        ? new Date(log.decisionTime).toLocaleString("en-GB")
                        : "-"}
                    </Text>
                    <Text style={[styles.cell, { width: columnWidth }]}>
                      {log.approver || "-"}
                    </Text>
                    <Text style={[styles.cell, { width: columnWidth }]}>
                      {log.rejectionNote || "-"}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
    marginTop: 10,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1E1E4B",
    paddingBottom: 8,
  },
  dateRow: {
    marginTop: 6,
    marginBottom: 12,
  },
  dateFilterText: {
    color: "#1E1E4B",
    fontWeight: "bold",
    fontSize: 13,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F0F4F8",
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderBottomWidth: 1,
    borderColor: "#E0E0E0", // 👈 new
  },
  headerCell: {
    fontWeight: "bold",
    fontSize: 13,
    paddingHorizontal: 6,
    color: "#1E1E4B",
  },
  tableRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  cell: {
    width: 130,
    fontSize: 13,
    paddingHorizontal: 6,
    color: "#1F2937",
  },
  noDataText: {
    padding: 20,
    fontStyle: "italic",
    color: "#6B7280",
  },
  // scrollWrapper: {
  //   paddingBottom: 150, // 👈 ensures content doesn't get covered
  // },
});
