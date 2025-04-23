import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import DateTimePicker from "@react-native-community/datetimepicker";
import { fetchClientRequests } from "@/utils/api";
import Toast from "react-native-toast-message";

const statuses = ["All", "Approved", "Rejected"];

type Log = {
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

export default function HistoryScreen() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [filter, setFilter] = useState("All");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [search, setSearch] = useState("");
  const router = useRouter();

  useEffect(() => {
    const getLogs = async () => {
      try {
        const response = await fetchClientRequests();

        const filteredResponse = response.filter(
          (item: any) =>
            item.status?.toLowerCase() === "approved" ||
            item.status?.toLowerCase() === "rejected"
        );

        const formatted: Log[] = filteredResponse.map((item: any) => ({
          id: item.request_id.toString(),
          clientName: item.company_name,
          requestedAmount: item.credit_amount,
          currentBalance: 0, // Optional if not provided
          status: capitalize(item.status),
          timestamp: item.requested_at,
          decisionTime: item.decision_time || "",
          approver: item.approver || "",
          rejectionNote: item.rejection_comment || "",
        }));

        setLogs(
          formatted.sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          )
        );
        
      } catch (e) {
        Toast.show({ type: "error", text1: "Failed to load history logs." });
      }
    };

    getLogs();
  }, []);

  const capitalize = (text: string | undefined | null) =>
    text ? text.charAt(0).toUpperCase() + text.slice(1).toLowerCase() : "";

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = log.clientName
      .toLowerCase()
      .includes(search.toLowerCase());
    const statusMatch = filter === "All" || log.status === filter;
    const dateMatch = selectedDate
      ? new Date(log.timestamp).toDateString() ===
        new Date(selectedDate).toDateString()
      : true;
    return matchesSearch && statusMatch && dateMatch;
  });

  const handleExportPDF = async () => {
    const html = `
      <html>
        <body>
          <h1>Credit Approval Logs</h1>
          <table border="1" cellspacing="0" cellpadding="6" style="width:100%; font-family:Arial;">
            <tr>
              <th>Client</th>
              <th>Requested</th>
              <th>Balance</th>
              <th>Status</th>
              <th>Submitted</th>
              <th>Decision Time</th>
              <th>Approver</th>
              <th>Rejection Note</th>
            </tr>
            ${filteredLogs
              .map(
                (log) => `
                  <tr>
                    <td>${log.clientName}</td>
                    <td>AED ${log.requestedAmount.toLocaleString("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}</td>
<td>AED ${log.currentBalance.toLocaleString("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}</td>

                    <td>${log.status}</td>
                    <td>${log.timestamp}</td>
                    <td>${log.decisionTime || "-"}</td>
                    <td>${log.approver || "-"}</td>
                    <td>${log.rejectionNote || "-"}</td>
                  </tr>
                `
              )
              .join("")}
          </table>
        </body>
      </html>
    `;
    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri);
  };
  // type Log = (typeof dummyLogs)[0];

  const renderItem = ({ item }: { item: Log }) => (
    <TouchableOpacity
      onPress={() =>
        router.push({
          pathname: "/request-detail-screen",
          params: {
            clientName: item.clientName,
            requestedAmount: item.requestedAmount,
            status: item.status,
            timestamp: item.timestamp,
            decisionTime: item.decisionTime,
            rejectionNote: item.rejectionNote,
            currentBalance: item.currentBalance,
            approver: item.approver,
          },
        })
      }
      style={styles.card}
      activeOpacity={0.85}
    >
      <View style={styles.cardTopRow}>
        <View>
          <Text style={styles.clientName}>{item.clientName}</Text>
          <Text style={styles.label}>
  Requested: AED {item.requestedAmount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}
</Text>

          <Text
            style={[
              styles.label,
              item.status === "Approved"
                ? styles.approved
                : item.status === "Rejected"
                ? styles.rejected
                : styles.pending,
            ]}
          >
            Status: {item.status}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.header}>Activity Logs</Text>
        <TouchableOpacity onPress={handleExportPDF}>
          <Ionicons name="download-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <TextInput
        placeholder="Search by client name..."
        placeholderTextColor="#aaa"
        style={styles.searchInput}
        value={search}
        onChangeText={setSearch}
      />

      <View style={styles.filtersContainer}>
        {statuses.map((status) => (
          <TouchableOpacity
            key={status}
            onPress={() => setFilter(status)}
            style={[
              styles.filterButton,
              filter === status && styles.activeFilter,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                filter === status && styles.activeFilterText,
              ]}
            >
              {status}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ alignItems: "center", marginBottom: 10 }}>
        <TouchableOpacity
          onPress={() => setShowDatePicker(true)}
          style={styles.dateFilterButton}
        >
          <Ionicons name="calendar-outline" size={16} color="#1E1E4B" />
          <Text style={styles.dateFilterText}>
            {selectedDate
              ? ` ${selectedDate.toLocaleDateString()}`
              : " Filter by Date"}
          </Text>
        </TouchableOpacity>

        {selectedDate && (
          <TouchableOpacity
            onPress={() => setSelectedDate(null)}
            style={{ marginTop: 4 }}
          >
            <Text style={{ color: "#aaa", fontSize: 12 }}>
              Clear Date Filter
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={selectedDate || new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (date) setSelectedDate(date);
          }}
        />
      )}

      <FlatList
        data={filteredLogs}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1E1E4B",
    paddingHorizontal: 16,
  },
  topBar: {
    marginTop: 30,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
  },
  searchInput: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 12,
  },
  filtersContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 12,
    flexWrap: "wrap",
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#3D3D6B",
    margin: 4,
  },
  filterText: {
    color: "#aaa",
    fontSize: 14,
  },
  activeFilter: {
    backgroundColor: "#fff",
  },
  activeFilterText: {
    color: "#1E1E4B",
    fontWeight: "bold",
  },
  dateFilterButton: {
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  dateFilterText: {
    color: "#1E1E4B",
    fontWeight: "bold",
    marginLeft: 6,
  },
  listContainer: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  clientName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1E1E4B",
  },
  label: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  approved: {
    color: "#27AE60",
  },
  rejected: {
    color: "#E74C3C",
  },
  pending: {
    color: "#F5A623",
  },
  viewIconButton: {
    padding: 8,
    backgroundColor: "#eee",
    borderRadius: 50,
  },
});