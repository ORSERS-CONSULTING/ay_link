import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  StatusBar,
  Platform,
  Modal,
  Animated,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { useRouter } from "expo-router";
import { StyleSheet } from "react-native";
import { useNotification } from "@/context/NotificationContext";

type Client = {
  id: string;
  clientName: string;
  currentBalance: number;
  requestedAmount: number;
  status: "Pending" | "Approved" | "Rejected";
  timestamp: string;
  rejectionNote?: string;
};

const initialData: Client[] = [
  {
    id: "1",
    clientName: "Client A",
    currentBalance: 1000,
    requestedAmount: 500,
    status: "Pending",
    timestamp: "2025-04-07 10:00",
  },
  {
    id: "2",
    clientName: "Client B",
    currentBalance: 1500,
    requestedAmount: 700,
    status: "Approved",
    timestamp: "2025-04-06 14:30",
  },
  {
    id: "3",
    clientName: "Client C",
    currentBalance: 200,
    requestedAmount: 1000,
    status: "Rejected",
    timestamp: "2025-04-05 09:15",
  },
];

export default function DashboardScreen() {
  const router = useRouter();
  const { expoPushToken, notification } = useNotification(); // ✅ added
  const [search, setSearch] = useState("");
  const [clients, setClients] = useState(initialData);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedAction, setSelectedAction] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [rejectionNote, setRejectionNote] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

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

  const isSameDate = (d1: string, d2: Date) =>
    new Date(d1).toDateString() === new Date(d2).toDateString();

  const filteredData = clients.filter((item) => {
    const matchesSearch = item.clientName
      .toLowerCase()
      .includes(search.toLowerCase());
    const isPending = item.status === "Pending";
    const matchesDate = selectedDate
      ? isSameDate(item.timestamp, selectedDate)
      : true;
    return matchesSearch && isPending && matchesDate;
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
              currentBalance: item.currentBalance,
              requestedAmount: item.requestedAmount,
              status: item.status,
              timestamp: item.timestamp,
              rejectionNote: item.rejectionNote || "",
            },
          })
        }
      >
        <Text style={styles.clientName}>{item.clientName}</Text>
        <Text style={styles.label}>Current Balance:</Text>
        <Text style={styles.value}>AED {item.currentBalance}</Text>
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

      {/* ✅ Push Notification Info */}
      <View
        style={{
          backgroundColor: "#fff",
          padding: 12,
          borderRadius: 10,
          marginBottom: 16,
        }}
      >
        <Text style={{ fontWeight: "bold", fontSize: 16 }}>
          Expo Push Token:
        </Text>
        <Text selectable style={{ fontSize: 12, color: "#555" }}>
          {expoPushToken ?? "Not available"}
        </Text>

        {notification && (
          <>
            <Text style={{ fontWeight: "bold", fontSize: 16, marginTop: 10 }}>
              Latest Notification:
            </Text>
            <Text style={{ fontSize: 14, color: "#333" }}>
              {notification.request.content.title}
            </Text>
            <Text style={{ fontSize: 13, color: "#666" }}>
              {notification.request.content.body}
            </Text>
          </>
        )}
      </View>
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
                onPress={() => {
                  if (!selectedClient) return;

                  const updatedClients = clients.map((client) =>
                    client.id === selectedClient.id
                      ? {
                          ...client,
                          status: (selectedAction === "accept"
                            ? "Approved"
                            : "Rejected") as Client["status"],
                          rejectionNote:
                            selectedAction === "reject" && rejectionNote.trim()
                              ? rejectionNote.trim()
                              : undefined,
                        }
                      : client
                  );

                  setClients(updatedClients);
                  setShowConfirm(false);
                  setRejectionNote("");
                  setSelectedClient(null);
                  setSelectedAction("");
                  Toast.show({
                    type: "success",
                    text1: `Request ${
                      selectedAction === "accept" ? "approved" : "rejected"
                    } successfully!`,
                  });
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "bold" }}>Yes</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: "#DC3545" }]}
                onPress={() => {
                  setShowConfirm(false);
                  setRejectionNote("");
                  setSelectedClient(null);
                  setSelectedAction("");
                  Toast.show({
                    type: "info",
                    text1: "Action cancelled.",
                  });
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

      {/* Filter by Date */}
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

      {/* Search */}
      <TextInput
        placeholder="Search by client name..."
        placeholderTextColor="#aaa"
        style={styles.searchInput}
        value={search}
        onChangeText={setSearch}
      />

      {/* Pending Requests Section */}
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
