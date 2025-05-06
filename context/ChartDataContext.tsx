import React, { createContext, useContext, useEffect, useState } from "react";
import { fetchClientRequests } from "@/utils/api";
import Toast from "react-native-toast-message";

type ApprovedEntry = {
  clientName: string;
  requestedAmount: number;
  departmentName: string;
  companyCode: string;
  timestamp: string; // request submitted time
  decisionTime?: string; // actual decision time
  status: "Approved" | "Rejected";
};

type ClientSummary = {
  approvedAmount: number;
  rejectedAmount: number;
};

type ChartDataContextType = {
  chartData: ApprovedEntry[];
  setChartData: React.Dispatch<React.SetStateAction<ApprovedEntry[]>>;
  getTotalIncreasedAmount: (date?: Date | null) => number;
  getClientSummary: (clientName: string, date?: Date | null) => ClientSummary;
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

  useEffect(() => {
    const loadChartData = async () => {
      try {
        const response = await fetchClientRequests();
        const formatted: ApprovedEntry[] = response
          .filter((item: any) => ["APPROVED", "REJECTED"].includes(item.status))
          .map((item: any) => ({
            clientName: item.company_name?.trim() ?? "Unknown",
            requestedAmount: item.credit_amount,
            departmentName: item.department_name,
            companyCode: item.company_code,
            timestamp: item.requested_at,
            decisionTime: item.decision_time || null,
            status: item.status === "APPROVED" ? "Approved" : "Rejected",
          }));
        setChartData(formatted);

        console.log(
          "🧾 Loaded approved entries:",
          formatted.filter((e) => e.status === "Approved")
        );
      } catch (e) {
        Toast.show({ type: "error", text1: "Failed to load chart data." });
      }
    };

    loadChartData();
  }, []);

  const getTotalIncreasedAmount = (date?: Date | null): number => {
    const targetDate = date ?? new Date(); // Use current date if none is provided
    console.log(
      "📆 getTotalIncreasedAmount - using date:",
      targetDate.toISOString()
    );

    return chartData
      .filter(
        (entry) =>
          entry.status === "Approved" &&
          (entry.decisionTime || entry.timestamp) &&
          new Date(entry.decisionTime || entry.timestamp).toDateString() ===
            targetDate.toDateString()
      )
      .reduce((sum, entry) => sum + entry.requestedAmount, 0);
  };

  const getClientSummary = (
    clientName: string,
    date?: Date | null
  ): ClientSummary => {
    const filtered = chartData.filter((entry) => {
      const matchesClient = entry.clientName === clientName;
      const entryDate = entry.decisionTime || entry.timestamp;
      const matchesDate = date
        ? entryDate &&
          new Date(entryDate).toDateString() === date.toDateString()
        : true;

      return matchesClient && matchesDate;
    });

    const approvedAmount = filtered
      .filter((entry) => entry.status === "Approved")
      .reduce((sum, entry) => sum + entry.requestedAmount, 0);

    const rejectedAmount = filtered
      .filter((entry) => entry.status === "Rejected")
      .reduce((sum, entry) => sum + entry.requestedAmount, 0);

    return { approvedAmount, rejectedAmount };
  };

  return (
    <ChartDataContext.Provider
      value={{
        chartData,
        setChartData,
        getTotalIncreasedAmount,
        getClientSummary,
      }}
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
