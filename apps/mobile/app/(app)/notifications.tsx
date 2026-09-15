
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useBadges } from "@/hooks/useBadges";
import { Badge, Empty, Loading } from "@/components/ui";
import { Colors, spacing, radius } from "@/constants/theme";
import { TAB_BAR_CLEARANCE } from "@/constants/layout";
import { str, formatDateDDMMYYYY, formatDateTimeDDMMYYYY, getDayWiseLabel } from "@/lib/format";

type Notif = {
  meta?: any;
  id: string;
  title?: string;
  body?: string;
  message?: string;
  type?: string;
  read?: boolean;
  createdAt?: string;
  data?: any;
  itemId?: string;
  examId?: string;
  studentId?: string;
};

function routeFor(n: Notif): { path: string; params?: Record<string, string> } {
  const type = String(n.type || n.data?.type || n.meta?.type || "").toUpperCase();
  const meta = n.meta || n.data || {};
  const itemId = String(
    meta.examId || n.data?.itemId || n.itemId || n.data?.examId || n.examId || ""
  );
  const childId = String(meta.studentId || n.studentId || n.data?.studentId || "");
  if (type.includes("MARK") || type.includes("EXAM")) {
    const params: Record<string, string> = {};
    if (itemId) params.highlightId = itemId;
    if (childId) params.childId = childId;
    return {
      path: "/(app)/marks",
      params: Object.keys(params).length ? params : undefined,
    };
  }
  if (type.includes("HOMEWORK") || type.includes("HW")) {
    return { path: "/(app)/homework", params: itemId ? { highlightId: itemId } : undefined };
  }
  if (type.includes("ANNOUNCE") || type.includes("NEWS")) {
    return {
      path: "/(app)/announcements",
      params: itemId ? { highlightId: itemId } : undefined,
    };
  }
  if (type.includes("LEAVE") || type.includes("ATTEND") || type.includes("ABSENT")) {
    return { path: "/(app)/attendance" };
  }
  return { path: "/(app)/notifications" };
}

export default function NotificationsScreen() {
  const { themeColor } = useAuth();
  const badges = useBadges();
  const [list, setList] = useState<Notif[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (pageNum = 1, isAppend = false) => {
    if (pageNum === 1 && !isAppend) setInitialLoading(true);
    else if (isAppend) setLoadingMore(true);
    try {
      const data = await api<{
        notifications: Notif[];
        hasMore?: boolean;
        page?: number;
        totalPages?: number;
      }>(`/api/notifications?page=${pageNum}&limit=20`);

      const incoming = data.notifications || [];
      if (isAppend) {
        setList((prev) => {
          const seen = new Set(prev.map((x) => x.id));
          const unique = incoming.filter((x) => !seen.has(x.id));
          return [...prev, ...unique];
        });
      } else {
        setList(incoming);
      }
      setPage(pageNum);
      setHasMore(
        data.hasMore ??
          (data.page != null && data.totalPages != null
            ? data.page < data.totalPages
            : incoming.length === 20)
      );
      if (pageNum === 1) {
        await badges.markNotificationsSeen();
      }
    } catch {
      if (!isAppend) setList([]);
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(1, false);
    }, [load])
  );

  useEffect(() => {
    let unsub: (() => void) | null = null;
    (async () => {
      try {
        const { subscribeMobileNewNotification } = await import("@/lib/socket");
        unsub = await subscribeMobileNewNotification((newNotif) => {
          setList((prev) => {
            if (prev.some((x) => x.id === newNotif.id)) return prev;
            return [newNotif as any, ...prev];
          });
        });
      } catch {
        /* fallback */
      }
    })();
    return () => {
      if (unsub) unsub();
    };
  }, []);

  const onOpen = async (item: Notif) => {
    try {
      if (!item.read) {
        await api("/api/notifications", { method: "POST", body: { id: item.id } });
        setList((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
      }
    } catch {
      /* ignore */
    }
    const r = routeFor(item);
    if (r.path !== "/(app)/notifications") {
      if (r.params) router.push({ pathname: r.path as any, params: r.params });
      else router.push(r.path as any);
    }
  };

  const handleLoadMore = () => {
    if (!hasMore || loadingMore || initialLoading || refreshing) return;
    load(page + 1, true);
  };

  return (
    <View style={styles.root}>
      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator style={{ paddingVertical: 16 }} color={themeColor} />
          ) : null
        }
        contentContainerStyle={{
          padding: spacing.md,
          flexGrow: 1,
          paddingBottom: TAB_BAR_CLEARANCE,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load(1, false);
            }}
            tintColor={themeColor}
          />
        }
        ListEmptyComponent={
          initialLoading ? (
            <ActivityIndicator size="large" color={themeColor} style={{ marginVertical: 32 }} />
          ) : (
            <Empty message="No notifications yet" />
          )
        }
        ListHeaderComponent={
          list.length > 0 ? (
            <Text style={styles.hint}>Tap a notification to open the related page</Text>
          ) : null
        }
        renderItem={({ item, index }) => {
          const currDay = getDayWiseLabel(item.createdAt);
          const prevDay = index > 0 ? getDayWiseLabel(list[index - 1]?.createdAt) : null;
          const showDayHeader = currDay !== prevDay;

          return (
            <View key={item.id}>
              {showDayHeader && (
                <View style={styles.daySeparatorWrap}>
                  <View style={styles.daySeparatorLine} />
                  <View style={styles.daySeparatorBadge}>
                    <Text style={styles.daySeparatorText}>{currDay}</Text>
                  </View>
                  <View style={styles.daySeparatorLine} />
                </View>
              )}
              <Pressable
                onPress={() => onOpen(item)}
                style={[
                  styles.item,
                  !item.read && { borderLeftColor: themeColor, borderLeftWidth: 4 },
                ]}
              >
                <View style={styles.row}>
                  <Text style={styles.title} numberOfLines={1}>
                    {str(item.title || item.type, "Notification")}
                  </Text>
                  {!item.read && <Badge text="New" color={themeColor} />}
                </View>
                {(item.meta?.type === "EXAM_TIMETABLE" || item.data?.type === "EXAM_TIMETABLE") && Array.isArray(item.meta?.table || item.data?.table) ? (
                  <View style={styles.table}>
                    <View style={[styles.tr, styles.thRow]}>
                      <Text style={[styles.th, { flex: 1.1 }]}>Date</Text>
                      <Text style={[styles.th, { flex: 1.6 }]}>Subject</Text>
                    </View>
                    {(item.meta?.table || item.data?.table || []).map((row: any, i: number) => (
                      <View key={i} style={styles.tr}>
                        <Text style={[styles.td, { flex: 1.1 }]}>{formatDateDDMMYYYY(row.date)}</Text>
                        <Text style={[styles.td, { flex: 1.6 }]}>{row.subject}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.body} numberOfLines={3}>
                    {str(item.body || item.message)}
                  </Text>
                )}
                {item.createdAt && (
                  <Text style={styles.time}>{formatDateTimeDDMMYYYY(item.createdAt)}</Text>
                )}
              </Pressable>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  daySeparatorWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 12,
  },
  daySeparatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  daySeparatorBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginHorizontal: 8,
  },
  daySeparatorText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    textAlign: "center",
  },
  hint: { fontSize: 11, color: Colors.textMuted, marginBottom: 8 },
  item: {
    backgroundColor: Colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  title: { fontWeight: "700", fontSize: 15, color: Colors.text, flex: 1 },
  body: { fontSize: 13, color: Colors.textMuted, lineHeight: 18 },
  time: { fontSize: 11, color: Colors.textMuted, marginTop: 6 },
  table: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    overflow: "hidden",
  },
  tr: {
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  thRow: { backgroundColor: "#F8FAFC" },
  th: { fontSize: 11, fontWeight: "800", color: Colors.text },
  td: { fontSize: 12, color: Colors.text },
});
