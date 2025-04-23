import SummaryChart from "@/components/SummaryChart";
import { useChartData } from "@/context/ChartDataContext";

import { fetchClientRequests } from "@/utils/api";
import { useEffect } from "react";
import Toast from "react-native-toast-message";
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
} from "react-native";

type Chart = {
  clientName: string;
  requestedAmount: number;
  departmentName: string;
  companyCode: string;
};

export default function DashboardScreen() {
  const { chartData, setChartData } = useChartData();

  useEffect(() => {
    const loadChartData = async () => {
      try {
        const response = await fetchClientRequests();
        const formatted: Chart[] = response
          .filter((item: any) => item.status === "APPROVED")
          .map((item: any) => ({
            clientName: item.company_name,
            requestedAmount: item.credit_amount,
            departmentName: item.department_name,
            companyCode: item.company_code,
          }));
        setChartData(formatted);
      } catch (e) {
        Toast.show({ type: "error", text1: "Failed to load chart data." });
      }
    };
    loadChartData();
  }, []);
  console.log("Chart data", chartData);
  return (
    <View style={styles.container}>
      <SummaryChart />
      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1E1E4B",
    paddingHorizontal: 16,
    paddingTop: 42,
  },
  // summaryContainer: {
  //   flexDirection: "row",
  //   flexWrap: "wrap",
  //   justifyContent: "space-between",
  //   marginBottom: 16,
  //   gap: 12,
  // },
  // summaryCard: {
  //   flexBasis: "30%",
  //   minWidth: 100,
  //   backgroundColor: "#fff",
  //   borderRadius: 16,
  //   padding: 16,
  //   justifyContent: "center",
  //   alignItems: "center",
  //   shadowColor: "#000",
  //   shadowOffset: { width: 0, height: 2 },
  //   shadowOpacity: 0.05,
  //   shadowRadius: 6,
  //   elevation: 2,
  // },
  // summaryTitle: {
  //   fontSize: 14,
  //   color: "#1E1E4B",
  //   fontWeight: "600",
  //   marginBottom: 6,
  //   textAlign: "center",
  // },
  // summaryValue: {
  //   fontSize: 18,
  //   fontWeight: "bold",
  //   color: "#1E1E4B",
  // },
  // dateFilterButton: {
  //   backgroundColor: "#fff",
  //   flexDirection: "row",
  //   alignItems: "center",
  //   paddingVertical: 6,
  //   paddingHorizontal: 16,
  //   borderRadius: 20,
  // },
  // dateFilterText: {
  //   color: "#1E1E4B",
  //   fontWeight: "bold",
  //   marginLeft: 6,
  // },
  // searchInput: {
  //   backgroundColor: "#fff",
  //   borderRadius: 10,
  //   paddingHorizontal: 16,
  //   paddingVertical: 10,
  //   fontSize: 16,
  //   marginBottom: 12,
  // },
  // sectionTitle: {
  //   fontSize: 18,
  //   color: "#fff",
  //   fontWeight: "bold",
  //   marginBottom: 12,
  //   marginTop: 4,
  // },
  // listContainer: {
  //   paddingBottom: 20,
  // },
  // card: {
  //   backgroundColor: "#fff",
  //   borderRadius: 16,
  //   padding: 20,
  //   marginBottom: 16,
  //   shadowColor: "#000",
  //   shadowOpacity: 0.1,
  //   shadowRadius: 6,
  //   shadowOffset: { width: 0, height: 2 },
  //   elevation: 5,
  // },
  // clientName: {
  //   fontSize: 20,
  //   fontWeight: "bold",
  //   color: "#1E1E4B",
  //   marginBottom: 12,
  // },
  // label: {
  //   fontSize: 14,
  //   color: "#888",
  // },
  // value: {
  //   fontSize: 16,
  //   fontWeight: "600",
  //   color: "#333",
  //   marginBottom: 8,
  // },
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
  // statusRow: {
  //   flexDirection: "row",
  //   alignItems: "center",
  //   justifyContent: "space-between",
  //   flexWrap: "wrap",
  //   marginTop: 8,
  // },
  // iconButton: {
  //   width: 44,
  //   height: 44,
  //   borderRadius: 22,
  //   justifyContent: "center",
  //   alignItems: "center",
  //   marginLeft: 12,
  //   shadowColor: "#000",
  //   shadowOpacity: 0.1,
  //   shadowRadius: 4,
  //   shadowOffset: { width: 0, height: 2 },
  //   elevation: 3,
  // },
  // actionButtons: {
  //   flexDirection: "row",
  //   alignItems: "center",
  //   justifyContent: "space-between", // or 'center'
  //   marginTop: 12,
  // },
  // modalOverlay: {
  //   flex: 1,
  //   backgroundColor: "rgba(0, 0, 0, 0.5)",
  //   justifyContent: "center",
  //   alignItems: "center",
  // },
  // confirmModal: {
  //   backgroundColor: "#fff",
  //   padding: 20,
  //   borderRadius: 12,
  //   marginHorizontal: 16,
  //   shadowColor: "#000",
  //   shadowOpacity: 0.2,
  //   shadowRadius: 6,
  //   shadowOffset: { width: 0, height: 2 },
  //   elevation: 8,
  // },
  // confirmText: {
  //   fontSize: 16,
  //   color: "#1E1E4B",
  //   textAlign: "center",
  //   marginBottom: 16,
  // },
  // rejectionInput: {
  //   backgroundColor: "#f2f2f2",
  //   padding: 10,
  //   borderRadius: 8,
  //   fontSize: 14,
  //   color: "#1E1E4B",
  //   marginBottom: 12,
  //   textAlignVertical: "top",
  //   minHeight: 60,
  // },
  // confirmActions: {
  //   flexDirection: "row",
  //   justifyContent: "space-evenly",
  // },
  // confirmBtn: {
  //   paddingVertical: 10,
  //   paddingHorizontal: 20,
  //   borderRadius: 8,
  // },
});
