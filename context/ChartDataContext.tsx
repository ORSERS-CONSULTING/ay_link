import React, { createContext, useContext, useState } from "react";

type ApprovedEntry = {
  clientName: string;
  requestedAmount: number;
  departmentName: string;
  companyCode: string;
};

type ChartDataContextType = {
  chartData: ApprovedEntry[];
  setChartData: React.Dispatch<React.SetStateAction<ApprovedEntry[]>>;
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
  return (
    <ChartDataContext.Provider value={{ chartData, setChartData }}>
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
