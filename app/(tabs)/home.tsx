import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
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
  ScrollView,
} from "react-native";
import Toast from "react-native-toast-message";
import { useChartData } from "@/context/ChartDataContext";
import {
  fetchClientRequests,
  approveRequest,
  rejectRequest,
} from "@/utils/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useSelectedRequest } from "@/context/SelectedRequestContext";
import { RefreshControl } from "react-native";

type Client = {
  id: string;
  clientName: string;
  currentBalance: number;
  requestedAmount: number;
  status: "Pending" | "Approved" | "Rejected"| "On hold";
  timestamp: string;
  rejectionNote?: string;
  reason?: string;
  departmentName: string;
  companyCode: string;
  decisionTime?: string; // ✅ Add this
  approver?: string;
};

export default function HomeScreen() {
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
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [additionalInfo, setAdditionalInfo] = useState("");

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { chartData, setChartData, getTotalIncreasedAmount } = useChartData();
  const insets = useSafeAreaInsets();
  const { setSelectedRequest } = useSelectedRequest();
  const [showSearch, setShowSearch] = useState(false);
  const searchInputRef = useRef<TextInput>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (showSearch) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [showSearch]);

  const loadClientsAndChartData = async () => {
    setRefreshing(true);
    try {
      const response = await fetchClientRequests();
console.log(response);
      const formattedClients: Client[] = response
        .filter((item: any) => item.status === "PENDING")
        .map((item: any) => ({
          id: item.request_id.toString(),
          clientName: item.company_name.replace(/^\s+/, ""),
          currentBalance: 0,
          requestedAmount: item.credit_amount,
          status: capitalize(item.status),
          timestamp: item.requested_at,
          rejectionNote: item.rejection_comment || "",
          reason: item.reason,
          departmentName: item.department_name,
          companyCode: item.company_code,
          decisionTime: item.decision_time || null,
          approver: item.approver || null,
        }));
      // console.log(formattedClients);

      const formattedChartData = response
        .filter((item: any) => item.status === "APPROVED")
        .map((item: any) => ({
          clientName: item.company_name,
          requestedAmount: item.credit_amount,
          departmentName: item.department_name,
          companyCode: item.company_code,
          timestamp: item.requested_at,
        }));

      setClients(
        formattedClients.sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        )
      );

      setChartData(formattedChartData); // 🔄 sync chartData used in summary
    } catch (e) {
      Toast.show({ type: "error", text1: "Failed to load requests." });
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadClientsAndChartData();
  }, []);

  const [totalIncreased, setTotalIncreased] = useState(0);

  useFocusEffect(
    useCallback(() => {
      const value = getTotalIncreasedAmount(selectedDate);
      setTotalIncreased(value);
    }, [chartData, selectedDate])
  );

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
    const decisionTimestamp = new Date().toISOString();
    const approverName = "John Doe"; // Replace with actual session user if needed

    try {
      if (selectedAction === "accept") {
        await approveRequest(selectedClient.id);
      } else if (selectedAction === "reject") {
        await rejectRequest(
          selectedClient.id,
          rejectionNote.trim() || "No comment"
        );
      }

      // 🔥 Update chartData regardless of approve or reject
      setChartData((prev) => [
        ...prev,
        {
          clientName: selectedClient.clientName,
          requestedAmount: selectedClient.requestedAmount,
          departmentName: selectedClient.departmentName,
          companyCode: selectedClient.companyCode,
          timestamp: selectedClient.timestamp,
          status: selectedAction === "accept" ? "Approved" : "Rejected", // 🔥 Add status field
        },
      ]);

      // 🔥 Update local client list status
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
                decisionTime: decisionTimestamp,
                approver: approverName,
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

  // ✅ Filter chartData instead of local clients
  // const filteredChartData = useMemo(() => {
  //   return selectedDate
  //     ? chartData.filter((c) => isSameDate(c.timestamp, selectedDate))
  //     : chartData;
  // }, [chartData, selectedDate]);

  // const totalApproved = useMemo(() => {
  //   return filteredChartData.length;
  // }, [filteredChartData]);

  const totalIncreasedAmount = getTotalIncreasedAmount(selectedDate);

  // const totalRejected = useMemo(() => {
  //   return filteredChartData.length;
  // }, [filteredChartData]);
  const [expandedReasonIds, setExpandedReasonIds] = useState<string[]>([]);

  const toggleExpanded = (id: string) => {
    setExpandedReasonIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const renderItem = ({ item }: { item: Client }) => (
    <View style={styles.card}>
      {/* Header: Dept Badge + Status Dot */}
      <View style={styles.cardHeader}>
        <View style={styles.deptBadge}>
          <Text style={styles.deptText}>{item.departmentName}</Text>
        </View>
        <View
          style={[
            styles.statusChip,
            item.status === "Approved"
              ? styles.chipApproved
              : item.status === "Rejected"
              ? styles.chipRejected
              : styles.chipPending,
          ]}
        >
          <Text style={styles.chipText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={() => {
          setSelectedRequest(item);
          router.push("/request-detail-screen");
        }}
      >
        <Text style={styles.clientName}>{item.clientName}</Text>

        <Text style={styles.label}>Requested Amount:</Text>
        <Text style={styles.value}>
          AED{" "}
          {item.requestedAmount.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </Text>

        {item.reason && (
          <>
            <Text style={styles.label}>Reason for Request:</Text>
            <Text
              style={styles.value}
              numberOfLines={
                expandedReasonIds.includes(item.id) ? undefined : 2
              }
            >
              {item.reason}
            </Text>
            {item.reason.length > 60 && (
              <TouchableOpacity onPress={() => toggleExpanded(item.id)}>
                <Text style={styles.showToggle}>
                  {expandedReasonIds.includes(item.id)
                    ? "Show less"
                    : "Show more"}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </TouchableOpacity>

      {/* Request Additional Info (Moved Above) */}
      <TouchableOpacity
        style={styles.additionalInfoButton}
        onPress={() => {
          setSelectedClient(item);
          setShowInfoModal(true);
        }}
      >
        <Ionicons name="chatbox-ellipses-outline" size={16} color="#1E1E4B" />
        <Text style={styles.additionalInfoText}>Request Additional Info</Text>
      </TouchableOpacity>
      {/* Action Buttons */}
      <View style={styles.statusRow}>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: "#2E7D32" }]}
            onPress={() => {
              setSelectedAction("accept");
              setSelectedClient(item);
              setShowConfirm(true);
            }}
          >
            <Text style={{ color: "#fff", fontSize: 14, fontWeight: "bold" }}>
              APPROVE
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: "#C62828" }]}
            onPress={() => {
              setSelectedAction("reject");
              setSelectedClient(item);
              setShowConfirm(true);
            }}
          >
            <Text style={{ color: "#fff", fontSize: 14, fontWeight: "bold" }}>
              REJECT
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const capitalize = (text: string) =>
    text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#1E1E4B",
    },
    summaryContainer: {
      flexDirection: "row",
      justifyContent: "flex-start", // no spacing pushed in between
      gap: 0, // safe measure
      marginBottom: 4,
    },

    summaryCard: {
      flex: 1,
      backgroundColor: "#fff",
      borderRadius: 16,
      paddingVertical: 14,
      justifyContent: "center",
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
      marginBottom: 12,
    },

    summaryCardLeft: {
      marginRight: 12, // adds a controlled gap between the two cards
    },

    summaryCardFull: {
      backgroundColor: "#fff",
      borderRadius: 16,
      paddingVertical: 12,
      //paddingHorizontal: 15,
      justifyContent: "center",
      alignItems: "center",
      width: "100%",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
      marginBottom: 2,
    },
    safeArea: {
      flex: 1,
      backgroundColor: "#1E1E4B",
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
      borderRadius: 10, // slightly rounder
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 14,
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 8,
      marginBottom: 3,
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
      marginBottom: 12,
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
      marginBottom: 2,
    },
    label: {
      fontSize: 14,
      color: "#888",
    },
    value: {
      fontSize: 14,
      fontWeight: "600",
      color: "#333",
      marginBottom: 4,
    },
    // status: {
    //   fontSize: 16,
    //   fontWeight: "bold",
    //   flex: 1,
    // },
    // timestamp: {
    //   fontSize: 12,
    //   color: "#666",
    //   flex: 1,
    //   textAlign: "right",
    // },
    // pending: {
    //   color: "#F5A623",
    // },
    statusRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      marginTop: 8,
    },
    iconButton: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 20,
      justifyContent: "center",
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    }
    ,

    actionButtons: {
      flexDirection: "row",
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      gap: 80, // smaller gap between Approve and Reject
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
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 4,
    },

    deptBadge: {
      backgroundColor: "#E8EAF6",
      paddingVertical: 2,
      paddingHorizontal: 10,
      borderRadius: 8,
    },

    deptText: {
      fontSize: 12,
      fontWeight: "600",
      color: "#1E1E4B",
    },

    statusChip: {
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 2,
      alignSelf: "flex-end",
      marginTop: -4,
      marginRight: -4,
      elevation: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    chipText: {
      fontSize: 12,
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

    buttonRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 16,
    },

    actionButton: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      alignItems: "center",
      marginHorizontal: 4,
    },

    buttonText: {
      color: "#fff",
      fontWeight: "bold",
    },

    infoIconWrapper: {
      backgroundColor: "#F1F1F1",
      borderRadius: 20,
      padding: 6,
    },

    showToggle: {
      color: "#1E1E4B",
      fontSize: 13,
      fontWeight: "500",
      marginTop: 4,
    },
    additionalInfoButton: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      marginTop: 4,
      marginBottom: 4,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 20,
      backgroundColor: "#F1F1F1",
      shadowColor: "#000",
      shadowOpacity: 0.1,
      shadowOffset: { width: 0, height: 1 },
      shadowRadius: 2,
      elevation: 2,
    },

    additionalInfoText: {
      marginLeft: 6,
      fontSize: 13,
      fontWeight: "500",
      color: "#1E1E4B",
    },

    floatingSearchBtn: {
      position: "absolute",
      top: 10,
      right: 16,
      zIndex: 10,
      backgroundColor: "#1E1E4B",
      padding: 10,
      borderRadius: 30,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 5,
    },
  });
  return (
    <SafeAreaView style={styles.safeArea}>
      <View
        style={{
          flex: 1,
          paddingTop: 35,
          paddingBottom: insets.bottom,
          paddingHorizontal: 16,
        }}
      >
        <StatusBar hidden />

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
                  style={[
                    styles.confirmBtn,
                    {
                      backgroundColor:
                        selectedAction === "accept" ? "#2E7D32" : "#C62828", // Green if accept, Red if reject
                    },
                  ]}
                  onPress={handleConfirmAction}
                >
                  <Text style={{ color: "#fff", fontWeight: "bold" }}>
                    {selectedAction === "accept" ? "Approve" : "Reject"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.confirmBtn, { backgroundColor: "#999999" }]} // Always grey for cancel
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

        <Modal
          transparent
          visible={showInfoModal}
          animationType="slide"
          onRequestClose={() => setShowInfoModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.confirmModal}>
              <Text style={styles.confirmText}>
                Enter additional info required for {selectedClient?.clientName}:
              </Text>
              <TextInput
                placeholder="E.g. Need updated documents"
                placeholderTextColor="#999"
                value={additionalInfo}
                onChangeText={setAdditionalInfo}
                multiline
                style={styles.rejectionInput}
              />

              <View style={styles.confirmActions}>
                <TouchableOpacity
                  onPress={() => {
                    // simulate action
                    Toast.show({ type: "success", text1: "Request sent!" });
                    setShowInfoModal(false);
                    setAdditionalInfo("");
                  }}
                  style={[styles.confirmBtn, { backgroundColor: "#1E1E4B" }]}
                >
                  <Text style={{ color: "#fff", fontWeight: "bold" }}>
                    Send
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowInfoModal(false)}
                  style={[styles.confirmBtn, { backgroundColor: "#999999" }]}
                >
                  <Text style={{ color: "#fff", fontWeight: "bold" }}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Filter by Date + Search Icon Row */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 10,
            position: "relative",
          }}
        >
          {/* Filter by Date Button */}
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

          {/* Search Icon Toggle */}
          {!showSearch && (
            <TouchableOpacity
              style={{
                position: "absolute",
                right: 0,
                backgroundColor: "#1E1E4B",
                borderRadius: 20,
                padding: 10,
              }}
              onPress={() => setShowSearch(true)}
            >
              <Ionicons name="search" size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {/* Optional: Clear Date Link */}
        {selectedDate && (
          <TouchableOpacity
            onPress={() => setSelectedDate(null)}
            style={{ marginBottom: 10 }}
          >
            <Text
              style={{
                color: "#aaa",
                fontSize: 14,
                textDecorationLine: "underline",
                fontWeight: "500",
                textAlign: "left",
              }}
            >
              Clear Date Filter
            </Text>
          </TouchableOpacity>
        )}

        {showDatePicker ? (
          Platform.OS === "ios" ? (
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
          )
        ) : null}

        {/* Summary Cards */}
        <View style={[styles.summaryContainer, { justifyContent: "center" }]}>
          <View style={styles.summaryCardFull}>
            <Text style={styles.summaryTitle}>Total Increased</Text>
            <Text style={[styles.summaryValue, { fontSize: 22 }]}>
              AED{" "}
              {totalIncreasedAmount.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
          </View>
        </View>

        {/* Search */}
        {showSearch && (
          <View style={{ position: "relative", marginBottom: 12 }}>
            <TextInput
              ref={searchInputRef}
              placeholder="Search by client name..."
              placeholderTextColor="#aaa"
              style={[styles.searchInput, { paddingRight: 40 }]} // add space for icon
              value={search}
              onChangeText={setSearch}
            />
            <TouchableOpacity
              onPress={() => {
                setSearch("");
                setShowSearch(false);
              }}
              style={{
                position: "absolute",
                right: 12,
                top: 12,
              }}
            >
              <Ionicons name="close-circle" size={20} color="#aaa" />
            </TouchableOpacity>
          </View>
        )}

        {filteredData.length > 0 && (
          <Text style={styles.sectionTitle}>Pending Requests</Text>
        )}
        <ScrollView
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={loadClientsAndChartData}
            />
          }
        >
          {/* Cards */}
          {/* {filteredData.map((item) => renderItem({ item }))} */}
          {filteredData.map((item) => (
            <View key={item.id}>{renderItem({ item })}</View>
          ))}
        </ScrollView>

        <Toast />
      </View>
    </SafeAreaView>
  );
}
