import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Modal,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import {
  fetchClientRequests,
  approveRequest,
  rejectRequest,
} from "@/utils/api";

type Client = {
  id: string;
  clientName: string;
  currentBalance: number;
  requestedAmount: number;
  status: "Pending" | "Approved" | "Rejected";
  timestamp: string;
  rejectionNote?: string;
};

export default function DashboardScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedAction, setSelectedAction] = useState<
    "accept" | "reject" | ""
  >("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [rejectionNote, setRejectionNote] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const loadClients = async () => {
    try {
      const response = await fetchClientRequests();
      const formatted: Client[] = response
        .filter((item: any) => item.status === "PENDING")
        .map((item: any) => ({
          id: item.request_id.toString(),
          clientName: item.company_name,
          currentBalance: 0,
          requestedAmount: item.credit_amount,
          status: capitalize(item.status),
          timestamp: item.requested_at,
          rejectionNote: item.rejection_comment || "",
        }));
      setClients(formatted);
    } catch (e) {
      Toast.show({ type: "error", text1: "Failed to load requests." });
    }
  };

  useEffect(() => {
    loadClients();
    const interval = setInterval(loadClients, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (showConfirm) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [showConfirm]);

  const handleConfirmAction = async () => {
    if (!selectedClient) return;

    try {
      if (selectedAction === "accept") {
        await approveRequest(selectedClient.id);
      } else if (selectedAction === "reject") {
        await rejectRequest(
          selectedClient.id,
          rejectionNote.trim() || "No comment"
        );
      }

      setClients((prev) =>
        prev.map((client) =>
          client.id === selectedClient.id
            ? {
                ...client,
                status: selectedAction === "accept" ? "Approved" : "Rejected",
                rejectionNote:
                  selectedAction === "reject" && rejectionNote.trim()
                    ? rejectionNote.trim()
                    : undefined,
              }
            : client
        )
      );

      Toast.show({
        type: "success",
        text1: `Request ${
          selectedAction === "accept" ? "approved" : "rejected"
        } successfully!`,
      });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: `Failed to ${selectedAction} request.`,
      });
    }

    setShowConfirm(false);
    setSelectedClient(null);
    setSelectedAction("");
    setRejectionNote("");
  };

  const isSameDate = (d1: string, d2: Date) =>
    new Date(d1).toDateString() === new Date(d2).toDateString();

  const filteredData = clients.filter((item) => {
    const matchesSearch = item.clientName
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesDate = selectedDate
      ? isSameDate(item.timestamp, selectedDate)
      : true;
    return matchesSearch && item.status === "Pending" && matchesDate;
  });

  const filteredSummaryClients = useMemo(() => {
    return selectedDate
      ? clients.filter((c) => isSameDate(c.timestamp, selectedDate))
      : clients;
  }, [clients, selectedDate]);

  const totalIncreasedAmount = useMemo(() => {
    return filteredSummaryClients
      .filter((c) => c.status === "Approved")
      .reduce((sum, c) => sum + c.requestedAmount, 0);
  }, [filteredSummaryClients]);

  const totalApproved = useMemo(() => {
    return filteredSummaryClients.filter((c) => c.status === "Approved").length;
  }, [filteredSummaryClients]);

  const totalRejected = useMemo(() => {
    return filteredSummaryClients.filter((c) => c.status === "Rejected").length;
  }, [filteredSummaryClients]);

  const renderItem = ({ item }: { item: Client }) => (
    <View style={styles.card}>
      <TouchableOpacity
        onPress={() =>
          router.push({
            pathname: "/request-detail-screen",
            params: {
              clientName: item.clientName,
              currentBalance: item.currentBalance.toString(),
              requestedAmount: item.requestedAmount.toString(),
              status: item.status,
              timestamp: item.timestamp,
              rejectionNote: item.rejectionNote || "",
            },
          })
        }
      >
        <Text style={styles.clientName}>{item.clientName}</Text>
        <Text style={styles.label}>Requested Amount:</Text>
        <Text style={styles.value}>AED {item.requestedAmount}</Text>
      </TouchableOpacity>

      <View style={styles.statusRow}>
        <Text style={[styles.status, styles.pending]}>{item.status}</Text>
        <Text style={styles.timestamp}>Submitted: {item.timestamp}</Text>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: "#28A745" }]}
            onPress={() => {
              setSelectedAction("accept");
              setSelectedClient(item);
              setShowConfirm(true);
            }}
          >
            <Ionicons name="checkmark" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: "#DC3545" }]}
            onPress={() => {
              setSelectedAction("reject");
              setSelectedClient(item);
              setShowConfirm(true);
            }}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar hidden />
      {/* Confirm Modal */}
      <Modal
        transparent
        animationType="fade"
        visible={showConfirm}
        onRequestClose={() => setShowConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <Text style={styles.confirmText}>
              Are you sure you want to{" "}
              {selectedAction === "accept" ? "approve" : "reject"} the request
              for {selectedClient?.clientName}?
            </Text>
            {selectedAction === "reject" && (
              <TextInput
                placeholder="Optional: reason for rejection"
                placeholderTextColor="#999"
                style={styles.rejectionInput}
                value={rejectionNote}
                onChangeText={setRejectionNote}
                multiline
              />
            )}
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: "#28A745" }]}
                onPress={handleConfirmAction}
              >
                <Text style={{ color: "#fff", fontWeight: "bold" }}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: "#DC3545" }]}
                onPress={() => {
                  setShowConfirm(false);
                  setSelectedClient(null);
                  setSelectedAction("");
                  setRejectionNote("");
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "bold" }}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Filter */}
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
          value={new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (date) setSelectedDate(date);
          }}
        />
      )}

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Total Increased</Text>
          <Text style={styles.summaryValue}>AED {totalIncreasedAmount}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Approved</Text>
          <Text style={styles.summaryValue}>{totalApproved}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Rejected</Text>
          <Text style={styles.summaryValue}>{totalRejected}</Text>
        </View>
      </View>

      <TextInput
        placeholder="Search by client name..."
        placeholderTextColor="#aaa"
        style={styles.searchInput}
        value={search}
        onChangeText={setSearch}
      />

      {filteredData.length > 0 && (
        <Text style={styles.sectionTitle}>Pending Requests</Text>
      )}

      <FlatList
        data={filteredData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
      />

      <Toast />
    </SafeAreaView>
  );
}

const capitalize = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();

// styles stay unchanged unless you need help cleaning them up too

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1E1E4B",
    paddingHorizontal: 16,
    paddingTop: 42,
  },
  summaryContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 12,
  },
  summaryCard: {
    flexBasis: "30%",
    minWidth: 100,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 14,
    color: "#1E1E4B",
    fontWeight: "600",
    marginBottom: 6,
    textAlign: "center",
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1E1E4B",
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
  searchInput: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "bold",
    marginBottom: 12,
    marginTop: 4,
  },
  listContainer: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  clientName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1E1E4B",
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: "#888",
  },
  value: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  status: {
    fontSize: 16,
    fontWeight: "bold",
    flex: 1,
  },
  timestamp: {
    fontSize: 12,
    color: "#666",
    flex: 1,
    textAlign: "right",
  },
  pending: {
    color: "#F5A623",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    marginTop: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between", // or 'center'
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  confirmModal: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    marginHorizontal: 16,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 8,
  },
  confirmText: {
    fontSize: 16,
    color: "#1E1E4B",
    textAlign: "center",
    marginBottom: 16,
  },
  rejectionInput: {
    backgroundColor: "#f2f2f2",
    padding: 10,
    borderRadius: 8,
    fontSize: 14,
    color: "#1E1E4B",
    marginBottom: 12,
    textAlignVertical: "top",
    minHeight: 60,
  },
  confirmActions: {
    flexDirection: "row",
    justifyContent: "space-evenly",
  },
  confirmBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
});
