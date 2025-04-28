import React, { createContext, useContext, useEffect, useState } from "react";
import { fetchClientRequests } from "@/utils/api"; // ✅ make sure this is imported
import Toast from "react-native-toast-message";

type ApprovedEntry = {
  clientName: string;
  requestedAmount: number;
  departmentName: string;
  companyCode: string;
  timestamp: string;
  status: "Approved" | "Rejected"; // ✅
};

type ChartDataContextType = {
  chartData: ApprovedEntry[];
  setChartData: React.Dispatch<React.SetStateAction<ApprovedEntry[]>>;
  getTotalIncreasedAmount: (date?: Date | null) => number;
};

const ChartDataContext = createContext<ChartDataContextType | undefined>(
  undefined
);

export const ChartDataProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [chartData, setChartData] = useState<ApprovedEntry[]>([]);

  // ✅ Automatically fetch data on provider mount
  useEffect(() => {
    const loadChartData = async () => {
      try {
        const response = await fetchClientRequests();
        const formatted: ApprovedEntry[] = response
          .filter((item: any) => item.status === "APPROVED")
          .map((item: any) => ({
            clientName: item.company_name,
            requestedAmount: item.credit_amount,
            departmentName: item.department_name,
            companyCode: item.company_code,
            timestamp: item.requested_at,
            status: item.status === "APPROVED" ? "Approved" : "Rejected", // 🔥 Map properly
          }));
        setChartData(formatted);
      } catch (e) {
        Toast.show({ type: "error", text1: "Failed to load chart data." });
      }
    };

    loadChartData();
  }, []);

  const getTotalIncreasedAmount = (date?: Date | null) => {
    if (!date) {
      return chartData.reduce((sum, entry) => sum + entry.requestedAmount, 0);
    }

    return chartData
      .filter(
        (entry) =>
          new Date(entry.timestamp).toDateString() === date.toDateString()
      )
      .reduce((sum, entry) => sum + entry.requestedAmount, 0);
  };

  return (
    <ChartDataContext.Provider
      value={{ chartData, setChartData, getTotalIncreasedAmount }}
    >
      {children}
    </ChartDataContext.Provider>
  );
};

export const useChartData = () => {
  const context = useContext(ChartDataContext);
  if (!context) {
    throw new Error("useChartData must be used within a ChartDataProvider");
  }
  return context;
};
