import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, getApiBase, getApiBaseSync, resolveMediaUrlSync } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { SearchBar, matchesSearch } from "@/components/SearchBar";
import { Colors } from "@/constants/theme";
import { TAB_BAR_CLEARANCE } from "@/constants/layout";

function TopRankerPhoto({
  photoUrl,
  name,
  apiBase,
  accentColor = "#F59E0B",
}: {
  photoUrl?: string | null;
  name?: string;
  apiBase?: string;
  accentColor?: string;
}) {
  const [hasError, setHasError] = useState(false);
  const base = apiBase || getApiBaseSync();
  const uri = !hasError && photoUrl ? resolveMediaUrlSync(photoUrl, base) : undefined;
  const initialLetter = ((name || "S").trim()[0] || "S").toUpperCase();

  useEffect(() => {
    setHasError(false);
  }, [photoUrl, base]);

  if (uri && !hasError) {
    return (
      <ExpoImage
        source={{ uri }}
        style={styles.photoImage}
        contentFit="cover"
        transition={150}
        cachePolicy="memory-disk"
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <View style={[styles.photoInitialBox, { backgroundColor: accentColor }]}>
      <Text style={styles.initialText}>{initialLetter}</Text>
    </View>
  );
}

export default function TopStudentsScreen() {
  const { user, themeColor } = useAuth();
  const color = themeColor || Colors.primary;
  const [topClasses, setTopClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState("");
  const [selectedClassTab, setSelectedClassTab] = useState("ALL");
  const [apiBase, setApiBase] = useState(() => getApiBaseSync());

  useEffect(() => {
    getApiBase().then(setApiBase);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const data = await api<any>("/api/dashboard/stats");
      setTopClasses(data.topStudents || data.topStudentsByClass || []);
    } catch (e) {
      console.error("Failed to load top students", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  // Flatten #1 rankers for All Classes view
  const top1stRankers = useMemo(() => {
    return (topClasses || [])
      .map((cls: any) => {
        const first = cls.students?.[0];
        if (!first) return null;
        return {
          ...first,
          classLabel: cls.classLabel,
          className: cls.className,
          section: cls.section,
          allClassRankers: cls.students || [],
        };
      })
      .filter(Boolean) as any[];
  }, [topClasses]);

  // Filtered list based on selected tab and search query
  const displayedStudents = useMemo(() => {
    let list: any[] = [];
    if (selectedClassTab === "ALL") {
      list = top1stRankers;
    } else {
      const targetClass = topClasses.find((cls: any) => {
        const tabKey = `${cls.className}||${cls.section || ""}`;
        return tabKey === selectedClassTab || cls.className === selectedClassTab;
      });
      if (targetClass && targetClass.students) {
        list = targetClass.students.map((st: any, idx: number) => ({
          ...st,
          classLabel: targetClass.classLabel,
          className: targetClass.className,
          section: targetClass.section,
          rank: st.rank || idx + 1,
        }));
      }
    }

    if (!q.trim()) return list;

    return list.filter((s) => {
      const name = `${s.firstName || ""} ${s.lastName || ""}`;
      const roll = s.rollNumber || s.rollNo || "";
      const cls = s.classLabel || "";
      return (
        matchesSearch(name, q) ||
        matchesSearch(roll, q) ||
        matchesSearch(cls, q)
      );
    });
  }, [selectedClassTab, top1stRankers, topClasses, q]);

  const renderStudentCard = ({ item: s, index }: { item: any; index: number }) => {
    const studentPhoto = s.photoUrl || s.avatar || s.photo || s.image || null;
    const isRank1 = s.rank === 1 || !s.rank;

    return (
      <Pressable
        key={s.id || index}
        style={({ pressed }) => [
          styles.studentCard,
          { opacity: pressed ? 0.92 : 1 },
        ]}
        onPress={() => {
          router.push({
            pathname: "/(app)/students",
            params: { highlight: s.id },
          });
        }}
      >
        {/* Top Accent Bar */}
        <View
          style={[
            styles.cardAccent,
            { backgroundColor: isRank1 ? "#F59E0B" : color },
          ]}
        />

        {/* Card Header: Class & Rank Badge */}
        <View style={styles.cardHeader}>
          <View style={styles.classBadge}>
            <Ionicons name="school-outline" size={11} color="#4F46E5" />
            <Text style={styles.classBadgeText} numberOfLines={1}>
              Class {s.classLabel}
            </Text>
          </View>
          <View
            style={[
              styles.rankBadge,
              isRank1 ? { backgroundColor: "#FEF3C7" } : { backgroundColor: "#EEF2FF" },
            ]}
          >
            {isRank1 ? (
              <Ionicons name="trophy" size={12} color="#D97706" />
            ) : (
              <Text style={[styles.rankText, { color }]}>#{s.rank}</Text>
            )}
          </View>
        </View>

        {/* 90% Width 1:1 Aspect Ratio Student Profile Showcase */}
        <View style={styles.photoContainer}>
          <View
            style={[
              styles.photoFrame,
              isRank1 ? { backgroundColor: "#F59E0B" } : { backgroundColor: color },
            ]}
          >
            <TopRankerPhoto
              photoUrl={studentPhoto}
              name={s.firstName}
              apiBase={apiBase || getApiBaseSync()}
              accentColor={isRank1 ? "#F59E0B" : color}
            />
          </View>
        </View>

        {/* Student Name & Roll */}
        <View style={styles.infoBox}>
          <Text style={styles.studentName} numberOfLines={1}>
            {s.firstName} {s.lastName || ""}
          </Text>
          {(s.rollNumber || s.rollNo) ? (
            <Text style={styles.rollText} numberOfLines={1}>
              Roll: <Text style={{ fontWeight: "700" }}>{s.rollNumber || s.rollNo}</Text>
            </Text>
          ) : null}
        </View>

        {/* Marks & Percentage Box */}
        <View style={styles.scoreBox}>
          <View style={{ flex: 1 }}>
            <Text style={styles.scoreLabel}>TOTAL MARKS</Text>
            <Text style={styles.scoreVal} numberOfLines={1}>
              {s.totalMarks}
              <Text style={styles.scoreMaxVal}>/{s.maxMarks}</Text>
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.scoreLabel}>PERCENTAGE</Text>
            <Text style={styles.scorePctVal}>{s.percentage}%</Text>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header Banner */}
      <View style={styles.banner}>
        <View style={styles.bannerRow}>
          <View style={styles.trophyIconWrap}>
            <Ionicons name="trophy" size={20} color="#D97706" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Class Top Rankers</Text>
            <Text style={styles.bannerSub}>
              Top performing students across classes in descending order
            </Text>
          </View>
          <View style={styles.countBadge}>
            <Ionicons name="sparkles" size={12} color="#D97706" />
            <Text style={styles.countBadgeText}>
              {displayedStudents.length} {displayedStudents.length === 1 ? "Ranker" : "Rankers"}
            </Text>
          </View>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrap}>
        <SearchBar
          value={q}
          onChangeText={setQ}
          placeholder="Search by student name, roll, or class..."
        />
      </View>

      {/* Horizontal Class Tabs */}
      <View style={styles.tabsWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
        >
          <Pressable
            onPress={() => setSelectedClassTab("ALL")}
            style={[
              styles.tabChip,
              selectedClassTab === "ALL" && { backgroundColor: color, borderColor: color },
            ]}
          >
            <Text
              style={[
                styles.tabChipText,
                selectedClassTab === "ALL" && { color: "#fff" },
              ]}
            >
              All Classes ({top1stRankers.length})
            </Text>
          </Pressable>
          {topClasses.map((cls: any) => {
            const tabKey = `${cls.className}||${cls.section || ""}`;
            const isSelected = selectedClassTab === tabKey;
            return (
              <Pressable
                key={tabKey}
                onPress={() => setSelectedClassTab(tabKey)}
                style={[
                  styles.tabChip,
                  isSelected && { backgroundColor: color, borderColor: color },
                ]}
              >
                <Text
                  style={[
                    styles.tabChipText,
                    isSelected && { color: "#fff" },
                  ]}
                >
                  Class {cls.classLabel}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Student List Grid */}
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={color} />
          <Text style={styles.loadingText}>Loading top rankers...</Text>
        </View>
      ) : (
        <FlatList
          data={displayedStudents}
          keyExtractor={(item, index) => item.id || String(index)}
          renderItem={renderStudentCard}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: TAB_BAR_CLEARANCE + 20 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={color}
              colors={[color]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="ribbon-outline" size={32} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>No Top Students Found</Text>
              <Text style={styles.emptySub}>
                {q
                  ? "No students match your search criteria."
                  : "Class rankers will appear here once exam marks are recorded and published."}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  banner: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  bannerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  trophyIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.text,
  },
  bannerSub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  countBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  countBadgeText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#B45309",
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  tabsWrap: {
    paddingVertical: 8,
    flexShrink: 0,
  },
  tabsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tabChip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  tabChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.text,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  columnWrapper: {
    justifyContent: "space-between",
    marginBottom: 12,
  },
  studentCard: {
    width: "48.5%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
    position: "relative",
  },
  cardAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3.5,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    marginTop: 2,
  },
  classBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E7FF",
    maxWidth: "75%",
  },
  classBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#4338CA",
  },
  rankBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: {
    fontSize: 10,
    fontWeight: "900",
  },
  photoContainer: {
    width: "100%",
    alignItems: "center",
    marginVertical: 4,
  },
  photoFrame: {
    width: "90%",
    aspectRatio: 1,
    borderRadius: 16,
    padding: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: "hidden",
  },
  photoImage: {
    width: "100%",
    height: "100%",
    borderRadius: 14,
    backgroundColor: "#fff",
  },
  photoInitialBox: {
    width: "100%",
    height: "100%",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  initialText: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "900",
  },
  infoBox: {
    alignItems: "center",
    marginTop: 8,
    marginBottom: 6,
  },
  studentName: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.text,
    textAlign: "center",
  },
  rollText: {
    fontSize: 10.5,
    color: Colors.textMuted,
    marginTop: 1,
  },
  scoreBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginTop: 4,
  },
  scoreLabel: {
    fontSize: 8,
    fontWeight: "800",
    color: Colors.textMuted,
    letterSpacing: 0.4,
  },
  scoreVal: {
    fontSize: 11,
    fontWeight: "900",
    color: Colors.text,
    marginTop: 1,
  },
  scoreMaxVal: {
    fontSize: 9,
    fontWeight: "600",
    color: Colors.textMuted,
  },
  scorePctVal: {
    fontSize: 11,
    fontWeight: "900",
    color: "#16A34A",
    marginTop: 1,
  },
  centerLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textMuted,
  },
  emptyWrap: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginTop: 20,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.text,
  },
  emptySub: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
    maxWidth: 260,
  },
});
