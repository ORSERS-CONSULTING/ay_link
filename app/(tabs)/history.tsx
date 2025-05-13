import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Platform,
  TextInput,
  Modal,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import DateTimePicker from "@react-native-community/datetimepicker";
import { fetchClientRequests } from "@/utils/api";
import Toast from "react-native-toast-message";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelectedRequest } from "@/context/SelectedRequestContext";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

const statuses = ["All", "Approved", "Rejected"];

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

export default function HistoryScreen() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [filter, setFilter] = useState("All");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [search, setSearch] = useState("");
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setSelectedRequest } = useSelectedRequest();
  const [refreshing, setRefreshing] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const searchInputRef = useRef<TextInput>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    if (showSearch) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [showSearch]);

  const loadLogs = async () => {
    setRefreshing(true);
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
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
      );
    } catch {
      Toast.show({ type: "error", text1: "Failed to load history logs." });
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadLogs();
    }, [])
  );

  const capitalize = (text: string | undefined | null) =>
    text ? text.charAt(0).toUpperCase() + text.slice(1).toLowerCase() : "";

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch = log.clientName
        .toLowerCase()
        .includes(search.toLowerCase());
      const statusMatch = filter === "All" || log.status === filter;
  
      const logDate = new Date(log.decisionTime).toDateString();
      const selected = selectedDate
        ? new Date(selectedDate).toDateString()
        : new Date().toDateString();
  
      const dateMatch = logDate === selected;
  
      return matchesSearch && statusMatch && dateMatch;
    });
  }, [logs, search, filter, selectedDate]);
  
  
  const formatSubmittedTime = (timestamp: string) => {
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

  // const handleExportPDF = async () => {
  //   const html = `
  //     <html>
  //       <head>
  //         <style>
  //           body {
  //             font-family: Arial, sans-serif;
  //             padding: 20px;
  //           }
  //           h1 {
  //             text-align: center;
  //             color: #1E1E4B;
  //           }
  //           table {
  //             width: 100%;
  //             border-collapse: collapse;
  //             margin-top: 20px;
  //             font-size: 12px;
  //           }
  //           th, td {
  //             border: 1px solid #ccc;
  //             padding: 6px 8px;
  //             text-align: left;
  //             vertical-align: top;
  //           }
  //           th {
  //             background-color: #F0F4F8;
  //             color: #1E1E4B;
  //             font-weight: bold;
  //           }
  //           tr:nth-child(even) {
  //             background-color: #FAFAFA;
  //           }
  //           .placeholder {
  //             color: #999;
  //             font-style: italic;
  //           }
  //         </style>
  //       </head>
  //       <body>
  //         <h1>Credit Approval Logs</h1>
  //         <table>
  //           <thead>
  //             <tr>
  //               <th>Department</th>
  //               <th>Client</th>
  //               <th>Company Code</th>
  //               <th>Requested Amount</th>
  //               <th>Reason</th>
  //               <th>Status</th>
  //               <th>Submitted At</th>
  //               <th>Decision Time</th>
  //               <th>Approver</th>
  //               <th>Rejection Note</th>
  //             </tr>
  //           </thead>
  //           <tbody>
  //             ${filteredLogs
  //               .map((log) => {
  //                 const submittedAt = new Date(log.timestamp).toLocaleString("en-GB", {
  //                   day: "2-digit",
  //                   month: "2-digit",
  //                   year: "numeric",
  //                   hour: "2-digit",
  //                   minute: "2-digit",
  //                   hour12: false,
  //                 });
  
  //                 const decisionAt = log.decisionTime
  //                   ? new Date(log.decisionTime).toLocaleString("en-GB", {
  //                       day: "2-digit",
  //                       month: "2-digit",
  //                       year: "numeric",
  //                       hour: "2-digit",
  //                       minute: "2-digit",
  //                       hour12: false,
  //                     })
  //                   : `<span class="placeholder">–</span>`;
  
  //                 return `
  //                   <tr>
  //                     <td>${log.departmentName || '<span class="placeholder">–</span>'}</td>
  //                     <td>${log.clientName}</td>
  //                     <td>${log.companyCode || '<span class="placeholder">–</span>'}</td>
  //                     <td>AED ${log.requestedAmount.toLocaleString("en-US", {
  //                       minimumFractionDigits: 2,
  //                     })}</td>
  //                     <td>${log.reason || '<span class="placeholder">–</span>'}</td>
  //                     <td>${log.status}</td>
  //                     <td>${submittedAt}</td>
  //                     <td>${decisionAt}</td>
  //                     <td>${log.approver || '<span class="placeholder">–</span>'}</td>
  //                     <td>${log.rejectionNote || '<span class="placeholder">–</span>'}</td>
  //                   </tr>
  //                 `;
  //               })
  //               .join("")}
  //           </tbody>
  //         </table>
  //       </body>
  //     </html>
  //   `;
  
  //   const { uri } = await Print.printToFileAsync({ html });
  //   await Sharing.shareAsync(uri);
  // };
  
  

  const RenderItem = useCallback(
    ({ item }: { item: Log }) => (
      <TouchableOpacity
        onPress={() => {
          if (isNavigating) return;
          setIsNavigating(true);
          setSelectedRequest(item);
          router.push("/request-detail-screen");
          setTimeout(() => setIsNavigating(false), 1000);
        }}
        style={styles.card}
        activeOpacity={0.85}
      >
        <View style={styles.cardTopRow}>
          <View>
            <View style={styles.clientRow}>
              <Text
                style={styles.clientName}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {item.clientName}
              </Text>
              <Text style={styles.timeText}>
                {formatSubmittedTime(item.decisionTime)}
              </Text>
            </View>
            <Text style={styles.label}>
              Requested: AED{" "}
              {item.requestedAmount.toLocaleString("en-US", {
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
              {item.status}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    ),
    [isNavigating]
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#F5F5F5",
      paddingHorizontal: 16,
      paddingBottom: 100,
    },

    searchInput: {
      backgroundColor: "#fff",
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 14,
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 8,
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
      backgroundColor: "#EDEDED",
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
      paddingBottom: 70,
    },
    card: {
      backgroundColor: "#fff",
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
    },

    clientNameContainer: {
      flex: 1,
      // marginRight: 16,
    },
    cardTopRow: {
      flexDirection: "column",
      // alignItems: "center",
      // justifyContent: "space-between",
      marginBottom: 4,
    },

    label: {
      fontSize: 13,
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
    safeArea: {
      flex: 1,
      backgroundColor: "#F5F5F5",
    },
    topBar: {
      marginTop: 30,
      marginBottom: 8,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    header: {
      fontSize: 24,
      fontWeight: "bold",
      color: "#1E1E4B",
    },
    iconRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
    },
    clientRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 2,
    },

    clientNameWrapper: {
      flex: 1,
      // paddingRight: 8, // ensures spacing before time
    },

    clientName: {
      fontSize: 18,
      fontWeight: "bold",
      color: "#1E1E4B",
      maxWidth: "72%",
    },

    timeText: {
      fontSize: 11,
      color: "#999",
      minWidth: 60, // ensure fixed space for consistent right alignment
      textAlign: "right",
    },
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
      <View
        style={{
          flex: 1,
          paddingTop: insets.top - 20,
          paddingBottom: insets.bottom,
          paddingHorizontal: 16,
        }}
      >
        <View style={styles.topBar}>
          <Text style={styles.header}>Activity Logs</Text>

          <View style={styles.iconRow}>
            <TouchableOpacity onPress={() => setShowFilters((prev) => !prev)}>
              <Ionicons name="filter-outline" size={22} color="#1E1E4B" />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowSearch((prev) => !prev)}>
              <Ionicons
                name="search-outline"
                size={22}
                color="#1E1E4B"
                style={{ marginLeft: 12 }}
              />
            </TouchableOpacity>

            {/* <TouchableOpacity onPress={handleExportPDF}>
              <Ionicons
                name="download-outline"
                size={22}
                color="#1E1E4B"
                style={{ marginLeft: 12 }}
              />
            </TouchableOpacity> */}
          </View>
        </View>

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

        {showFilters && (
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
        )}

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

        {filteredLogs.length === 0 && (
          <Text
            style={{
              textAlign: "center",
              color: "#4B4B4B",
              marginTop: 20,
              fontSize: 14,
            }}
          >
            No activity logs found for the selected filters.
          </Text>
        )}

        {filteredLogs.length > 0 && (
          <FlatList
            data={filteredLogs}
            renderItem={({ item }) => <RenderItem item={item} />}
            keyExtractor={(item) => item.id}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
            getItemLayout={(_, index) => ({
              length: 100,
              offset: 100 * index,
              index,
            })}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={(event) => {
              const y = event.nativeEvent.contentOffset.y;
              setScrollY(y);
              if (y > 150) {
                setShowSearch(false);
                setShowFilters(false);
              }
            }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={loadLogs} />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}
