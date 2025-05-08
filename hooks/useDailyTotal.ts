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
) => {
  const [summary, setSummary] = useState({
    totalApproved: 0,
    totalRejected: 0,
    countApproved: 0,
    countRejected: 0,
  });

  useEffect(() => {
    if (!chartData || chartData.length === 0) return;

    const targetDate = normalizeDate(selectedDate ?? new Date());

    let totalApproved = 0;
    let totalRejected = 0;
    let countApproved = 0;
    let countRejected = 0;

    chartData.forEach((entry) => {
      const dateToCompare = normalizeDate(
        new Date(entry.decisionTime || entry.timestamp)
      );

      if (!isSameDay(dateToCompare, targetDate)) return;

      if (entry.status === "Approved") {
        totalApproved += entry.requestedAmount;
        countApproved++;
      } else if (entry.status === "Rejected") {
        totalRejected += entry.requestedAmount;
        countRejected++;
      }
    });

    setSummary({
      totalApproved,
      totalRejected,
      countApproved,
      countRejected,
    });
  }, [chartData, selectedDate]);

  return summary;
};
