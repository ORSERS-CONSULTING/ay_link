import { Stack, useRouter } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import React, { useEffect } from "react";
import { useSelectedRequest } from "@/context/SelectedRequestContext";

export default function RequestDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { selectedRequest, setSelectedRequest } = useSelectedRequest(); // ✅ Get setter too

  useEffect(() => {
    // When component unmounts, clear the selected request
    return () => {
      setSelectedRequest(null);
    };
  }, [setSelectedRequest]);

  if (!selectedRequest) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Text style={{ color: "#fff", textAlign: "center", marginTop: 50 }}>
          No request selected.
        </Text>
      </SafeAreaView>
    );
  }

  const {
    clientName,
    companyCode,
    currentBalance,
    departmentName,
    requestedAmount,
    status,
    timestamp,
    decisionTime,
    approver,
    rejectionNote,
    reason,
  } = selectedRequest;

  const urgencyRatio = requestedAmount / (currentBalance || 1);
  let urgencyLevel = "Low";
  let urgencyColor = "#27AE60";

  if (urgencyRatio > 1.5) urgencyLevel = "High", urgencyColor = "#E74C3C";
  else if (urgencyRatio > 1) urgencyLevel = "Medium", urgencyColor = "#F5A623";

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: Platform.OS === "android" ? insets.top + 4 : 0,
          paddingBottom: insets.bottom + 16, // extra 16 for nice scroll ending
          paddingHorizontal: 16,
        }}
        showsVerticalScrollIndicator={false} // optional: hides scrollbar
        bounces={true} // ✅ optional: makes it bounce slightly like iOS style
      >
        <Stack.Screen options={{ headerShown: false }} />
  
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
  
        <View style={styles.card}>
          <Text style={styles.clientName}>{clientName}</Text>
  
          <Text style={styles.label}>Company Code</Text>
          <Text style={styles.value}>{companyCode}</Text>
  
          <Text style={styles.label}>Department</Text>
          <Text style={styles.value}>{departmentName}</Text>
  
          <View style={styles.separator} />
  
          <Text style={styles.label}>Current Balance</Text>
          <Text style={styles.value}>AED {currentBalance}</Text>
  
          <Text style={styles.label}>Requested Amount</Text>
          <Text style={styles.value}>AED {requestedAmount}</Text>
  
          {reason && (
            <>
              <Text style={styles.label}>Reason for Request</Text>
              <Text style={styles.value}>{reason}</Text>
            </>
          )}
  
          <View style={styles.separator} />
  
          <Text style={styles.label}>Urgency</Text>
          <Text style={[styles.value, { color: urgencyColor }]}>
            {urgencyLevel}
          </Text>
  
          <Text style={styles.label}>Status</Text>
          <Text
            style={[
              styles.value,
              status === "Approved"
                ? styles.approved
                : status === "Rejected"
                ? styles.rejected
                : styles.pending,
            ]}
          >
            {status}
          </Text>
  
          <Text style={styles.label}>Submitted At</Text>
          <Text style={styles.value}>
            {new Date(timestamp).toLocaleString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
  
          {status !== "Pending" && (
            <>
              <View style={styles.separator} />
              <Text style={styles.label}>Decision Time</Text>
              <Text style={styles.value}>
                {decisionTime
                  ? new Date(decisionTime).toLocaleString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "-"}
              </Text>
  
              <Text style={styles.label}>Approver</Text>
              <Text style={styles.value}>{approver || "-"}</Text>
            </>
          )}
  
          {status === "Rejected" && rejectionNote && (
            <>
              <View style={styles.separator} />
              <Text style={styles.label}>Rejection Note</Text>
              <Text style={styles.note}>{rejectionNote}</Text>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#1E1E4B",
  },
  backButton: {
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  clientName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1E1E4B",
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: "#888",
    marginTop: 12,
  },
  value: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  approved: {
    color: "#27AE60",
  },
  rejected: {
    color: "#E74C3C",
  },
  pending: {
    color: "#F5A623",
  },
  note: {
    fontSize: 14,
    fontStyle: "italic",
    color: "#E74C3C",
    marginTop: 4,
  },
  separator: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 16,
  },
});
