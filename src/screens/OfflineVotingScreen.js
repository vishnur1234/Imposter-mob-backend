import React, { useEffect, useState } from "react";
import { View, StyleSheet, Text, TouchableOpacity, SafeAreaView, ScrollView, Alert, ActivityIndicator, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { auth } from "../services/authService";
import { subscribeToRoom, updateRoom } from "../services/roomService";
import { useTheme } from "../context/ThemeContext";
import { getAvatarByIndex } from "../services/avatarService";

export default function OfflineVotingScreen({ route, navigation }) {
  const { colors, typography } = useTheme();
  const { course, players, topic, imposterIndex, scores, roomCode, isHost } = route.params || {};

  const [dbRoom, setDbRoom] = useState(null);
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const playerList = Array.isArray(players) ? players : [];
  const currentUid = auth.currentUser?.uid;

  const handleQuit = () => {
    Alert.alert(
      "Quit Game",
      "Are you sure you want to quit and return to the main menu?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Quit", style: "destructive", onPress: () => navigation.reset({ index: 0, routes: [{ name: "Home" }] }) }
      ]
    );
  };

  // Listen for updates and transitions
  useEffect(() => {
    if (!roomCode) return;
    const unsub = subscribeToRoom(roomCode, (data) => {
      if (!data) return;
      setDbRoom(data);

      if (data.gameStatus === "offline_result") {
        navigation.navigate("OfflineResult", {
          course: data.category || course,
          players: playerList,
          topic: data.topic || topic,
          imposterIndex: data.imposterIndex ?? imposterIndex,
          votes: Object.values(data.votes || {}),
          tally: data.tally || {},
          imposterCaught: data.imposterCaught ?? false,
          scores: data.scores || {},
          roomCode,
          isHost,
        });
      }
    });
    return unsub;
  }, [roomCode]);

  const votesObj = dbRoom?.votes || {};
  const hasVoted = currentUid in votesObj;
  const votedCount = Object.keys(votesObj).length;

  // Host computes the scores and triggers transition once everyone votes
  useEffect(() => {
    if (!isHost || !dbRoom || !roomCode) return;
    if (dbRoom.gameStatus !== "offline_voting") return;

    const currentVotes = dbRoom.votes || {};
    const totalPlayers = dbRoom.players || [];
    if (Object.keys(currentVotes).length >= totalPlayers.length) {
      const tallyTally = async () => {
        try {
          // Tally votes
          const tally = {};
          totalPlayers.forEach((p) => { tally[p.uid] = 0; });
          Object.values(currentVotes).forEach((uid) => {
            if (uid && tally[uid] !== undefined) tally[uid]++;
          });

          // Find most voted
          const maxVotes = Math.max(...Object.values(tally));
          const mostVotedUids = Object.keys(tally).filter((uid) => tally[uid] === maxVotes);
          const imposterUid = totalPlayers[imposterIndex]?.uid;
          const imposterCaught = mostVotedUids.includes(imposterUid);

          // Compute winners and losers
          const winners = [];
          const losers = [];

          // The Imposter is a Winner if they survived (not caught); otherwise a Loser
          if (!imposterCaught) {
            winners.push(imposterUid);
          } else {
            losers.push(imposterUid);
          }

          // Each student is a Winner if they correct voted for the Imposter; otherwise a Loser
          totalPlayers.forEach(p => {
            if (p.uid !== imposterUid) {
              const votedForUid = currentVotes[p.uid];
              if (votedForUid === imposterUid) {
                winners.push(p.uid);
              } else {
                losers.push(p.uid);
              }
            }
          });

          // Calculate pot and payouts (matches GamePlayScreen's pot system)
          const entryFee = Number(dbRoom.bettingAmount || 50);
          const totalPot = totalPlayers.length * entryFee;
          const winnerEarnedShare = winners.length > 0 ? Math.floor(totalPot / winners.length) : 0;

          const prevScores = dbRoom.scores || scores || {};
          const updatedScores = { ...prevScores };

          totalPlayers.forEach((p) => {
            let earned = 0;
            if (winners.includes(p.uid)) {
              earned = winnerEarnedShare - entryFee; // Winner Net Score
            } else {
              earned = -entryFee; // Loser Net Score
            }
            updatedScores[p.uid] = (prevScores[p.uid] || 0) + earned;
          });

          await updateRoom(roomCode, {
            gameStatus: "offline_result",
            tally,
            imposterCaught,
            scores: updatedScores,
          });
        } catch (e) {
          console.log("Failed to tally votes automatically:", e.message);
        }
      };
      tallyTally();
    }
  }, [dbRoom, isHost, imposterIndex, roomCode]);

  const handleConfirmVote = async () => {
    if (!selected) {
      Alert.alert("Select a player", "Please tap someone to vote for them.");
      return;
    }
    setSubmitting(true);
    try {
      await updateRoom(roomCode, {
        [`votes.${currentUid}`]: selected
      });
    } catch (e) {
      Alert.alert("Error", `Failed to submit vote: ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LinearGradient colors={colors.gradientBg} locations={[0, 0.4, 1]} style={styles.bg}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: "transparent" }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="hand-left-outline" size={18} color={colors.error} />
            <Text style={[typography.sub2, { color: colors.textPrimary }]}>VOTING</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Text style={[typography.body3, { color: colors.textSecondary }]}>{votedCount}/{playerList.length} voted</Text>
            <TouchableOpacity onPress={handleQuit} style={[styles.quitBtn, { backgroundColor: colors.isDark ? "#121212" : "#F1F5F9", borderColor: colors.border }]}>
              <Ionicons name="log-out-outline" size={16} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {hasVoted ? (
            <View style={[styles.voterCard, {
              backgroundColor: colors.isDark ? "rgba(0,185,111,0.1)" : "#ECFDF5",
              borderColor: colors.isDark ? "rgba(0,185,111,0.3)" : "rgba(16,185,129,0.2)",
            }]}>
              <View style={[styles.avatar, { backgroundColor: colors.isDark ? "rgba(0,185,111,0.2)" : "#D1FAE5" }]}>
                <Ionicons name="checkmark-done" size={24} color={colors.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.sub2, { color: colors.success, marginBottom: 2 }]}>VOTE SUBMITTED</Text>
                <Text style={[typography.body3, { color: colors.textSecondary }]}>
                  Waiting for other players to submit their votes...
                </Text>
              </View>
            </View>
          ) : (
            <View style={[styles.voterCard, {
              backgroundColor: colors.isDark ? "rgba(211,47,47,0.1)" : "#FEF2F2",
              borderColor: colors.isDark ? "rgba(211,47,47,0.3)" : "rgba(239,68,68,0.2)",
            }]}>
              <View style={[styles.avatar, { backgroundColor: colors.isDark ? "rgba(211,47,47,0.2)" : "#FEE2E2" }]}>
                <Ionicons name="alert-circle-outline" size={24} color={colors.error} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.sub2, { color: colors.error, marginBottom: 2 }]}>YOUR VOTE IS SECRET</Text>
                <Text style={[typography.body3, { color: colors.textSecondary }]}>
                  Select who you think is the imposter and confirm your vote.
                </Text>
              </View>
            </View>
          )}

          {!hasVoted && (
            <>
              <Text style={[typography.sub2, { color: colors.textSecondary, marginBottom: 10, marginTop: 4 }]}>TAP TO SELECT YOUR SUSPECT</Text>
              {playerList.map((p, i) => {
                const isSelf = p.uid === currentUid;
                const isSelected = selected === p.uid;
                return (
                  <TouchableOpacity
                    key={p.uid}
                    disabled={isSelf || submitting}
                    onPress={() => setSelected(isSelected ? null : p.uid)}
                    activeOpacity={0.8}
                    style={[
                      styles.playerRow,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                      isSelf && { opacity: 0.3 },
                      isSelected && { backgroundColor: colors.isDark ? "rgba(211,47,47,0.15)" : "#FEF2F2", borderColor: colors.error },
                    ]}
                  >
                    <View style={[styles.playerAvatar, { backgroundColor: isSelected ? (colors.isDark ? "rgba(211,47,47,0.25)" : "#FEE2E2") : colors.primaryLight, overflow: "hidden" }]}>
                      <Image
                        source={getAvatarByIndex(i)}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="cover"
                      />
                    </View>
                    <Text style={[typography.body1, { color: isSelected ? colors.error : colors.textPrimary, flex: 1, fontWeight: isSelected ? "700" : "400" }]}>
                      {p.name}{isSelf ? " (You)" : ""}
                    </Text>
                    {isSelected && <Ionicons name="alert-circle" size={22} color={colors.error} />}
                    {!isSelected && !isSelf && <View style={[styles.emptyCircle, { borderColor: colors.border }]} />}
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity onPress={handleConfirmVote} disabled={submitting} activeOpacity={0.85} style={[styles.confirmWrap, { marginTop: 20 }]}>
                <LinearGradient colors={colors.gradientDanger} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.confirmBtn}>
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={22} color="#FFF" />
                      <Text style={[typography.btn1, { color: "#FFF" }]}>CONFIRM SECRET VOTE</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}

          {/* Voter progress */}
          <View style={[styles.progressCard, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 16 }]}>
            <Text style={[typography.sub2, { color: colors.textSecondary, marginBottom: 10 }]}>VOTING PROGRESS ({votedCount}/{playerList.length})</Text>
            <View style={styles.voterRow}>
              {playerList.map((p) => {
                const voted = p.uid in votesObj;
                return (
                  <View key={p.uid} style={styles.voterChip}>
                    <View style={[styles.voterDot, {
                      backgroundColor: voted ? colors.success : colors.border,
                    }]}>
                      {voted ? (
                        <Ionicons name="checkmark" size={10} color="#FFF" />
                      ) : (
                        <Ionicons name="ellipse" size={8} color="#FFF" />
                      )}
                    </View>
                    <Text style={[typography.body4, { color: colors.textSecondary, textAlign: "center" }]} numberOfLines={1}>{p.name.split(" ")[0]}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 18, borderBottomWidth: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  voterCard: { flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 1, borderRadius: 20, padding: 18, marginBottom: 20 },
  avatar: { width: 52, height: 52, borderRadius: 26, justifyContent: "center", alignItems: "center" },
  playerRow: { flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 10 },
  playerAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  emptyCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2 },
  confirmWrap: { borderRadius: 18, overflow: "hidden" },
  confirmBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 18 },
  progressCard: { borderWidth: 1, borderRadius: 18, padding: 16 },
  voterRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  voterChip: { alignItems: "center", gap: 4, minWidth: 40 },
  voterDot: { width: 24, height: 24, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  quitBtn: {
    width: 34, height: 34, borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center", alignItems: "center",
  },
});
