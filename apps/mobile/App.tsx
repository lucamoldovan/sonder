import { StatusBar } from "expo-status-bar";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";

export default function App() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <View style={styles.mark}>
          <Text style={styles.markText}>s.</Text>
        </View>
        <Text style={styles.wordmark}>sonder</Text>
        <Text style={styles.tagline}>Your life, in perspective.</Text>
        <Text style={styles.caption}>Your space is taking shape.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0B0B0F"
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32
  },
  mark: {
    width: 64,
    height: 64,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#A78BFA",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20
  },
  markText: {
    color: "#A78BFA",
    fontSize: 32,
    fontWeight: "600"
  },
  wordmark: {
    color: "#F3F0F7",
    fontSize: 34,
    fontWeight: "600",
    letterSpacing: -1.5
  },
  tagline: {
    color: "#AAA5B4",
    fontSize: 14,
    marginTop: 8
  },
  caption: {
    color: "#777280",
    fontSize: 12,
    marginTop: 48
  }
});
