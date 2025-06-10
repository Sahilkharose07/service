import { StyleSheet, Platform, StatusBar } from "react-native";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 40,
    paddingBottom: 20,
    backgroundColor: "#5E72E4",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFF",
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  notificationCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: "#5E72E4",
  },
  notificationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  title: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#2d3748",
  },
  description: {
    color: "#4a5568",
    marginBottom: 12,
    lineHeight: 20,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  time: {
    fontSize: 12,
    color: "#718096",
  },
  dismissButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#fff1f2",
  },
  close: {
    color: "#dc2626",
    fontWeight: "500",
  },
  noNotificationText: {
    textAlign: "center",
    color: "#666",
    marginTop: 16,
    fontSize: 18,
    fontWeight: "500",
  },
  emptySubtext: {
    textAlign: "center",
    color: "#a0aec0",
    marginTop: 8,
  },
});

export default styles;
