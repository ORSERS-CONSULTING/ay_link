import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Ionicons } from "@expo/vector-icons";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { fetchClientRequests, fetchClientRequests2 } from "@/utils/api";
import Toast from "react-native-toast-message";
import { useFocusEffect } from "@react-navigation/native";
import * as ScreenOrientation from "expo-screen-orientation";
import { useWindowDimensions } from "react-native";
import LineChart from "react-native-chart-kit/dist/line-chart";
import { Dimensions } from "react-native";
import useAppAuth from "@/utils/useAppAuth";

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

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const [logs, setLogs] = useState<Log[]>([]);
  const [allLogs, setAllLogs] = useState<Log[]>([]); 

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [showChartModal, setShowChartModal] = useState(false);
  const [groupBy, setGroupBy] = useState<"days" | "months">("days");
  const [showDataPoints, setShowDataPoints] = useState(false);
  const [showAllData, setShowAllData] = useState(false);
  const [customRange, setCustomRange] = useState({
    days: 30,
    months: 12,
  });
  const [tempDate, setTempDate] = useState(new Date());

  const { width } = useWindowDimensions();
  const isLandscape = width > 700;
  const columnWidth = isLandscape ? 160 : 130;
  const { width: windowWidth } = Dimensions.get("window");
  const DEFAULT_MAX_POINTS = {
    days: 30,
    months: 12,
  };
  
  const formatDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };
  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };
    const { fetchAccessToken } = useAppAuth();

  const loadLogs = async () => {
    try {
      const response = await fetchClientRequests2(fetchAccessToken,formatDate(selectedDate));
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
            new Date(b.decisionTime).getTime() -
            new Date(a.decisionTime).getTime()
        )
      );
    } catch {
      Toast.show({ type: "error", text1: "Failed to load logs." });
    }
  };


  useEffect(() => {
    loadLogs();
  }, [selectedDate]);

  useEffect(() => {
    // Allow both landscape and portrait for this screen
    ScreenOrientation.unlockAsync();

    return () => {
      // Lock back to portrait when leaving
      ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP
      );
    };
  }, []);
  const loadAllLogs = async () => {
  try {
    const response = await fetchClientRequests(fetchAccessToken); // no date filter
    // format & filter similarly to loadLogs
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

    setAllLogs(
      formatted.sort(
        (a, b) =>
          new Date(b.decisionTime).getTime() - new Date(a.decisionTime).getTime()
      )
    );
  } catch (e) {
    Toast.show({ type: "error", text1: "Failed to load all logs." });
  }
};

useEffect(() => {
  loadAllLogs();
}, []);




  const capitalize = (text: string | undefined | null) =>
    text ? text.charAt(0).toUpperCase() + text.slice(1).toLowerCase() : "";

  // const filteredLogs = useMemo(() => {
  //   return logs.filter((log) => {
  //     const logDate = new Date(log.decisionTime).toDateString(); // ✅ uses decision date
  //     const effectiveDate = selectedDate || new Date(); // ✅ use today's date if none selected
  //     return logDate === effectiveDate.toDateString();
  //   });
  // }, [logs, selectedDate]);

 const approvedLogs = useMemo(
  () => allLogs.filter((log) => log.status === "Approved" && log.decisionTime),
  [allLogs]
);


  const chartData = useMemo(() => {
    const grouped: Record<string, number> = {};



    approvedLogs.forEach((log) => {
      const date = new Date(log.decisionTime);
      const key =
        groupBy === "days"
          ? date.toISOString().split("T")[0]
          : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
              2,
              "0"
            )}`;
      grouped[key] = (grouped[key] || 0) + log.requestedAmount;
    });

    const sortedKeys = Object.keys(grouped).sort();

    let finalKeys = sortedKeys;

    if (!showAllData) {
      // Apply either custom range or default limits
      const maxPoints = customRange[groupBy];
      finalKeys = sortedKeys.slice(-maxPoints);
    }

    const labels = finalKeys.map((key) =>
      groupBy === "days"
        ? new Date(key).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
          })
        : new Date(`${key}-01`).toLocaleDateString("en-GB", {
            month: "short",
            year: "numeric",
          })
    );
    const data = finalKeys.map((key) => grouped[key]);

    return {
      labels,
      datasets: [{ data }],
      totalDataPoints: sortedKeys.length,
      showingDataPoints: finalKeys.length,
    };
  }, [approvedLogs, groupBy, showAllData, customRange]);
const chartWidthPerDataPoint = 60; 
// Calculate chart width based on labels count
const chartWidth = Math.max(
  chartData.labels.length * chartWidthPerDataPoint,
  windowWidth - 48
);
  const handleExportPDF = async () => {
    const formattedDate = selectedDate
      ? new Date(selectedDate).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      : "All Dates";

    const html = `
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
            }
            h1 {
              text-align: center;
              color: #1E1E4B;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
              font-size: 12px;
            }
            th, td {
              border: 1px solid #ccc;
              padding: 6px 8px;
              text-align: left;
              vertical-align: top;
            }
            th {
              background-color: #F0F4F8;
              color: #1E1E4B;
              font-weight: bold;
            }
            tr:nth-child(even) {
              background-color: #FAFAFA;
            }
            .placeholder {
              color: #999;
              font-style: italic;
            }
          </style>
        </head>
        <body>
          <h1>Credit Approval Logs – ${formattedDate}</h1>
          <table>
            <thead>
              <tr>
                <th>Department</th>
                <th>Client</th>
                <th>Company Code</th>
                <th>Requested Amount</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Submitted At</th>
                <th>Decision Time</th>
                <th>Approver</th>
                <th>Rejection Note</th>
              </tr>
            </thead>
            <tbody>
              ${logs
                .map((log) => {
                  const submittedAt = new Date(log.timestamp).toLocaleString(
                    "en-GB",
                    {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    }
                  );

                  const decisionAt = log.decisionTime
                    ? new Date(log.decisionTime).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })
                    : `<span class="placeholder">–</span>`;

                  return `
                    <tr>
                      <td>${
                        log.departmentName ||
                        '<span class="placeholder">–</span>'
                      }</td>
                      <td>${log.clientName}</td>
                      <td>${
                        log.companyCode || '<span class="placeholder">–</span>'
                      }</td>
                      <td>AED ${log.requestedAmount.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                      })}</td>
                      <td>${
                        log.reason || '<span class="placeholder">–</span>'
                      }</td>
                      <td>${log.status}</td>
                      <td>${submittedAt}</td>
                      <td>${decisionAt}</td>
                      <td>${
                        log.approver || '<span class="placeholder">–</span>'
                      }</td>
                      <td>${
                        log.rejectionNote ||
                        '<span class="placeholder">–</span>'
                      }</td>
                    </tr>
                  `;
                })
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
      //fileName: `credit_logs_${selectedDate?.toISOString().split("T")[0] || "all"}`
    });
    await Sharing.shareAsync(uri);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.container, { paddingTop: insets.top - 35 }]}>
        {/* Header Row */}
        <View style={styles.topBar}>
          <Text style={styles.header}>Dashboard</Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity onPress={() => setShowChartModal(true)}>
              <Ionicons name="bar-chart-outline" size={22} color="#1E1E4B" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleExportPDF}>
              <Ionicons
                name="download-outline"
                size={22}
                color="#1E1E4B"
                style={{ marginLeft: 22 }}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.dateRow}>
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            style={{ flexDirection: "row", alignItems: "center" }}
          >
            <Ionicons name="calendar-outline" size={16} color="#1E1E4B" />
            <Text style={[styles.dateFilterText, { marginLeft: 4 }]}>
              {selectedDate
                ? selectedDate.toLocaleDateString()
                : new Date().toLocaleDateString()}
            </Text>
          </TouchableOpacity>
        </View>

        {!isToday(selectedDate) && (
          <TouchableOpacity
            onPress={() => setSelectedDate(new Date())}
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

        {Platform.OS === "ios"
          ? showDatePicker && (
              <Modal transparent animationType="slide">
                <TouchableOpacity
                  activeOpacity={1}
                  style={{
                    flex: 1,
                    justifyContent: "flex-end",
                    backgroundColor: "rgba(0, 0, 0, 0.5)",
                  }}
                  onPressOut={() => setShowDatePicker(false)}
                >
                  <TouchableOpacity
                    activeOpacity={1}
                    style={{ backgroundColor: "#fff", padding: 20 }}
                  >
                    <DateTimePicker
                      value={tempDate}
                      mode="date"
                      display="spinner"
                      onChange={(event, date) => {
                        if (date) setTempDate(date); // only updates tempDate while scrolling
                      }}
                      themeVariant="light"
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
                        onPress={() => {
                          setSelectedDate(tempDate); // ✅ only update and reload on Done
                          setShowDatePicker(false);
                        }}
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
            )
          : showDatePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="default"
                onChange={(event, date) => {
                  setShowDatePicker(false);
                  if (date) setSelectedDate(date); // ✅ directly update on Android
                }}
              />
            )}

        <Modal
          visible={showChartModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <SafeAreaView style={styles.modalContainer}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.headerContent}>
                <Text style={styles.modalTitle}>Approved Amounts</Text>
                <Text style={styles.modalSubtitle}>
                  {groupBy === "days" ? "Daily Overview" : "Monthly Overview"}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowChartModal(false)}
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
<ScrollView
    style={{ flex: 1 }}
    contentContainerStyle={{paddingBottom: 24 }}
    showsVerticalScrollIndicator={false}
  >
            {/* Toggle Controls */}
            <View style={styles.controlsContainer}>
              <View style={styles.segmentedControl}>
                <TouchableOpacity
                  onPress={() => setGroupBy("days")}
                  style={[
                    styles.segmentButton,
                    styles.segmentButtonLeft,
                    groupBy === "days" && styles.segmentButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      groupBy === "days" && styles.segmentTextActive,
                    ]}
                  >
                    Days
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setGroupBy("months")}
                  style={[
                    styles.segmentButton,
                    styles.segmentButtonRight,
                    groupBy === "months" && styles.segmentButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      groupBy === "months" && styles.segmentTextActive,
                    ]}
                  >
                    Months
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.dataControlsContainer}>
              {!showAllData && (
                <View style={styles.rangeControls}>
                  <Text style={styles.rangeLabel}>Showing last:</Text>
                  <View style={styles.rangeButtons}>
                    {groupBy === "days" ? (
                      <>
                        {[7, 30, 90].map((days) => (
                          <TouchableOpacity
                            key={days}
                            onPress={() =>
                              setCustomRange({ ...customRange, days })
                            }
                            style={[
                              styles.rangeButton,
                              customRange.days === days &&
                                styles.rangeButtonActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.rangeButtonText,
                                customRange.days === days &&
                                  styles.rangeButtonTextActive,
                              ]}
                            >
                              {days}d
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </>
                    ) : (
                      <>
                        {[6, 12, 24].map((months) => (
                          <TouchableOpacity
                            key={months}
                            onPress={() =>
                              setCustomRange({ ...customRange, months })
                            }
                            style={[
                              styles.rangeButton,
                              customRange.months === months &&
                                styles.rangeButtonActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.rangeButtonText,
                                customRange.months === months &&
                                  styles.rangeButtonTextActive,
                              ]}
                            >
                              {months}m
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </>
                    )}
                  </View>
                </View>
              )}

              <View style={styles.dataToggle}>
                <Text style={styles.dataInfoText}>
                  Showing {chartData.showingDataPoints} of{" "}
                  {chartData.totalDataPoints} data points
                </Text>
                <TouchableOpacity
                  onPress={() => setShowAllData(!showAllData)}
                  style={styles.toggleButton}
                >
                  <Text style={styles.toggleButtonText}>
                    {showAllData ? "Show Recent Only" : "Show All Data"}
                  </Text>
                  <Ionicons
                    name={showAllData ? "contract-outline" : "expand-outline"}
                    size={14}
                    color="#3B82F6"
                  />
                </TouchableOpacity>
              </View>
            </View>
            {/* Chart Content */}
            <ScrollView
              style={styles.chartContainer}
              contentContainerStyle={styles.chartContent}
              showsVerticalScrollIndicator={false}
            >
              {chartData.labels.length > 0 && approvedLogs.length > 0 ? (
                <View style={styles.chartWrapper}>
                  {/* Chart Stats */}
                  <View style={styles.statsContainer}>
                    <View style={styles.statCard}>
                      <Text style={styles.statLabel}>Total Approved</Text>
                      <Text style={styles.statValue}>
                        AED{" "}
                        {approvedLogs
                          .reduce((sum, l) => sum + l.requestedAmount, 0)
                          .toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.statCard}>
                      <Text style={styles.statLabel}>Average</Text>
                      <Text style={styles.statValue}>
                        AED{" "}
                        {Math.round(
                          approvedLogs.reduce(
                            (sum, l) => sum + l.requestedAmount,
                            0
                          ) / chartData.labels.length
                        ).toLocaleString()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.chartSection}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                    >
                      <LineChart
                        data={chartData}
                        width={chartWidth}
                        height={280}
                        //yAxisLabel="د.إ"
                        fromZero
                        withInnerLines
                        segments={5}
                        yLabelsOffset={12}
                        // formatXLabel={(value) => value} // Optional
                        formatYLabel={(value) => Number(value).toLocaleString()}
                        verticalLabelRotation={30} // This rotates date labels for better spacing
                        chartConfig={{
                          backgroundColor: "#ffffff",
                          backgroundGradientFrom: "#ffffff",
                          backgroundGradientTo: "#ffffff",
                          decimalPlaces: 0,
                          color: (opacity = 1) =>
                            `rgba(59, 130, 246, ${opacity})`,
                          labelColor: (opacity = 1) =>
                            `rgba(55, 65, 81, ${opacity})`,
                          style: {
                            borderRadius: 16,
                          },
                          propsForDots: {
                            r: "5",
                            strokeWidth: "2",
                            stroke: "#3B82F6",
                            fill: "#ffffff",
                          },
                          propsForLabels: {
                            fontSize: 11,
                            fontWeight: "500",
                          },
                          propsForVerticalLabels: {
                            fontSize: 10,
                            fill: "#6B7280",
                          },
                          propsForHorizontalLabels: {
                            fontSize: 10,
                            fill: "#6B7280",
                          },
                        }}
                        bezier
                        style={styles.chart}
                        withVerticalLines={false}
                        withHorizontalLines={true}
                        withVerticalLabels={true}
                        withHorizontalLabels={true}
                        withDots={true}
                        withShadow={false}
                      />
                    </ScrollView>
                    <View style={{ marginTop: 16, alignItems: "center" }}>
                      <Text style={{ fontSize: 12, color: "#6B7280" }}>
                        Peak: AED{" "}
                        {Math.max(
                          ...chartData.datasets[0].data
                        ).toLocaleString()}{" "}
                        on{" "}
                        {
                          chartData.labels[
                            chartData.datasets[0].data.indexOf(
                              Math.max(...chartData.datasets[0].data)
                            )
                          ]
                        }
                      </Text>
                    </View>

                    <View style={{ marginTop: 12, alignItems: "center" }}>
                      <TouchableOpacity
                        onPress={() => setShowDataPoints((prev) => !prev)}
                        style={{
                          backgroundColor: "#F3F4F6",
                          paddingVertical: 6,
                          paddingHorizontal: 12,
                          borderRadius: 20,
                          flexDirection: "row",
                          alignItems: "center",
                        }}
                      >
                        <Ionicons
                          name={
                            showDataPoints
                              ? "chevron-up-outline"
                              : "chevron-down-outline"
                          }
                          size={16}
                          color="#3B82F6"
                          style={{ marginRight: 4 }}
                        />
                        <Text
                          style={{
                            color: "#3B82F6",
                            fontSize: 12,
                            fontWeight: "500",
                          }}
                        >
                          {showDataPoints ? "Hide" : "Show"} Data Points
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {showDataPoints && (
                    <View style={styles.dataTableContainer}>
                      <Text style={styles.dataTableTitle}>Data Points</Text>
                      <View style={styles.dataTable}>
                        <View style={styles.tableRoww}>
                          <View
                            style={[
                              styles.tableCell,
                              styles.tableHeaderr,
                              { flex: 1.2, alignItems: "flex-start" },
                            ]}
                          >
                            <Text
                              style={[
                                styles.tableHeaderText,
                                { textAlign: "left" },
                              ]}
                            >
                              {groupBy === "days" ? "Date" : "Month"}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.tableCell,
                              styles.tableHeader,
                              { flex: 1.8, alignItems: "flex-start" },
                            ]}
                          >
                            <Text
                              style={[
                                styles.tableHeaderText,
                                { textAlign: "left" },
                              ]}
                            >
                              Amount
                            </Text>
                          </View>
                        </View>

                        {chartData.labels.map((label, index) => (
                          <View
                            key={index}
                            style={[
                              styles.tableRow,
                              index % 2 === 0 && styles.tableRowEven,
                            ]}
                          >
                            <View style={[styles.tableCell, { flex: 1.2 }]}>
                              <Text
                                style={[
                                  styles.tableCellText,
                                  { textAlign: "left" },
                                ]}
                              >
                                {label}
                              </Text>
                            </View>
                            <View style={[styles.tableCell, { flex: 1.8 }]}>
                              <Text
                                style={[
                                  styles.tableCellText,
                                  { textAlign: "left" },
                                ]}
                              >
                                AED{" "}
                                {chartData.datasets[0].data[
                                  index
                                ].toLocaleString()}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons
                    name="analytics-outline"
                    size={64}
                    color="#D1D5DB"
                  />
                  <Text style={styles.emptyTitle}>No Data Available</Text>
                  <Text style={styles.emptySubtitle}>
                    There are no approved amounts to display at this time.
                  </Text>
                </View>
              )}
            </ScrollView>
            </ScrollView>
          </SafeAreaView>

        </Modal>

        {/* Scrollable Table */}
        <ScrollView
          contentContainerStyle={[
            //styles.scrollWrapper,
            { paddingBottom: 10 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ paddingHorizontal: 8 }}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                {[
                  "Department",
                  "Client",
                  "Company Code",
                  "Requested",
                  "Reason",
                  "Status",
                  "Submitted",
                  "Decision Time",
                  "Approver",
                  "Rejection Note",
                ].map((col) => (
                  <Text
                    key={col}
                    style={[styles.headerCell, { width: columnWidth }]}
                  >
                    {col}
                  </Text>
                ))}
              </View>

              {/* Table Rows */}
              {logs.length === 0 ? (
                <Text style={styles.noDataText}>No records found.</Text>
              ) : (
                logs.map((log, index) => (
                  <View
                    key={log.id}
                    style={[
                      styles.tableRow,
                      {
                        backgroundColor: index % 2 === 0 ? "#fff" : "#F9FAFB",
                      },
                    ]}
                  >
                    <Text style={[styles.cell, { width: columnWidth }]}>
                      {log.departmentName}
                    </Text>
                    <Text
                      style={[styles.cell, { width: columnWidth }]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {log.clientName}
                    </Text>
                    <Text style={[styles.cell, { width: columnWidth }]}>
                      {log.companyCode}
                    </Text>
                    <Text style={[styles.cell, { width: columnWidth }]}>
                      AED {log.requestedAmount.toFixed(2)}
                    </Text>
                    <Text style={[styles.cell, { width: columnWidth }]}>
                      {log.reason || "-"}
                    </Text>
                    <Text
                      style={[
                        styles.cell,
                        {
                          color:
                            log.status === "Approved"
                              ? "#2E7D32"
                              : log.status === "Rejected"
                              ? "#C62828"
                              : "#F5A623",
                        },
                      ]}
                    >
                      {log.status}
                    </Text>
                    <Text style={[styles.cell, { width: columnWidth }]}>
                      {new Date(log.timestamp).toLocaleString("en-GB")}
                    </Text>
                    <Text style={[styles.cell, { width: columnWidth }]}>
                      {log.decisionTime
                        ? new Date(log.decisionTime).toLocaleString("en-GB")
                        : "-"}
                    </Text>
                    <Text style={[styles.cell, { width: columnWidth }]}>
                      {log.approver || "-"}
                    </Text>
                    <Text style={[styles.cell, { width: columnWidth }]}>
                      {log.rejectionNote || "-"}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
    marginTop: 10,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1E1E4B",
    paddingBottom: 8,
  },
  dateRow: {
    marginTop: 6,
    marginBottom: 12,
  },
  dateFilterText: {
    color: "#1E1E4B",
    fontWeight: "bold",
    fontSize: 13,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F0F4F8",
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderBottomWidth: 1,
    borderColor: "#E0E0E0", // 👈 new
  },
  headerCell: {
    fontWeight: "bold",
    fontSize: 13,
    paddingHorizontal: 6,
    color: "#1E1E4B",
  },
  tableRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  cell: {
    width: 130,
    fontSize: 13,
    paddingHorizontal: 6,
    color: "#1F2937",
  },
  noDataText: {
    padding: 20,
    fontStyle: "italic",
    color: "#6B7280",
  },
  chartTotal: {
    textAlign: "center",
    marginTop: 12,
    fontSize: 14,
    fontWeight: "500",
    color: "#1E1E4B",
  },
  chartEmpty: {
    textAlign: "center",
    color: "#999",
    fontStyle: "italic",
    marginVertical: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    backgroundColor: "#F0F4F8",
  },
  headerContent: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1E1E4B",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#1E1E4B",
    fontWeight: "500",
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#ffffff",
  },
  controlsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#F5F5F5",
  },
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: "#E5E7EB",
    borderRadius: 20,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentButtonLeft: {
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  segmentButtonRight: {
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },
  segmentButtonActive: {
    backgroundColor: "#1E1E4B",
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1E1E4B",
  },
  segmentTextActive: {
    color: "#ffffff",
  },
  chartContainer: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  chartContent: {
    paddingBottom: 32,
  },
  chartWrapper: {
    paddingHorizontal: 16,
  },
  statsContainer: {
    flexDirection: "row",
    marginBottom: 16,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 6,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  statLabel: {
    fontSize: 13,
    color: "#1E1E4B",
    fontWeight: "500",
    marginBottom: 6,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1E1E4B",
  },
  chartSection: {
    marginBottom: 16,
    backgroundColor: "#ffffff",
    borderRadius: 6,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  chart: {
    borderRadius: 6,
  },
  insightsContainer: {
    backgroundColor: "#F0F4F8",
    borderRadius: 6,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1E1E4B",
    marginBottom: 12,
  },
  insightItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  insightBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#1E1E4B",
    marginRight: 8,
  },
  insightText: {
    fontSize: 13,
    color: "#1F2937",
    fontWeight: "500",
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1E1E4B",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    fontStyle: "italic",
  },
  // Add these styles to your existing styles object:
  dataTableContainer: {
    marginTop: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dataTableTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  dataTable: {
    borderRadius: 8,
    overflow: "hidden",
  },
  tableRoww: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tableRowEven: {
    backgroundColor: "#F9FAFB",
  },
  tableCell: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    //justifyContent: "center",
  },
  tableHeaderr: {
    backgroundColor: "#F3F4F6",
  },
  tableHeaderText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  tableCellText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "left",
  },
  dataControlsContainer: {
    backgroundColor: "#F8FAFC",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  rangeControls: {
    marginBottom: 12,
  },
  rangeLabel: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 6,
    fontWeight: "500",
  },
  rangeButtons: {
    flexDirection: "row",
    gap: 6,
  },
  rangeButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#E2E8F0",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  rangeButtonActive: {
    backgroundColor: "#1E1E4B",
    //borderColor: "#3B82F6",
  },
  rangeButtonText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  rangeButtonTextActive: {
    color: "#FFFFFF",
  },
  dataToggle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dataInfoText: {
    fontSize: 11,
    color: "#64748B",
    flex: 1,
  },
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#EBF4FF",
    borderRadius: 8,
    gap: 4,
  },
  toggleButtonText: {
    fontSize: 11,
    color: "#3B82F6",
    fontWeight: "500",
  },
  // scrollWrapper: {
  //   paddingBottom: 150, // 👈 ensures content doesn't get covered
  // },
});
