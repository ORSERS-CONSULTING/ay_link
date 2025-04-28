import React from "react";
import { Text, View } from "react-native";
import { BarChart } from "react-native-gifted-charts";
import { Dimensions } from "react-native";

const screenWidth = Dimensions.get("window").width;
const chartContainerPadding = 8 * 2; // horizontal padding from container
const chartContainerMargin = 8 * 2; // horizontal margin from container
const fullChartWidth =
  screenWidth - chartContainerPadding - chartContainerMargin;

export default function SummaryChart() {
  const chartData = [
    { value: 12000, label: "ABC Ltd" },
    { value: 25000, label: "Global Inc" },
    { value: 1800, label: "Smart Co" },
    { value: 3000, label: "Future LLC" },
  ];

  return (
    <View
      style={{
        padding: 16,
        backgroundColor: "#fff",
        borderRadius: 16,
        margin: 16,
        width: "99%",
        alignSelf: "center",
        elevation: 3,
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        overflow: "hidden",
      }}
    >
      <Text
        style={{
          fontWeight: "bold",
          fontSize: 18,
          marginBottom: 16,
          color: "black",
          textAlign: "center",
        }}
      >
        Approved Credit Summary
      </Text>
      <Text
        style={{
          fontSize: 16,
          color: "black",
          opacity: 0.5,
        }}
      >
        Total Credit Approved
      </Text>
      <Text style={{ fontWeight: "bold", fontSize: 24 }}>AED 300,000</Text>

      <BarChart
        data={chartData}
        barWidth={28}
        height={240}
        width={fullChartWidth}
        barBorderRadius={8}
        showGradient
        frontColor={"#7c3aed"}
        gradientColor={"#4f46e5"}
        spacing={30}
        noOfSections={5}
        yAxisLabelTexts={["0", "5,000", "10,000", "15,000", "20,000", "25,0000"]}
        yAxisLabelWidth={40}
        yAxisThickness={0}
        xAxisThickness={0}
        xAxisLabelTextStyle={{ color: "gray", fontSize: 12, marginTop: 4 }}
        yAxisTextStyle={{ color: "gray" }}
        isAnimated
        animationDuration={400}
        rulesColor="#eee"
        backgroundColor="white"
      />
    </View>
  );
}
