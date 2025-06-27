import { useRouter } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  useSafeAreaInsets,
  SafeAreaView,
} from "react-native-safe-area-context";
import React, { useEffect, useState } from "react";
import Toast from "react-native-toast-message";
import { useSelectedRequest } from "@/context/SelectedRequestContext";
import {
  approveRequest,
  fetchClientRequests,
  fetchTransactionStats,
  rejectRequest,
  sendBackRequest,
} from "@/utils/api";
import { useChartData } from "@/context/ChartDataContext";
import { useClientRequests } from "@/context/ClientRequestContext";
import { RefreshControl } from "react-native";

export default function RequestDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { selectedRequest, setSelectedRequest } = useSelectedRequest();
  const { chartData, setChartData } = useChartData();
  const { updateRequestStatus, setRequests } = useClientRequests();

  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedAction, setSelectedAction] = useState<
    "accept" | "reject" | ""
  >("");
  const [rejectionNote, setRejectionNote] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const [transactionStats, setTransactionStats] = useState<{
    invoice_count: number;
    transaction_count: number;
  } | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [additionalInfo, setAdditionalInfo] = useState("");

  useEffect(() => {
    const loadStats = async () => {
      if (!selectedRequest?.companyCode) return;
      try {
        const stats = await fetchTransactionStats(selectedRequest.companyCode);
        setTransactionStats(stats);
      } catch (e) {
        console.error("❌ Failed to load transaction stats:", e);
      }
    };
    loadStats();
  }, [selectedRequest?.companyCode]);

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
    departmentName,
    requestedAmount,
    status,
    timestamp,
    decisionTime,
    approver,
    rejectionNote: existingRejectionNote,
    reason,
    name,
    outstandingBalance,
    creditLimit,
  } = selectedRequest;

  const [localStatus, setLocalStatus] = useState(status);
  const [localDecisionTime, setLocalDecisionTime] = useState(decisionTime);
  const [localApprover, setLocalApprover] = useState(approver);
  const [localRejectionNote, setLocalRejectionNote] = useState(
    existingRejectionNote
  );
  const [isProcessing, setIsProcessing] = useState(false);

  // const { approvedAmount, rejectedAmount } = getClientSummary(clientName);
  const loadClientsAndChartData = async () => {
    try {
      const response = await fetchClientRequests();

      const formattedClients = response.map((item: any) => ({
        id: item.request_id.toString(),
        clientName: item.company_name.trim(),
        currentBalance: 0,
        requestedAmount: item.credit_amount,
        outstandingBalance: item.outstanding_balance || 0,
        creditLimit: item.credit_limit || 0,
        status:
          item.status === "PENDING"
            ? "Pending"
            : item.status === "APPROVED"
            ? "Approved"
            : item.status === "REJECTED"
            ? "Rejected"
            : item.status === "ON HOLD"
            ? "On hold"
            : "Pending",
        timestamp: item.requested_at,
        rejectionNote: item.rejection_comment || "",
        reason: item.reason,
        departmentName: item.department_name,
        companyCode: item.company_code,
        decisionTime: item.decision_time || null,
        approver: item.approver || null,
        name:
          item.name
            ?.replace(/\s+/g, " ")
            .replace(/\u00A0/g, " ")
            .trim() || "",
      }));

      const chartDataItems = response
        .filter((item: any) => ["APPROVED", "REJECTED"].includes(item.status))
        .map((item: any) => ({
          clientName: item.company_name.trim(),
          requestedAmount: item.credit_amount,
          departmentName: item.department_name,
          companyCode: item.company_code,
          timestamp: item.requested_at,
          decisionTime: item.decision_time,
          status: item.status === "APPROVED" ? "Approved" : "Rejected",
        }));

      setRequests(formattedClients);
      setChartData(chartDataItems);
    } catch (error) {
      Toast.show({ type: "error", text1: "Failed to reload data." });
    }
  };
  const handleConfirmAction = async () => {
    if (!selectedRequest || isProcessing) return;
    setIsProcessing(true);

    try {
      if (selectedAction === "accept") {
        await approveRequest(selectedRequest.id);
        Toast.show({ type: "success", text1: "Request approved!" });
      } else if (selectedAction === "reject") {
        await rejectRequest(selectedRequest.id, rejectionNote.trim());
        Toast.show({ type: "success", text1: "Request rejected!" });
      }

      // Reload request list and chart data
      await loadClientsAndChartData();

      // Get the updated request from backend
      const refreshedRequests = await fetchClientRequests();
      const updated = refreshedRequests.find(
        (r: any) => r.request_id.toString() === selectedRequest.id
      );

      if (updated) {
        const updatedStatus =
          updated.status === "APPROVED"
            ? "Approved"
            : updated.status === "REJECTED"
            ? "Rejected"
            : updated.status === "ON HOLD"
            ? "On hold"
            : "Pending";

        setLocalStatus(updatedStatus);
        setLocalDecisionTime(updated.decision_time || new Date().toISOString());
        setLocalApprover(updated.approver || "You");

        if (updated.rejection_comment) {
          setLocalRejectionNote(updated.rejection_comment);
        }

        updateRequestStatus(selectedRequest.id, updatedStatus, {
          decisionTime: updated.decision_time,
          rejectionNote: updated.rejection_comment,
          approver: updated.approver || "You",
        });

        // ✅ Update the full selectedRequest state
        setSelectedRequest({
          id: updated.request_id.toString(),
          clientName: updated.company_name?.trim() || "",
          requestedAmount: updated.credit_amount,
          outstandingBalance: updated.outstanding_balance || 0,
          creditLimit: updated.credit_limit || 0,
          status: updatedStatus,
          timestamp: updated.requested_at,
          rejectionNote: updated.rejection_comment || "",
          reason: updated.reason,
          departmentName: updated.department_name,
          companyCode: updated.company_code,
          decisionTime: updated.decision_time || null,
          approver: updated.approver || null,
          name:
            updated.name
              ?.replace(/\s+/g, " ")
              .replace(/\u00A0/g, " ")
              .trim() || "",
        });
      }
    } catch (error) {
      console.error(error);
      Toast.show({ type: "error", text1: "Action failed. Please try again." });
    }

    setIsProcessing(false);
    setShowConfirm(false);
    setSelectedAction("");
    setRejectionNote("");
  };

  const handleSendBack = async () => {
    if (!selectedRequest || !additionalInfo.trim()) {
      Toast.show({ type: "error", text1: "Please enter a message." });
      return;
    }

    try {
      await sendBackRequest(selectedRequest.id, additionalInfo.trim());

      Toast.show({
        type: "success",
        text1: "Request sent back for more info!",
      });

      await loadClientsAndChartData();
      setShowInfoModal(false);
      setAdditionalInfo("");

      // Delay resetting the selectedRequest to avoid conflicting renders
      setTimeout(() => {
        setSelectedRequest(null);
        router.back(); // 👈 optionally navigate away after
      }, 100);
    } catch (error) {
      console.error("Failed to send back request:", error);
      Toast.show({ type: "error", text1: "Failed to send request back." });
    }
  };

  const normalize = (text: string) =>
    text.trim().replace(/\s+/g, " ").toLowerCase();

  const getClientAmountByStatus = (status: "Approved" | "Rejected") => {
    const filtered = chartData.filter(
      (entry) =>
        entry.status.toLowerCase() === status.toLowerCase() &&
        entry.companyCode === selectedRequest.companyCode &&
        normalize(entry.clientName) === normalize(selectedRequest.clientName)
    );

    return filtered.reduce((sum, entry) => sum + entry.requestedAmount, 0);
  };
  const onRefresh = async () => {
    if (!selectedRequest) return;
    setRefreshing(true);

    try {
      const refreshedRequests = await fetchClientRequests();
      console.log("formatted", refreshedRequests);
      const updated = refreshedRequests.find(
        (r: any) => r.request_id.toString() === selectedRequest.id
      );

      if (updated) {
        const normalizedStatus = updated.status?.toLowerCase();
        let finalStatus: "Approved" | "Rejected" | "Pending" | "On hold" =
          "Pending";

        if (normalizedStatus === "approved") finalStatus = "Approved";
        else if (normalizedStatus === "rejected") finalStatus = "Rejected";
        else if (normalizedStatus === "on hold") finalStatus = "On hold";
        else finalStatus = "Pending";

        setLocalStatus(finalStatus);
        setLocalDecisionTime(updated.decision_time || new Date().toISOString());
        setLocalApprover(updated.approver || "You");

        if (updated.rejection_comment) {
          setLocalRejectionNote(updated.rejection_comment);
        }

        updateRequestStatus(selectedRequest.id, finalStatus, {
          decisionTime: updated.decision_time,
          rejectionNote: updated.rejection_comment,
          approver: updated.approver || "You",
        });

        setSelectedRequest({
          id: updated.request_id.toString(),
          clientName: updated.company_name?.trim() || "",
          requestedAmount: updated.credit_amount,
          outstandingBalance: updated.outstanding_balance || 0,
          creditLimit: updated.credit_limit || 0,
          status:
            updated.status === "PENDING"
              ? "Pending"
              : updated.status === "APPROVED"
              ? "Approved"
              : updated.status === "REJECTED"
              ? "Rejected"
              : updated.status === "ON HOLD"
              ? "On hold"
              : "Pending",
          timestamp: updated.requested_at,
          rejectionNote: updated.rejection_comment || "",
          reason: updated.reason,
          departmentName: updated.department_name,
          companyCode: updated.company_code,
          decisionTime: updated.decision_time || null,
          approver: updated.approver || null,
          name:
            updated.name
              ?.replace(/\s+/g, " ")
              .replace(/\u00A0/g, " ")
              .trim() || "",
        });
      }

      const stats = await fetchTransactionStats(selectedRequest.companyCode);
      setTransactionStats(stats);
    } catch (error) {
      Toast.show({ type: "error", text1: "Refresh failed." });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#1E1E4B" />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          //paddingTop:insets.top,
          paddingBottom: insets.bottom + 16,
          paddingHorizontal: 16,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
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

          {/* <Text style={styles.label}>Current Balance</Text>
          <Text style={styles.value}>AED {currentBalance}</Text> */}

          <Text style={styles.label}>Requested Amount</Text>
          <Text style={styles.value}>
            AED{" "}
            {requestedAmount.toLocaleString("en-US", {
              minimumFractionDigits: 2,
            })}
          </Text>
          <Text style={styles.label}>Outstanding Balance</Text>
          <Text style={styles.value}>
            AED{" "}
            {outstandingBalance?.toLocaleString("en-US", {
              minimumFractionDigits: 2,
            }) || "0.00"}
          </Text>

          <Text style={styles.label}>Credit Limit</Text>
          <Text style={styles.value}>
            AED{" "}
            {creditLimit?.toLocaleString("en-US", {
              minimumFractionDigits: 2,
            }) || "0.00"}
          </Text>

          {reason && (
            <>
              <Text style={styles.label}>Reason for Request</Text>
              <Text style={styles.value}>{reason}</Text>
            </>
          )}

          <Text style={styles.label}>Requester</Text>
          <Text style={styles.value}>
            {name
              ?.replace(/\s+/g, " ")
              .replace(/\u00A0/g, " ")
              .trim()}
          </Text>

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
              <Text style={styles.value}>
                {selectedRequest.approver || "-"}
              </Text>
            </>
          )}

          {localStatus === "Rejected" && localRejectionNote && (
            <>
              <Text style={styles.label}>Rejection Note</Text>
              <Text style={styles.note}>{localRejectionNote}</Text>
            </>
          )}

          {localStatus === "Pending" || localStatus === "On hold" ? (
            <>
              <View style={styles.divider} />
              <View style={styles.statusRow}>
                <TouchableOpacity
                  style={[
                    styles.iconButton,
                    { backgroundColor: "rgba(198, 40, 40, 0.1)" },
                  ]}
                  onPress={() => {
                    setSelectedAction("reject");
                    setShowConfirm(true);
                  }}
                >
                  <Text style={[styles.buttonText, { color: "#C62828" }]}>
                    REJECT
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.iconButton,
                    { backgroundColor: "rgba(25, 118, 210, 0.1)" },
                  ]}
                  onPress={() => {
                    setShowInfoModal(true);
                  }}
                >
                  <Text style={[styles.buttonText, { color: "#1976D2" }]}>
                    REQUEST INFO
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.iconButton,
                    { backgroundColor: "rgba(46, 125, 50, 0.1)" },
                  ]}
                  onPress={() => {
                    setSelectedAction("accept");
                    setShowConfirm(true);
                  }}
                >
                  <Text style={[styles.buttonText, { color: "#2E7D32" }]}>
                    APPROVE
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.divider} />
            </>
          ) : null}

          {/* Stats */}
          <View style={styles.summaryGrid}>
            <View style={styles.summaryBox}>
              <Ionicons
                name="checkmark-done-outline"
                size={20}
                color="#1E1E4B"
              />
              <Text
                style={styles.summaryValue}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                AED{" "}
                {getClientAmountByStatus("Approved").toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
              </Text>
              <Text style={styles.summaryLabel}>Total Approved</Text>
            </View>

            {/* Rejected Box */}
            <View style={styles.summaryBox}>
              <Ionicons name="close-circle-outline" size={20} color="#1E1E4B" />
              <Text
                style={styles.summaryValue}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                AED{" "}
                {getClientAmountByStatus("Rejected").toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
              </Text>
              <Text style={styles.summaryLabel}>Total Rejected</Text>
            </View>

            <View style={styles.summaryBox}>
              <Ionicons
                name="document-text-outline"
                size={20}
                color="#1E1E4B"
              />
              <Text style={styles.summaryValue}>
                {transactionStats?.invoice_count ?? "--"}
              </Text>
              <Text style={styles.summaryLabel}>Total Invoices</Text>
            </View>

            <View style={styles.summaryBox}>
              <Ionicons
                name="swap-vertical-outline"
                size={20}
                color="#1E1E4B"
              />
              <Text style={styles.summaryValue}>
                {transactionStats?.transaction_count ?? "--"}
              </Text>
              <Text style={styles.summaryLabel}>Total Transactions</Text>
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
                {selectedAction === "accept" ? "Approve" : "Reject"}{" "}
                {clientName}'s request for{" "}
                <Text style={{ fontWeight: "bold" }}>
                  AED{" "}
                  {requestedAmount.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
                ?
              </Text>

              {selectedAction === "reject" && (
                <TextInput
                  placeholder="Optional: reason for rejection"
                  placeholderTextColor="#999"
                  style={[styles.rejectionInput, { marginBottom: 15 }]}
                  value={rejectionNote}
                  onChangeText={setRejectionNote}
                  multiline
                />
              )}

              <View style={styles.confirmActions}>
                <TouchableOpacity
                  style={[
                    styles.confirmBtn,
                    { backgroundColor: "rgba(153, 153, 153, 0.1)" },
                  ]}
                  onPress={() => {
                    setShowConfirm(false);
                    setSelectedAction("");
                    setRejectionNote("");
                  }}
                >
                  <Text
                    style={{
                      color: "#666",
                      fontWeight: "bold",
                      fontSize: 14,
                    }}
                  >
                    CANCEL
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.confirmBtn,
                    {
                      backgroundColor:
                        selectedAction === "accept"
                          ? "rgba(46, 125, 50, 0.1)"
                          : "rgba(198, 40, 40, 0.1)",
                    },
                  ]}
                  onPress={handleConfirmAction}
                >
                  <Text
                    style={{
                      color:
                        selectedAction === "accept" ? "#2E7D32" : "#C62828",
                      fontWeight: "bold",
                      fontSize: 14,
                    }}
                  >
                    {selectedAction === "accept" ? "APPROVE" : "REJECT"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          transparent
          visible={showInfoModal}
          animationType="fade"
          onRequestClose={() => setShowInfoModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.confirmModal}>
              <Text style={styles.confirmText}>
                Enter additional info required for {clientName}:
              </Text>
              <TextInput
                placeholder="E.g. Upload recent documents"
                placeholderTextColor="#999"
                value={additionalInfo}
                onChangeText={setAdditionalInfo}
                multiline
                style={[styles.rejectionInput, { marginBottom: 15 }]}
              />

              <View style={styles.confirmActions}>
                <TouchableOpacity
                  style={[
                    styles.confirmBtn,
                    { backgroundColor: "rgba(153, 153, 153, 0.1)" },
                  ]}
                  onPress={() => {
                    setShowInfoModal(false);
                    setAdditionalInfo("");
                  }}
                >
                  <Text
                    style={{ color: "#666", fontWeight: "bold", fontSize: 14 }}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.confirmBtn,
                    { backgroundColor: "rgba(25, 118, 210, 0.1)" },
                  ]}
                  onPress={handleSendBack}
                >
                  <Text
                    style={{
                      color: "#1976D2",
                      fontWeight: "bold",
                      fontSize: 14,
                    }}
                  >
                    Send
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* <Modal
                 transparent
                 animationType="slide"
                 visible={showConfirm}
                 onRequestClose={() => setShowConfirm(false)}
               >
                 <TouchableOpacity
                   activeOpacity={1}
                   onPress={() => setShowConfirm(false)}
                   style={{
                     flex: 1,
                     justifyContent: "flex-end",
                     backgroundColor: "rgba(0, 0, 0, 0.3)",
                   }}
                 >
                   <TouchableOpacity
                     activeOpacity={1}
                     onPress={() => {}}
                     style={{
                       backgroundColor: "#fff",
                       borderTopLeftRadius: 20,
                       borderTopRightRadius: 20,
                       padding: 20,
                       paddingVertical: 45,
                       minHeight: "25%",
                     }}
                   >
                     <Text style={styles.confirmText}>
                       {selectedAction === "accept" ? "Approve" : "Reject"}{" "}
                       {clientName}'s request for{" "}
                       <Text style={{ fontWeight: "bold" }}>
                         AED{" "}
                         {requestedAmount.toLocaleString("en-US", {
                           minimumFractionDigits: 2,
                           maximumFractionDigits: 2,
                         })}
                       </Text>
                       ?
                     </Text>
       
                     {selectedAction === "reject" && (
                       <TextInput
                         placeholder="Optional: reason for rejection"
                         placeholderTextColor="#999"
                         style={[styles.rejectionInput, { marginBottom: 15 }]}
                         value={rejectionNote}
                         onChangeText={setRejectionNote}
                         multiline
                     
                       />
                     )}
       
                     <View
                       style={{
                         flexDirection: "row",
                         justifyContent: "space-between",
                         marginTop: 10,
                         paddingTop:5
                       }}
                     >
                       <TouchableOpacity
                         style={[
                           {
                             flex: 1,
                             paddingVertical: 10,
                             borderRadius: 10,
                             backgroundColor: "rgba(153, 153, 153, 0.1)",
                             alignItems: "center",
                             marginRight: 8,
                           },
                         ]}
                         onPress={() => {
                           setShowConfirm(false);
                           setSelectedAction("");
                           setRejectionNote("");
                         }}
                       >
                         <Text
                           style={{
                             color: "#666",
                             fontWeight: "bold",
                             fontSize: 14,
                           }}
                         >
                           CANCEL
                         </Text>
                       </TouchableOpacity>
       
                       <TouchableOpacity
                         style={[
                           {
                             flex: 1,
                             paddingVertical: 10,
                             borderRadius: 10,
                             backgroundColor:
                               selectedAction === "accept"
                                 ? "rgba(46, 125, 50, 0.1)"
                                 : "rgba(198, 40, 40, 0.1)",
                             alignItems: "center",
                             marginLeft: 8,
                           },
                         ]}
                         onPress={handleConfirmAction}
                       >
                         <Text
                           style={{
                             color:
                               selectedAction === "accept" ? "#2E7D32" : "#C62828",
                             fontWeight: "bold",
                             fontSize: 14,
                           }}
                         >
                           {selectedAction === "accept" ? "APPROVE" : "REJECT"}
                         </Text>
                       </TouchableOpacity>
                     </View>
                   </TouchableOpacity>
                 </TouchableOpacity>
               </Modal>
               <Modal
                 transparent
                 animationType="slide"
                 visible={showInfoModal}
                 onRequestClose={() => setShowInfoModal(false)}
               >
                 <TouchableOpacity
                   activeOpacity={1}
                   onPress={() => setShowInfoModal(false)}
                   style={{
                     flex: 1,
                     justifyContent: "flex-end",
                     backgroundColor: "rgba(0, 0, 0, 0.3)",
                   }}
                 >
                   <TouchableOpacity
                     activeOpacity={1}
                     onPress={() => {}}
                     style={{
                       backgroundColor: "#fff",
                       borderTopLeftRadius: 20,
                       borderTopRightRadius: 20,
                       padding: 20,
                       paddingVertical: 45,
                       minHeight: "25%",
                     }}
                   >
                     <Text style={styles.confirmText}>
                       Enter additional info required for {clientName}:
                     </Text>
                     <TextInput
                       placeholder="E.g. Upload recent documents"
                       placeholderTextColor="#999"
                       value={additionalInfo}
                       onChangeText={setAdditionalInfo}
                       multiline
                       style={[styles.rejectionInput, { marginBottom: 15 }]}
                     />
       
                     <View
                       style={{
                         flexDirection: "row",
                         justifyContent: "space-between",
                         marginTop: 10,
                         paddingTop: 5
                       }}
                     >
                       <TouchableOpacity
                         style={[
                           {
                             flex: 1,
                             paddingVertical: 10,
                             borderRadius: 10,
                             backgroundColor: "rgba(153, 153, 153, 0.1)",
                             alignItems: "center",
                             marginRight: 8,
                           },
                         ]}
                         onPress={() => {
                           setShowInfoModal(false);
                           setAdditionalInfo("");
                         }}
                       >
                         <Text
                           style={{ color: "#666", fontWeight: "bold", fontSize: 14 }}
                         >
                           Cancel
                         </Text>
                       </TouchableOpacity>
       
                       <TouchableOpacity
                         style={[
                           {
                             flex: 1,
                             paddingVertical: 10,
                             borderRadius: 10,
                             backgroundColor: "rgba(25, 118, 210, 0.1)",
                             alignItems: "center",
                             marginLeft: 8,
                           },
                         ]}
                         onPress={handleSendBack}
                       >
                         <Text
                           style={{
                             color: "#1976D2",
                             fontWeight: "bold",
                             fontSize: 14,
                           }}
                         >
                           Send
                         </Text>
                       </TouchableOpacity>
                     </View>
                   </TouchableOpacity>
                 </TouchableOpacity>
               </Modal> */}
      </ScrollView>

      <Toast />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F5F5",
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
    borderRadius: 8,
    paddingHorizontal: 10,
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
    gap: 12,
  },
  iconButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    //marginHorizontal:4
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    marginTop: 16,
    //gap:2
  },
  buttonText: {
    fontWeight: "bold",
    fontSize: 14,
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
    paddingHorizontal: 4,
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
    textAlign: "center",
    includeFontPadding: false,
  },

  summaryLabel: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  divider: {
    height: 1.5,
    backgroundColor: "#E0E0E0",
    marginTop: 24,
    marginBottom: 4,
    borderRadius: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
});
