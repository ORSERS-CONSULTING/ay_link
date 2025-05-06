import { useEffect, useState } from "react";

type Entry = {
  requestedAmount: number;
  status: "Approved" | "Rejected";
  decisionTime?: string;
  timestamp: string;
};

const normalizeDate = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());

const isSameDay = (d1: Date, d2: Date): boolean =>
  normalizeDate(d1).getTime() === normalizeDate(d2).getTime();

export const useDailyTotal = (
  chartData: Entry[],
  selectedDate?: Date | null
): number => {
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!chartData || chartData.length === 0) return;

    const targetDate = normalizeDate(selectedDate ?? new Date());

    const dailyTotal = chartData
      .filter(
        (entry) =>
          entry.status === "Approved" &&
          (entry.decisionTime || entry.timestamp) &&
          isSameDay(
            normalizeDate(new Date(entry.decisionTime || entry.timestamp)),
            targetDate
          )
      )
      .reduce((sum, entry) => sum + entry.requestedAmount, 0);

    setTotal(dailyTotal);
  }, [chartData, selectedDate]);

  return total;
};
