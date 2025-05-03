// import SummaryChart from "@/components/SummaryChart";
// import { useChartData } from "@/context/ChartDataContext";
// import { fetchClientRequests } from "@/utils/api";
// import { useCallback, useEffect, useState } from "react";
// import Toast from "react-native-toast-message";
// import {
//   StyleSheet,
//   Text,
//   TouchableOpacity,
//   View,
//   Platform,
// } from "react-native";
// import DateTimePicker from "@react-native-community/datetimepicker";
// import {
//   SafeAreaView,
//   useSafeAreaInsets,
// } from "react-native-safe-area-context";
// import { useFocusEffect } from "@react-navigation/native";

// type Chart = {
//   clientName: string;
//   requestedAmount: number;
//   departmentName: string;
//   companyCode: string;
//   timestamp: string;
// };

// export default function DashboardScreen() {
//   const { chartData, setChartData, getTotalIncreasedAmount } = useChartData();
//   const [selectedDate, setSelectedDate] = useState<Date | null>(null);
//   const [showDatePicker, setShowDatePicker] = useState(false);
//   const insets = useSafeAreaInsets();

//   useEffect(() => {
//     const loadChartData = async () => {
//       try {
//         const response = await fetchClientRequests();
//         const formatted: Chart[] = response
//           .filter((item: any) => item.status === "APPROVED")
//           .map((item: any) => ({
//             clientName: item.company_name,
//             requestedAmount: item.credit_amount,
//             departmentName: item.department_name,
//             companyCode: item.company_code,
//             timestamp: item.requested_at,
//           }));
//         setChartData(formatted);
//       } catch (e) {
//         Toast.show({ type: "error", text1: "Failed to load chart data." });
//       }
//     };

//     loadChartData();
//   }, []); // ✅ only run once on mount

//   const [totalIncreased, setTotalIncreased] = useState(0);

//   useFocusEffect(
//     useCallback(() => {
//       const value = getTotalIncreasedAmount(selectedDate);
//       setTotalIncreased(value);
//     }, [chartData, selectedDate])
//   );

//   const isSameDate = (d1: string, d2: Date) =>
//     new Date(d1).toDateString() === new Date(d2).toDateString();

//   const totalIncreasedAmount = getTotalIncreasedAmount(selectedDate);

//   return (
//     <SafeAreaView style={styles.safeArea}>
//       <View
//         style={{
//           flex: 1,
//           paddingTop: 4,
//           paddingBottom: insets.bottom,
//           paddingHorizontal: 16,
//         }}
//       >
//         {/* Date Filter UI */}
//         <View style={{ alignItems: "center", marginBottom: 10 }}>
//           {selectedDate && (
//             <TouchableOpacity
//               onPress={() => setSelectedDate(null)}
//               style={{ marginTop: 4 }}
//             >
//               <Text style={{ color: "#aaa", fontSize: 12 }}>
//                 Clear Date Filter
//               </Text>
//             </TouchableOpacity>
//           )}
//           {showDatePicker && (
//             <DateTimePicker
//               value={new Date()}
//               mode="date"
//               display={Platform.OS === "ios" ? "spinner" : "default"}
//               onChange={(event, date) => {
//                 setShowDatePicker(false);
//                 if (date) setSelectedDate(date);
//               }}
//             />
//           )}
//         </View>

//         {/* Summary */}
//         <View style={[styles.summaryContainer, { justifyContent: "center" }]}>
//           <View style={styles.summaryCardFull}>
//             <Text style={styles.summaryTitle}>Total Increased</Text>
//             <Text style={[styles.summaryValue, { fontSize: 22 }]}>
//               AED{" "}
//               {totalIncreasedAmount.toLocaleString("en-US", {
//                 minimumFractionDigits: 2,
//                 maximumFractionDigits: 2,
//               })}
//             </Text>
//           </View>
//         </View>

//         {/* Chart */}
//         <SummaryChart />
//         <Toast />
//       </View>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   safeArea: {
//     flex: 1,
//     backgroundColor: "#1E1E4B",
//   },
//   summaryContainer: {
//     flexDirection: "row",
//     marginBottom: 12,
//   },
//   summaryCard: {
//     flex: 1,
//     backgroundColor: "#fff",
//     borderRadius: 16,
//     paddingVertical: 20,
//     justifyContent: "center",
//     alignItems: "center",
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.05,
//     shadowRadius: 6,
//     elevation: 2,
//   },
//   summaryCardFull: {
//     backgroundColor: "#fff",
//     borderRadius: 16,
//     paddingVertical: 20,
//     paddingHorizontal: 24,
//     justifyContent: "center",
//     alignItems: "center",
//     width: "100%",
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.05,
//     shadowRadius: 6,
//     elevation: 2,
//   },
//   summaryTitle: {
//     fontSize: 14,
//     color: "#1E1E4B",
//     fontWeight: "600",
//     marginBottom: 6,
//     textAlign: "center",
//   },
//   summaryValue: {
//     fontSize: 18,
//     fontWeight: "bold",
//     color: "#1E1E4B",
//   },
// });
