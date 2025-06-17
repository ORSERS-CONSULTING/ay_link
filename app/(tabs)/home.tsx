import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { useChartData } from "@/context/ChartDataContext";
import {
  fetchClientRequests,
  approveRequest,
  rejectRequest,
  sendBackRequest,
} from "@/utils/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelectedRequest } from "@/context/SelectedRequestContext";
import {
  useClientRequests,
  ClientRequest,
  RequestStatus,
} from "@/context/ClientRequestContext";
import { useDailyTotal } from "@/hooks/useDailyTotal";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
  creditLimit: number;
  outstandingBalance: number;
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

  const { chartData, setChartData } = useChartData();
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
  const [isNavigating, setIsNavigating] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

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
          clientName: item.company_name.replace(/\s+/g, " ").trim(),
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
          name: item.name?.replace(/\s+/g, " ").trim() || "",
          creditLimit: item.credit_limit || 0,
          outstandingBalance: item.outstanding_balance || 0,
        }));

      const formattedChartData = response
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

  // const uniqueRequesters = useMemo(() => {
  //   const names = requests.map((c) => c.name ?? "").filter(Boolean);
  //   return ["All", ...Array.from(new Set(names))];
  // }, [requests]);

  const { totalApproved, totalRejected, countApproved, countRejected } =
    useDailyTotal(chartData, selectedDate);

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

    // console.log(
    //   "➡️ Starting confirm action:",
    //   selectedAction,
    //   "for ID:",
    //   selectedClient.id
    // );

    try {
      const now = new Date().toISOString().split(".")[0];

      if (selectedAction === "accept") {
        Toast.show({ type: "info", text1: "Sending approval..." });

        const username = await AsyncStorage.getItem("email");
        const result = await approveRequest(selectedClient.id);
        //console.log("✅ Approve response:", result);

        Toast.show({ type: "success", text1: "Request approved!" });
        updateRequestStatus(selectedClient.id, "Approved", {
          decisionTime: now, // ✅ used only for frontend display
          approver: username || "You",
        });

        loadClientsAndChartData();
      }

      if (selectedAction === "reject") {
        Toast.show({ type: "info", text1: "Sending rejection..." });

        const result = await rejectRequest(
          selectedClient.id,
          rejectionNote.trim() // ✅ removed `now`
        );
        // console.log("✅ Reject response:", result);

        Toast.show({ type: "success", text1: "Request rejected!" });
        updateRequestStatus(selectedClient.id, "Rejected", {
          decisionTime: now, // ✅ for UI only
          approver: "You",
          rejectionNote: rejectionNote.trim(),
        });

        loadClientsAndChartData();
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
  const localTimestamp = timestamp.replace(/Z$/, ''); // Remove 'Z' if wrongly there
  const date = new Date(localTimestamp); // Treat as local time
  const now = new Date();

  const isSameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isSameDay) {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } else {
    return date.toLocaleDateString("en-GB");
  }
};


  const handleLogoutPress = () => {
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = async () => {
    setShowLogoutModal(false);

    try {
      const isDeviceInitialized = await AsyncStorage.getItem(
        "isDeviceCapableAndInitializedForBiometrics"
      );

      await AsyncStorage.removeItem("userToken");
      await AsyncStorage.removeItem("email");
      if (isDeviceInitialized === "true") {
        await AsyncStorage.setItem(
          "isDeviceCapableAndInitializedForBiometrics",
          "true"
        );
      }

      router.replace("/login");
    } catch (error) {
      console.error("Logout failed", error);
      Alert.alert("Logout Error", "Failed to log out. Please try again.");
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
        <Text style={styles.timeText}>{getTimeAgo(item.timestamp)}</Text>
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
          if (isNavigating) return;
          setIsNavigating(true);
          setSelectedRequest(item);
          router.push("/request-detail-screen");
          setTimeout(() => setIsNavigating(false), 1000);
        }}
      >
        <View style={styles.clientRow}>
          <Text
            style={styles.clientName}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {item.clientName}
          </Text>
          <Text style={styles.amount}>
            AED{" "}
            {item.requestedAmount.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
        </View>
      </TouchableOpacity>

      <View style={styles.actionRow}>
        <TouchableOpacity
          onPress={() => {
            setSelectedClient(item);
            setShowInfoModal(true);
          }}
        >
          <Ionicons name="chatbox-ellipses-outline" size={20} color="#1E1E4B" />
        </TouchableOpacity>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[
              styles.iconButton,
              { backgroundColor: "rgba(198, 40, 40, 0.1)" },
            ]}
            onPress={() => {
              setSelectedAction("reject");
              setSelectedClient(item);
              setShowConfirm(true);
            }}
          >
            <Text
              style={{ color: "#C62828", fontSize: 14, fontWeight: "bold" }}
            >
              REJECT
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.iconButton,
              { backgroundColor: "rgba(46, 125, 50, 0.1)" },
            ]}
            onPress={() => {
              setSelectedAction("accept");
              setSelectedClient(item);
              setShowConfirm(true);
            }}
          >
            <Text
              style={{ color: "#2E7D32", fontSize: 14, fontWeight: "bold" }}
            >
              APPROVE
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
          //paddingTop: Platform.OS ===,
          paddingBottom: insets.bottom - 20,
          paddingHorizontal: 16,
        }}
      >
        <StatusBar hidden />
        <Modal
          transparent
          animationType="slide"
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

                <TouchableOpacity
                  style={[
                    styles.confirmBtn,
                    { backgroundColor: "rgba(153, 153, 153, 0.1)" },
                  ]}
                  onPress={() => {
                    setShowConfirm(false);
                    setSelectedClient(null);
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
                  style={[
                    styles.confirmBtn,
                    { backgroundColor: "rgba(25, 118, 210, 0.1)" },
                  ]}
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

                <TouchableOpacity
                  onPress={() => {
                    setShowInfoModal(false);
                    setAdditionalInfo("");
                  }}
                  style={[
                    styles.confirmBtn,
                    { backgroundColor: "rgba(153, 153, 153, 0.1)" },
                  ]}
                >
                  <Text
                    style={{ color: "#666", fontWeight: "bold", fontSize: 14 }}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        <Modal
          transparent
          visible={showLogoutModal}
          animationType="fade"
          onRequestClose={() => setShowLogoutModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.confirmModal}>
              <Text style={styles.confirmText}>
                Are you sure you want to log out?
              </Text>

              <View style={styles.confirmActions}>
                <TouchableOpacity
                  style={[
                    styles.confirmBtn,
                    { backgroundColor: "rgba(255, 59, 48, 0.1)" },
                  ]}
                  onPress={handleLogoutConfirm}
                >
                  <Text
                    style={{
                      color: "#FF3B30",
                      fontWeight: "bold",
                      fontSize: 14,
                    }}
                  >
                    LOG OUT
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.confirmBtn,
                    { backgroundColor: "rgba(153, 153, 153, 0.1)" },
                  ]}
                  onPress={() => setShowLogoutModal(false)}
                >
                  <Text
                    style={{ color: "#666", fontWeight: "bold", fontSize: 14 }}
                  >
                    CANCEL
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Title Row with Search Icon */}
        {/* Title Row with Search and Filter Icons */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 2,
          }}
        >
          {/* <Ionicons name="open-outline" size={20} color="#1E1E4B" /> */}

          <Text
            style={{
              fontSize: 24,
              fontWeight: "bold",
              color: "#1E1E4B",
            }}
          >
            Credit Requests
          </Text>

          <View style={{ flexDirection: "row", gap: 8 }}>
            {/* Filter Button */}
            <TouchableOpacity
              style={{
                backgroundColor: "#F5F5F5",
                borderRadius: 20,
                padding: 10,
              }}
              onPress={() => setShowFilters((prev) => !prev)}
            >
              <Ionicons name="filter-outline" size={20} color="#1E1E4B" />
            </TouchableOpacity>

            {/* Search Button */}
            <TouchableOpacity
              style={{
                backgroundColor: "#F5F5F5",
                borderRadius: 20,
                padding: 10,
              }}
              onPress={() => setShowSearch(true)}
            >
              <Ionicons name="search" size={20} color="#1E1E4B" />
            </TouchableOpacity>

            {/* Logout Button */}
            {/* <TouchableOpacity
              style={{
                backgroundColor: "#F5F5F5",
                borderRadius: 20,
                padding: 10,
              }}
              onPress={handleLogoutPress} // defined below
            >
              <Ionicons name="log-out-outline" size={20} color="#1E1E4B" />
            </TouchableOpacity> */}
          </View>
        </View>
        {/* <View>Welcome Mr.{}</View> */}

        {/* Metrics for Date */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginTop: 10,
            marginBottom: 10,
          }}
        >
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            style={{
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Ionicons name="calendar-outline" size={16} color="#1E1E4B" />
            <Text style={[styles.dateFilterText, { marginLeft: 2 }]}>
              {selectedDate
                ? selectedDate.toLocaleDateString()
                : new Date().toLocaleDateString()}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Clear Date Filter */}
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

            {/* <View style={styles.filtersContainer}>
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
            </View> */}
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
              colors={["#1E1E4B"]} // Android spinner color(s)
              title="Pull to refresh"
              titleColor="#1E1E4B"
            />
          }
        >
          {/* Summary Cards Grid */}
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            {[
              // Map summary data if dynamic; here it's hardcoded
              {
                title: "Total Increased",
                value: `AED ${totalApproved.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`,
                color: "#1E1E4B",
              },
              {
                title: "Requests Accepted",
                value: countApproved.toString(),
                color: "#1E1E4B",
              },
              {
                title: "Total Declined",
                value: `AED ${totalRejected.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`,
                color: "#1E1E4B",
              },
              {
                title: "Requests Declined",
                value: countRejected.toString(),
                color: "#1E1E4B",
              },
            ].map((item, idx) => (
              <View
                key={idx}
                style={[styles.summaryCard, { width: "48%", marginBottom: 10 }]}
              >
                <Text style={styles.summaryTitle}>{item.title}</Text>
                <Text style={[styles.summaryValue, { color: item.color }]}>
                  {item.value}
                </Text>
              </View>
            ))}
          </View>

          {/* Horizontal Divider */}
          <View
            style={{
              height: 2,
              backgroundColor: "#E0E0E0",
              marginTop: 2,
              marginBottom: 10,
              borderRadius: 1,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 2,
            }}
          />
          {filteredData.length === 0 ? (
            <View style={{ alignItems: "center", marginTop: 60 }}>
              <Ionicons
                name="archive-outline"
                size={64}
                color="#1E1E4B"
                style={{ marginBottom: 16 }}
              />

              <Text
                style={{ fontSize: 18, fontWeight: "600", color: "#1E1E4B" }}
              >
                All Clear!
              </Text>

              <Text
                style={{
                  fontSize: 14,
                  color: "#4B4B4B",
                  marginTop: 4,
                  textAlign: "center",
                  paddingHorizontal: 20,
                }}
              >
                There are no credit requests to show at the moment.
              </Text>

              <Text
                style={{
                  fontSize: 13,
                  color: "#6E6E6E",
                  marginTop: 12,
                  textAlign: "center",
                  paddingHorizontal: 30,
                }}
              >
                Try pulling down to refresh, or clear your filters to see more
                requests.
              </Text>
            </View>
          ) : (
            filteredData
              .sort(
                (a, b) =>
                  new Date(b.timestamp).getTime() -
                  new Date(a.timestamp).getTime()
              )
              .map((item) => (
                <View key={item.id} style={{ marginTop: 12 }}>
                  {renderItem({ item })}
                </View>
              ))
          )}
        </ScrollView>

        <Toast />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  summaryContainer: {
    flexDirection: "row",
    justifyContent: "flex-start", // no spacing pushed in between
    gap: 0, // safe measure
    marginBottom: 4,
  },

  summaryCard: {
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
    backgroundColor: "#F5F5F5",
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
    elevation: 2,
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
  amount: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1E60D4",
    marginTop: 4,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    //marginTop: 4,
  },
  iconButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 6,
    //alignItems: "center",
    //justifyContent: "center",
  },

  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 20,
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
    marginBottom: 3,
  },

  deptBadge: {
    backgroundColor: "#E8EAF6",
    paddingVertical: 2,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 4,
  },

  deptText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1E1E4B",
  },

  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
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
    backgroundColor: "#EDEDED",
    margin: 4,
    marginHorizontal: 8, // ⬅️ Use this instead of generic `margin`
    marginVertical: 2,
  },

  filterText: {
    color: "#aaa",
    fontSize: 12,
  },
  activeFilter: {
    backgroundColor: "#2A2A5A",
  },
  activeFilterText: {
    color: "#fff",
    fontWeight: "bold",
  },
  clientRow: {
    marginBottom: 12,
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
    fontSize: 12,
    color: "#999",
    minWidth: 52, // ensure fixed space for consistent right alignment
    textAlign: "right",
  },
  summaryCardHalf: {
    width: "48%", // ensures two cards per row with a gap
    marginBottom: 12,
  },
});
