import { Stack, useRouter } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import React, { useEffect, useState } from "react";
import Toast from "react-native-toast-message";
import { useSelectedRequest } from "@/context/SelectedRequestContext";
import { approveRequest, fetchClientRequests, rejectRequest } from "@/utils/api";
import { useChartData } from "@/context/ChartDataContext";
import {
  ClientRequest,
  useClientRequests,
} from "@/context/ClientRequestContext";

export default function RequestDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { selectedRequest, setSelectedRequest } = useSelectedRequest();
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedAction, setSelectedAction] = useState<
    "accept" | "reject" | ""
  >("");
  const [rejectionNote, setRejectionNote] = useState("");
  const { updateRequestStatus } = useClientRequests();

  useEffect(() => {
    return () => setSelectedRequest(null);
  }, []);

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
    rejectionNote: existingRejectionNote,
    reason,
  } = selectedRequest;

  const [localStatus, setLocalStatus] = useState(status);
  const [localDecisionTime, setLocalDecisionTime] = useState(decisionTime);
  const [localApprover, setLocalApprover] = useState(approver);
  const [localRejectionNote, setLocalRejectionNote] = useState(
    existingRejectionNote
  );

  const { getClientSummary } = useChartData();
  const { approvedAmount, rejectedAmount } = getClientSummary(clientName);
  const { setRequests } = useClientRequests();

  const handleConfirmAction = async () => {
    if (!selectedRequest) return;

    try {
      if (selectedAction === "accept") {
        await approveRequest(selectedRequest.id);
        Toast.show({ type: "success", text1: "Request approved!" });
      } else if (selectedAction === "reject") {
        await rejectRequest(selectedRequest.id, rejectionNote.trim());
        Toast.show({ type: "success", text1: "Request rejected!" });
      }

      // ✅ Refetch latest data for this request
      const refreshedRequests = await fetchClientRequests();
      const updated = refreshedRequests.find(
        (r: any) => r.request_id.toString() === selectedRequest.id
      );

      if (updated) {
        setLocalStatus(updated.status === "APPROVED" ? "Approved" : "Rejected");
        setLocalDecisionTime(updated.decision_time);
        setLocalApprover("You"); // or updated.approver if backend sends it
        if (updated.rejection_comment) {
          setLocalRejectionNote(updated.rejection_comment);
        }

        updateRequestStatus(
          selectedRequest.id,
          updated.status === "APPROVED" ? "Approved" : "Rejected",
          {
            decisionTime: updated.decision_time,
            rejectionNote: updated.rejection_comment,
            approver: "You",
          }
        );
      }
    } catch (error) {
      console.error(error);
      Toast.show({ type: "error", text1: "Action failed. Please try again." });
    }

    setShowConfirm(false);
    setSelectedAction("");
    setRejectionNote("");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: insets.bottom + 16,
          paddingHorizontal: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Stack.Screen options={{ headerShown: false }} />

        <View style={styles.card}>
          {/* Department + Status */}
          <View style={styles.cardHeader}>
            <View style={styles.deptBadge}>
              <Text style={styles.deptText}>{departmentName}</Text>
            </View>
            <View
              style={[
                styles.statusChip,
                localStatus === "Approved"
                  ? styles.chipApproved
                  : localStatus === "Rejected"
                  ? styles.chipRejected
                  : localStatus === "On hold"
                  ? styles.chipOnHold
                  : styles.chipPending,
              ]}
            >
              <Text style={styles.chipText}>{localStatus.toUpperCase()}</Text>
            </View>
          </View>

          <Text style={styles.clientName}>{clientName}</Text>
          <Text style={styles.label}>Company Code</Text>
          <Text style={styles.value}>{companyCode}</Text>

          <Text style={styles.label}>Current Balance</Text>
          <Text style={styles.value}>AED {currentBalance}</Text>

          <Text style={styles.label}>Requested Amount</Text>
          <Text style={styles.value}>
            AED{" "}
            {requestedAmount.toLocaleString("en-US", {
              minimumFractionDigits: 2,
            })}
          </Text>

          {reason && (
            <>
              <Text style={styles.label}>Reason for Request</Text>
              <Text style={styles.value}>{reason}</Text>
            </>
          )}

          <Text style={styles.label}>Requester</Text>
          <Text style={styles.value}>John Doe</Text>

          <Text style={styles.label}>Submitted At</Text>
          <Text style={styles.value}>
            {new Date(timestamp).toLocaleString("en-GB", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })}
          </Text>

          {localStatus !== "Pending" && (
            <>
              <Text style={styles.label}>Decision Time</Text>
              <Text style={styles.value}>
                {localDecisionTime
                  ? new Date(localDecisionTime).toLocaleString("en-GB", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })
                  : "-"}
              </Text>
              <Text style={styles.label}>Approver</Text>
              <Text style={styles.value}>{localApprover || "-"}</Text>
            </>
          )}

          {localStatus === "Rejected" && localRejectionNote && (
            <>
              <Text style={styles.label}>Rejection Note</Text>
              <Text style={styles.note}>{localRejectionNote}</Text>
            </>
          )}

          {(localStatus === "Pending" || localStatus === "On hold") && (
            <View style={styles.statusRow}>
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.iconButton, { backgroundColor: "#2E7D32" }]}
                  onPress={() => {
                    setSelectedAction("accept");
                    setShowConfirm(true);
                  }}
                >
                  <Text style={styles.buttonText}>APPROVE</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.iconButton, { backgroundColor: "#C62828" }]}
                  onPress={() => {
                    setSelectedAction("reject");
                    setShowConfirm(true);
                  }}
                >
                  <Text style={styles.buttonText}>REJECT</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Stats */}
          <View style={styles.summaryGrid}>
            <View style={styles.summaryBox}>
              <Ionicons
                name="checkmark-done-outline"
                size={20}
                color="#1E1E4B"
              />
              <Text style={styles.summaryValue}>
                AED{" "}
                {approvedAmount.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
              </Text>
              <Text style={styles.summaryLabel}>Approved</Text>
            </View>

            <View style={styles.summaryBox}>
              <Ionicons name="close-circle-outline" size={20} color="#1E1E4B" />
              <Text style={styles.summaryValue}>
                AED{" "}
                {rejectedAmount.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
              </Text>
              <Text style={styles.summaryLabel}>Rejected</Text>
            </View>
          </View>
        </View>

        {/* Confirmation Modal */}
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
                for {clientName}?
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
                  style={[
                    styles.confirmBtn,
                    {
                      backgroundColor:
                        selectedAction === "accept" ? "#2E7D32" : "#C62828",
                    },
                  ]}
                  onPress={handleConfirmAction}
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
      </ScrollView>

      <Toast />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#1E1E4B",
  },
  backButton: {
    padding: 14,
    marginVertical: 5,
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
  chipPending: { backgroundColor: "#F5A623" },
  chipApproved: { backgroundColor: "#27AE60" },
  chipRejected: { backgroundColor: "#E74C3C" },
  chipOnHold: { backgroundColor: "#2196F3" },
  actionButtons: {
    flexDirection: "row",
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 80,
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
