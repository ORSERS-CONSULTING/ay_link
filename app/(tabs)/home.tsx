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
  RefreshControl,
} from "react-native";
import Toast from "react-native-toast-message";
import { useChartData } from "@/context/ChartDataContext";
import {
  fetchClientRequests,
  approveRequest,
  rejectRequest,
  sendBackRequest,
} from "@/utils/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useSelectedRequest } from "@/context/SelectedRequestContext";
import {
  useClientRequests,
  ClientRequest,
  RequestStatus,
} from "@/context/ClientRequestContext";

type Client = {
  id: string;
  clientName: string;
  currentBalance: number;
  requestedAmount: number;
  status: "Pending" | "Approved" | "Rejected" | "On hold";
  timestamp: string;
  rejectionNote?: string;
  reason?: string;
  departmentName: string;
  companyCode: string;
  decisionTime?: string;
  approver?: string;
  name?: string;
};

export default function HomeScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
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
  const [statusFilter, setStatusFilter] = useState<
    "All" | "Pending" | "On hold"
  >("All");
  const [requesterFilter, setRequesterFilter] = useState<string>("All");
  const [showFilters, setShowFilters] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const { requests, setRequests, getVisibleRequests, updateRequestStatus } =
    useClientRequests();

  useEffect(() => {
    if (showSearch) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [showSearch]);

  const loadClientsAndChartData = async () => {
    setRefreshing(true);
    try {
      const response = await fetchClientRequests();

      const formattedClients: ClientRequest[] = response
        .filter(
          (item: any) => item.status === "PENDING" || item.status === "ON HOLD"
        )
        .map((item: any) => ({
          id: item.request_id.toString(),
          clientName: item.company_name.replace(/^\s+/, ""),
          currentBalance: 0,
          requestedAmount: item.credit_amount,
          status: capitalize(item.status) as RequestStatus,
          timestamp: item.requested_at,
          rejectionNote: item.rejection_comment || "",
          reason: item.reason,
          departmentName: item.department_name,
          companyCode: item.company_code,
          decisionTime: item.decision_time || null,
          approver: item.approver || null,
          name: item.name || "",
        }));

        const formattedChartData = response
        .filter((item: any) => item.status === "APPROVED")
        .map((item: any) => ({
          clientName: item.company_name,
          requestedAmount: item.credit_amount,
          departmentName: item.department_name,
          companyCode: item.company_code,
          timestamp: item.requested_at,
          decisionTime: item.decision_time, // ✅ Add this
        }));
      

      // 🔁 Update global shared requests
      setRequests(
        formattedClients.sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        )
      );

      // ✅ Update chart data (local)
      setChartData(formattedChartData);
    } catch (e) {
      Toast.show({ type: "error", text1: "Failed to load requests." });
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadClientsAndChartData();
  }, []);

  const uniqueRequesters = useMemo(() => {
    const names = requests.map((c) => c.name ?? "").filter(Boolean);
    return ["All", ...Array.from(new Set(names))];
  }, [requests]);

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

  // const handleConfirmAction = async () => {
  //   if (!selectedClient) return;

  //   try {
  //     if (selectedAction === "accept") {
  //       await approveRequest(selectedClient.id);
  //       Toast.show({ type: "success", text1: "Request approved!" });
  //       updateRequestStatus(selectedClient.id, "Approved");
  //     } else if (selectedAction === "reject") {
  //       await rejectRequest(selectedClient.id, rejectionNote.trim());
  //       Toast.show({ type: "success", text1: "Request rejected!" });
  //       updateRequestStatus(selectedClient.id, "Rejected", {
  //         rejectionNote: rejectionNote.trim(),
  //       });
  //     }
  //   } catch (error) {
  //     Toast.show({ type: "error", text1: "Action failed. Try again." });
  //   }

  //   setShowConfirm(false);
  //   setSelectedClient(null);
  //   setSelectedAction("");
  //   setRejectionNote("");
  // };

  const handleConfirmAction = async () => {
  if (!selectedClient) return;

  console.log(
    "➡️ Starting confirm action:",
    selectedAction,
    "for ID:",
    selectedClient.id
  );

  try {
    const now = new Date().toISOString().split(".")[0]; // this can still be used locally

    if (selectedAction === "accept") {
      Toast.show({ type: "info", text1: "Sending approval..." });

      const result = await approveRequest(selectedClient.id); // ✅ removed `now`
      console.log("✅ Approve response:", result);

      Toast.show({ type: "success", text1: "Request approved!" });
      updateRequestStatus(selectedClient.id, "Approved", {
        decisionTime: now, // ✅ used only for frontend display
        approver: "You",
      });
    }

    if (selectedAction === "reject") {
      Toast.show({ type: "info", text1: "Sending rejection..." });

      const result = await rejectRequest(
        selectedClient.id,
        rejectionNote.trim() // ✅ removed `now`
      );
      console.log("✅ Reject response:", result);

      Toast.show({ type: "success", text1: "Request rejected!" });
      updateRequestStatus(selectedClient.id, "Rejected", {
        decisionTime: now, // ✅ for UI only
        approver: "You",
        rejectionNote: rejectionNote.trim(),
      });
    }
  } catch (error) {
    console.error("❌ Action failed:", error);
    Toast.show({ type: "error", text1: "Action failed. Try again." });
  }

  setShowConfirm(false);
  setSelectedClient(null);
  setSelectedAction("");
  setRejectionNote("");
};

  

  const handleSendBack = async () => {
    if (!selectedClient || !additionalInfo.trim()) return;

    try {
      await sendBackRequest(selectedClient.id, additionalInfo.trim());

      Toast.show({
        type: "success",
        text1: "Request sent for additional info!",
      });

      // Optionally refresh data from backend
      await loadClientsAndChartData();
    } catch (error) {
      Toast.show({ type: "error", text1: "Failed to send request back." });
    }

    setShowInfoModal(false);
    setAdditionalInfo("");
    setSelectedClient(null);
  };

  const isSameDate = (d1: string, d2: Date) =>
    new Date(d1).toDateString() === new Date(d2).toDateString();

  const filteredData = getVisibleRequests().filter((item) => {
    const matchesSearch = item.clientName
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesDate = selectedDate
      ? isSameDate(item.timestamp, selectedDate)
      : true;

    const matchesStatus =
      statusFilter === "All" || item.status === statusFilter;

    const matchesRequester =
      requesterFilter === "All" || item.name === requesterFilter;

    return matchesSearch && matchesDate && matchesStatus && matchesRequester;
  });

  //const totalIncreasedAmount = getTotalIncreasedAmount(selectedDate);

  const [expandedReasonIds, setExpandedReasonIds] = useState<string[]>([]);

  const toggleExpanded = (id: string) => {
    setExpandedReasonIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffHrs = diffMs / (1000 * 60 * 60);

    if (diffHrs < 24) {
      return time.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      }); // e.g., 14:32
    } else {
      return time.toLocaleDateString("en-GB"); // e.g., 02/12/2025
    }
  };

  const capitalize = (text: string) =>
    text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();

  const renderItem = ({ item }: { item: Client }) => (
    <View style={styles.card}>
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
              : item.status === "On hold"
              ? styles.chipOnHold
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
        <View style={styles.clientRow}>
          <View style={styles.clientNameWrapper}>
            <Text
              style={styles.clientName}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.clientName}
            </Text>
          </View>
          <Text style={styles.timeText}>{getTimeAgo(item.timestamp)}</Text>
        </View>

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
          animationType="fade"
          onRequestClose={() => setShowInfoModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.confirmModal}>
              <Text style={styles.confirmText}>
                Enter additional info required for {selectedClient?.clientName}:
              </Text>
              <TextInput
                placeholder="E.g. Upload recent documents"
                placeholderTextColor="#999"
                value={additionalInfo}
                onChangeText={setAdditionalInfo}
                multiline
                style={styles.rejectionInput}
              />

              <View style={styles.confirmActions}>
                <TouchableOpacity
                  onPress={handleSendBack}
                  style={[styles.confirmBtn, { backgroundColor: "#1E1E4B" }]}
                >
                  <Text style={{ color: "#fff", fontWeight: "bold" }}>
                    Send
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setShowInfoModal(false);
                    setAdditionalInfo("");
                    setSelectedClient(null);
                  }}
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

        {/* Summary Cards */}
        <View style={[styles.summaryContainer, { justifyContent: "center" }]}>
  <View style={styles.summaryCardFull}>
    <Text style={styles.summaryTitle}>Total Increased</Text>
    <Text style={[styles.summaryValue, { fontSize: 22 }]}>
      AED{" "}
      {totalIncreased.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}
    </Text>
  </View>
</View>


        {/* Filter & Search Row */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 10,
            position: "relative",
          }}
        >
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

          <View
            style={{
              position: "absolute",
              right: 0,
              flexDirection: "row",
              gap: 8,
            }}
          >
            <TouchableOpacity
              style={{
                backgroundColor: "#1E1E4B",
                borderRadius: 20,
                padding: 10,
              }}
              onPress={() => setShowFilters((prev) => !prev)}
            >
              <Ionicons name="filter-outline" size={20} color="#fff" />
            </TouchableOpacity>

            {!showSearch && (
              <TouchableOpacity
                style={{
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
        </View>

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
                textAlign: "center",
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

        {/* Search Input */}
        {showSearch && (
          <View style={{ position: "relative", marginBottom: 12 }}>
            <TextInput
              ref={searchInputRef}
              placeholder="Search by client name..."
              placeholderTextColor="#aaa"
              style={[styles.searchInput, { paddingRight: 40 }]}
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

        {/* Filters */}
        {showFilters && (
          <>
            <View style={styles.filtersContainer}>
              {["All", "Pending", "On hold"].map((status) => (
                <TouchableOpacity
                  key={status}
                  onPress={() => setStatusFilter(status as typeof statusFilter)}
                  style={[
                    styles.filterButton,
                    statusFilter === status && styles.activeFilter,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterText,
                      statusFilter === status && styles.activeFilterText,
                    ]}
                  >
                    {status}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.filtersContainer}>
              {uniqueRequesters.map((name) => (
                <TouchableOpacity
                  key={name}
                  onPress={() => setRequesterFilter(name)}
                  style={[
                    styles.filterButton,
                    requesterFilter === name && styles.activeFilter,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterText,
                      requesterFilter === name && styles.activeFilterText,
                    ]}
                  >
                    {name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* List of Requests */}
        <ScrollView
          onScroll={(event) => {
            const y = event.nativeEvent.contentOffset.y;
            setScrollY(y);

            if (y > 150) {
              setShowSearch(false);
              setShowFilters(false);
            }
          }}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={loadClientsAndChartData}
              progressBackgroundColor="#ffffff" // background of the spinner circle
    colors={["#1E1E4B"]} // Android spinner color(s)
    tintColor="white" // iOS spinner color
    title="Pull to refresh"
    titleColor="#1E1E4B"
            />
          }
        >
          {filteredData.map((item) => (
            <View key={item.id}>{renderItem({ item })}</View>
          ))}
        </ScrollView>

        <Toast />
      </View>
    </SafeAreaView>
  );
}

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
  },
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
  chipOnHold: {
    backgroundColor: "#2196F3", // Blue
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
  header: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "left",
  },
  filterChip: {
    backgroundColor: "#444",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#888",
  },
  activeChip: {
    backgroundColor: "#fff",
  },

  filtersContainer: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: 6,
    flexWrap: "wrap",
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#3D3D6B",
    margin: 4,
    marginHorizontal: 8, // ⬅️ Use this instead of generic `margin`
    marginVertical: 2,
  },
  filterText: {
    color: "#aaa",
    fontSize: 12,
  },
  activeFilter: {
    backgroundColor: "#fff",
  },
  activeFilterText: {
    color: "#1E1E4B",
    fontWeight: "bold",
  },
  clientRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },

  clientNameWrapper: {
    flex: 1,
    paddingRight: 50, // ensures spacing before time
  },

  clientName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1E1E4B",
  },

  timeText: {
    fontSize: 11,
    color: "#999",
    minWidth: 52, // ensure fixed space for consistent right alignment
    textAlign: "right",
  },
});
