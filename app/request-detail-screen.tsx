import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function RequestDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const clientName = params.clientName ?? "Unknown";
  const currentBalance = Number(params.currentBalance) || 0;
  const requestedAmount = Number(params.requestedAmount) || 0;
  const status = params.status ?? "Unknown";
  const timestamp = params.timestamp ?? "N/A";
  const decisionTime = params.decisionTime ?? "";
  const approver = params.approver ?? "";
  const rejectionNote = params.rejectionNote ?? "";

  const urgencyRatio = requestedAmount / currentBalance;
  let urgencyLevel = "Low";
  let urgencyColor = "#27AE60"; // Green

  if (urgencyRatio > 1.5) {
    urgencyLevel = "High";
    urgencyColor = "#E74C3C"; // Red
  } else if (urgencyRatio > 1) {
    urgencyLevel = "Medium";
    urgencyColor = "#F5A623"; // Orange
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Detail Card */}
      <View style={styles.card}>
        <Text style={styles.clientName}>{clientName}</Text>

        <Text style={styles.label}>Current Balance</Text>
        <Text style={styles.value}>AED {currentBalance}</Text>

        <Text style={styles.label}>Requested Amount</Text>
        <Text style={styles.value}>AED {requestedAmount}</Text>

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
        <Text style={styles.value}>{timestamp}</Text>

        {status !== "Pending" && (
          <>
            <Text style={styles.label}>Decision Time</Text>
            <Text style={styles.value}>{decisionTime || "-"}</Text>

            <Text style={styles.label}>Approver</Text>
            <Text style={styles.value}>{approver || "-"}</Text>
          </>
        )}

        {rejectionNote ? (
          <>
            <Text style={styles.label}>Rejection Note</Text>
            <Text style={styles.note}>{rejectionNote}</Text>
          </>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1E1E4B",
    paddingHorizontal: 16,
    paddingTop: 16,
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
});
