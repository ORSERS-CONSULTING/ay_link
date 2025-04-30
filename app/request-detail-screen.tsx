import { Stack, useRouter } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import React, { useEffect, useState } from "react";
import { useSelectedRequest } from "@/context/SelectedRequestContext";
import { Modal } from "react-native";
import { TextInput } from "react-native"; // if rejection note is allowed

export default function RequestDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { selectedRequest, setSelectedRequest } = useSelectedRequest();
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedAction, setSelectedAction] = useState<
    "accept" | "reject" | ""
  >("");
  const [rejectionNoteInput, setRejectionNoteInput] = useState("");

  useEffect(() => {
    return () => {
      setSelectedRequest(null);
    };
  }, [setSelectedRequest]);

  if (!selectedRequest) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Text style={{ color: "#fff", textAlign: "center", marginTop: 50 }}>
          No request selected.
        </Text>
      </SafeAreaView>
    );
  }

  const {
    clientName,
    companyCode,
    currentBalance,
    departmentName,
    requestedAmount,
    status,
    timestamp,
    decisionTime,
    approver,
    rejectionNote,
    reason,
  } = selectedRequest;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: Platform.OS === "android" ? insets.top + 4 : 0,
          paddingBottom: insets.bottom + 16,
          paddingHorizontal: 16,
        }}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        <Stack.Screen options={{ headerShown: false }} />

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.card}>
          {/* Header: Dept Badge + Status Chip */}
          <View style={styles.cardHeader}>
            <View style={styles.deptBadge}>
              <Text style={styles.deptText}>{departmentName}</Text>
            </View>
            <View
              style={[
                styles.statusChip,
                status === "Approved"
                  ? styles.chipApproved
                  : status === "Rejected"
                  ? styles.chipRejected
                  : styles.chipPending,
              ]}
            >
              <Text style={styles.chipText}>{status.toUpperCase()}</Text>
            </View>
          </View>
          <Text style={styles.clientName}>{clientName}</Text>

          <Text style={styles.label}>Company Code</Text>
          <Text style={styles.value}>{companyCode}</Text>

          <View style={styles.separator} />

          <Text style={styles.label}>Current Balance</Text>
          <Text style={styles.value}>AED {currentBalance}</Text>

          <Text style={styles.label}>Requested Amount</Text>
          <Text style={styles.value}>AED {requestedAmount}</Text>

          {reason && (
            <>
              <Text style={styles.label}>Reason for Request</Text>
              <Text style={styles.value}>{reason}</Text>
            </>
          )}

          <Text style={styles.label}>Requester</Text>
          <Text style={styles.value}>John Doe</Text>

          <Text style={styles.label}>Updated At</Text>
          <Text style={styles.value}>-</Text>

          <Text style={styles.label}>Submitted At</Text>
          <Text style={styles.value}>
            {new Date(timestamp).toLocaleString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>

          {status !== "Pending" && (
            <>
              <View style={styles.separator} />
              <Text style={styles.label}>Decision Time</Text>
              <Text style={styles.value}>
                {decisionTime
                  ? new Date(decisionTime).toLocaleString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "-"}
              </Text>

              <Text style={styles.label}>Approver</Text>
              <Text style={styles.value}>{approver || "-"}</Text>
            </>
          )}

          {status === "Rejected" && rejectionNote && (
            <>
              <View style={styles.separator} />
              <Text style={styles.label}>Rejection Note</Text>
              <Text style={styles.note}>{rejectionNote}</Text>
            </>
          )}

          <View style={styles.statusRow}>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.iconButton, { backgroundColor: "#2E7D32" }]}
                onPress={() => {
                  setSelectedAction("accept");
                  setShowConfirm(true);
                }}
              >
                <Text
                  style={{ color: "#fff", fontSize: 14, fontWeight: "bold" }}
                >
                  APPROVE
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconButton, { backgroundColor: "#C62828" }]}
                onPress={() => {
                  setSelectedAction("reject");
                  setShowConfirm(true);
                }}
              >
                <Text
                  style={{ color: "#fff", fontSize: 14, fontWeight: "bold" }}
                >
                  REJECT
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "space-between",
              marginTop: 24,
            }}
          >
            <View style={styles.summaryBox}>
              <Ionicons
                name="swap-horizontal-outline"
                size={20}
                color="#1E1E4B"
                style={{ marginBottom: 4 }}
              />
              <Text style={styles.summaryValue}>28</Text>
              <Text style={styles.summaryLabel}>Transactions</Text>
            </View>

            <View style={styles.summaryBox}>
              <Ionicons
                name="document-text-outline"
                size={20}
                color="#1E1E4B"
                style={{ marginBottom: 4 }}
              />
              <Text style={styles.summaryValue}>16</Text>
              <Text style={styles.summaryLabel}>Invoices</Text>
            </View>

            <View style={styles.summaryBox}>
              <Ionicons
                name="checkmark-done-outline"
                size={20}
                color="#1E1E4B"
                style={{ marginBottom: 4 }}
              />
              <Text style={styles.summaryValue}>19</Text>
              <Text style={styles.summaryLabel}>Approved</Text>
            </View>

            <View style={styles.summaryBox}>
              <Ionicons
                name="close-circle-outline"
                size={20}
                color="#1E1E4B"
                style={{ marginBottom: 4 }}
              />
              <Text style={styles.summaryValue}>5</Text>
              <Text style={styles.summaryLabel}>Rejected</Text>
            </View>
          </View>
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
                for {selectedRequest?.clientName}?
              </Text>

              {selectedAction === "reject" && (
                <TextInput
                  placeholder="Optional: reason for rejection"
                  placeholderTextColor="#999"
                  style={styles.rejectionNoteInput}
                  value={rejectionNote}
                  onChangeText={setRejectionNoteInput}
                  multiline
                />
              )}

              <View style={styles.confirmActions}>
                <TouchableOpacity
                  style={[
                    styles.confirmBtn,
                    {
                      backgroundColor:
                        selectedAction === "accept" ? "#2E7D32" : "#C62828",
                    },
                  ]}
                  onPress={() => {
                    // handle action
                    console.log(`${selectedAction.toUpperCase()} request`);
                    setShowConfirm(false);
                    setRejectionNoteInput("");
                    setSelectedAction("");
                  }}
                >
                  <Text style={{ color: "#fff", fontWeight: "bold" }}>
                    {selectedAction === "accept" ? "Approve" : "Reject"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.confirmBtn, { backgroundColor: "#999999" }]}
                  onPress={() => {
                    setShowConfirm(false);
                    setSelectedAction("");
                    setRejectionNoteInput("");
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#1E1E4B",
  },
  backButton: {
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },

  clientName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1E1E4B",
    marginBottom: 2,
  },
  label: {
    fontSize: 14,
    color: "#888",
    marginTop: 8,
  },
  value: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  note: {
    fontSize: 12,
    fontStyle: "italic",
    color: "#E74C3C",
    marginTop: 4,
  },
  separator: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 12,
    marginBottom: 2,
  },
  deptBadge: {
    backgroundColor: "#E8EAF6",
    paddingVertical: 2,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginTop: 6,
  },
  deptText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E1E4B",
  },
  statusChip: {
    alignSelf: "flex-start",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 2,
    marginTop: 4,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  },
  chipPending: {
    backgroundColor: "#F5A623",
  },
  chipApproved: {
    backgroundColor: "#27AE60",
  },
  chipRejected: {
    backgroundColor: "#E74C3C",
  },

  actionButtons: {
    flexDirection: "row",
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 80, // same as home page
  },

  iconButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    marginTop: 16,
  },

  buttonText: {
    color: "#fff",
    fontWeight: "bold",
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
  rejectionNoteInput: {
    backgroundColor: "#f2f2f2",
    padding: 10,
    borderRadius: 8,
    fontSize: 14,
    color: "#1E1E4B",
    marginBottom: 12,
    textAlignVertical: "top",
    minHeight: 60,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 24,
    gap: 12,
  },
  summaryBox: {
    backgroundColor: "#f4f4f4",
    borderRadius: 15,
    paddingVertical: 16,
    width: "47%",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1E1E4B",
  },
  summaryLabel: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
});
