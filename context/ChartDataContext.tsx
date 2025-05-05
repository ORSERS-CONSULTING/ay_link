import React, { createContext, useContext, useEffect, useState } from "react";
import { fetchClientRequests } from "@/utils/api";
import Toast from "react-native-toast-message";

type ApprovedEntry = {
  clientName: string;
  requestedAmount: number;
  departmentName: string;
  companyCode: string;
  timestamp: string; // request submitted time
  decisionTime?: string; // ✅ new: actual decision time
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
            clientName: item.company_name,
            requestedAmount: item.credit_amount,
            departmentName: item.department_name,
            companyCode: item.company_code,
            timestamp: item.requested_at,
            decisionTime: item.decision_time,
            status: item.status === "APPROVED" ? "Approved" : "Rejected",
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
      return chartData
        .filter((entry) => entry.status === "Approved")
        .reduce((sum, entry) => sum + entry.requestedAmount, 0);
    }

    return chartData
      .filter(
        (entry) =>
          entry.status === "Approved" &&
          entry.decisionTime &&
          new Date(entry.decisionTime).toDateString() === date.toDateString()
      )
      .reduce((sum, entry) => sum + entry.requestedAmount, 0);
  };

  const getClientSummary = (
    clientName: string,
    date?: Date | null
  ): ClientSummary => {
    const filtered = chartData.filter((entry) => {
      const matchesClient = entry.clientName === clientName;
      const matchesDate = date
        ? entry.decisionTime &&
          new Date(entry.decisionTime).toDateString() === date.toDateString()
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
