import { Platform, StatusBar, StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7FAFC",
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
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFF",
    marginLeft: 15,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2D3748",
    marginBottom: 20,
  },
  servicesGrid: {
    gap: 15,
  },
  serviceCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  serviceImageContainer: {
    height: 200,
  },
  serviceImage: {
    width: "100%",
    height: "100%",
  },
  serviceInfo: {
    padding: 15,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2D3748",
  },
  serviceButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  serviceButtonText: {
    color: "#5E72E4",
    fontSize: 14,
    fontWeight: "600",
    marginRight: 5,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2D3748",
  },
  modalScroll: {
    paddingHorizontal: 20,
  },
  applicantItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF2F7",
  },
  applicantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EBF4FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  applicantInfo: {
    flex: 1,
  },
  applicantName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#2D3748",
    marginBottom: 3,
  },
  applicantEmail: {
    fontSize: 14,
    color: "#718096",
  },
  noApplicants: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  noApplicantsText: {
    fontSize: 16,
    color: "#A0AEC0",
    marginTop: 10,
  },
});