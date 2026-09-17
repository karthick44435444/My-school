import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { fetchSubscription, upgradeSubscription } from '@/lib/api';
import { Colors, radius, spacing } from '@/constants/theme';
import { TAB_BAR_CLEARANCE } from '@/constants/layout';
import { SUBSCRIPTION_PLANS, SubscriptionPlanInfo } from '@myschool/shared';

export default function SubscriptionScreen() {
  const { user, themeColor, refresh } = useAuth();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [upgradingId, setUpgradingId] = useState<string | null>(null);

  const color = themeColor || Colors.primary;

  const loadData = async () => {
    try {
      const sub = await fetchSubscription();
      setSubscription(sub);
    } catch (e: any) {
      console.warn('Failed to load subscription', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleUpgrade = (plan: SubscriptionPlanInfo) => {
    Alert.alert(
      'Confirm Plan Upgrade',
      'Activate ' + plan.name + ' for ₹' + plan.price + ' (' + plan.billingInterval + ')?\n\nDuration: +' + plan.durationDays + ' days.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Activate Now',
          style: 'default',
          onPress: async () => {
            try {
              setUpgradingId(plan.id);
              const res = await upgradeSubscription(plan.id);
              Alert.alert('Success 🎉', res.message || 'Subscription updated successfully!');
              await refresh();
              await loadData();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to update subscription');
            } finally {
              setUpgradingId(null);
            }
          },
        },
      ]
    );
  };

  if (loading && !subscription) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: TAB_BAR_CLEARANCE + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Skeleton */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Subscription & Plan</Text>
            <View style={[styles.statusBadge, { backgroundColor: '#E2E8F0' }]}>
              <ActivityIndicator size="small" color={color} />
              <Text style={[styles.statusText, { color: '#64748B', marginLeft: 4 }]}>Loading...</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>
            Manage school subscription and renewal plans.
          </Text>
        </View>

        {/* Current Active Plan Skeleton Card */}
        <View style={[styles.currentCard, { backgroundColor: color }]}>
          <View style={styles.currentCardTop}>
            <View style={styles.planIconCircle}>
              <ActivityIndicator size="small" color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.currentCardLabel}>CURRENT ACTIVE PLAN</Text>
              <View style={styles.skeletonTitle} />
            </View>
          </View>

          <View style={styles.divider} />

          {/* Valid date and Days Left Loaders */}
          <View style={styles.currentCardMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={16} color="rgba(255,255,255,0.8)" />
              <Text style={styles.metaLabel}>Valid Until:</Text>
              <View style={styles.loaderMetaRow}>
                <ActivityIndicator size="small" color="#FFFFFF" style={{ transform: [{ scale: 0.7 }] }} />
                <Text style={styles.metaValueLoading}>Fetching...</Text>
              </View>
            </View>

            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={16} color="rgba(255,255,255,0.8)" />
              <Text style={styles.metaLabel}>Days Left:</Text>
              <View style={styles.loaderMetaRow}>
                <ActivityIndicator size="small" color="#FCD34D" style={{ transform: [{ scale: 0.7 }] }} />
                <Text style={[styles.metaValueLoading, { color: '#FDE68A' }]}>Calculating...</Text>
              </View>
            </View>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.currentRateText}>Active Rate</Text>
            <View style={styles.skeletonRate} />
          </View>
        </View>

        {/* Available Plans Skeleton Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Available Upgrade Plans</Text>
          <Text style={styles.sectionSub}>Choose a plan to extend school service instantly</Text>
        </View>

        {/* 3 Skeleton Cards */}
        {[1, 2, 3].map((idx) => (
          <View key={idx} style={[styles.planCard, { opacity: 0.75 }]}>
            <View style={styles.planCardHeader}>
              <View style={[styles.skeletonBlock, { width: 140, height: 20, marginBottom: 8 }]} />
              <View style={[styles.skeletonBlock, { width: '85%', height: 14 }]} />
            </View>
            <View style={[styles.skeletonBlock, { width: 100, height: 32, marginVertical: spacing.md }]} />
            <View style={{ gap: 8, marginVertical: spacing.sm }}>
              <View style={[styles.skeletonBlock, { width: '70%', height: 14 }]} />
              <View style={[styles.skeletonBlock, { width: '80%', height: 14 }]} />
              <View style={[styles.skeletonBlock, { width: '60%', height: 14 }]} />
            </View>
            <View style={[styles.skeletonBlock, { width: '100%', height: 44, marginTop: spacing.md, borderRadius: radius.lg }]} />
          </View>
        ))}
      </ScrollView>
    );
  }

  const isExpired = subscription?.isExpired;
  const daysLeft = subscription?.daysRemaining ?? 0;
  const expiryDate = subscription?.planExpiresAt
    ? new Date(subscription.planExpiresAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '--';

  const currentPlan = subscription?.currentPlan || SUBSCRIPTION_PLANS[0];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: TAB_BAR_CLEARANCE + 32 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[color]} />}
    >
      {/* Header Info */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Subscription & Plan</Text>
          <View
            style={[
              styles.statusBadge,
              isExpired ? styles.expiredBadge : styles.activeBadge,
            ]}
          >
            <Ionicons
              name={isExpired ? 'alert-circle' : 'checkmark-circle'}
              size={14}
              color={isExpired ? '#E11D48' : '#10B981'}
            />
            <Text
              style={[
                styles.statusText,
                { color: isExpired ? '#E11D48' : '#10B981' },
              ]}
            >
              {isExpired ? 'Expired' : 'Active'}
            </Text>
          </View>
        </View>
        <Text style={styles.subtitle}>
          Manage school subscription and renewal plans.
        </Text>
      </View>

      {/* Current Active Plan Card */}
      <View
        style={[
          styles.currentCard,
          isExpired ? styles.currentCardExpired : { backgroundColor: color },
        ]}
      >
        <View style={styles.currentCardTop}>
          <View style={styles.planIconCircle}>
            <Ionicons name='sparkles' size={20} color='#F59E0B' />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.currentCardLabel}>CURRENT ACTIVE PLAN</Text>
            <Text style={styles.currentPlanName}>{currentPlan.name}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.currentCardMeta}>
          <View style={styles.metaItem}>
            <Ionicons name='calendar-outline' size={16} color='rgba(255,255,255,0.8)' />
            <Text style={styles.metaLabel}>Valid Until:</Text>
            <Text style={styles.metaValue}>{expiryDate}</Text>
          </View>

          <View style={styles.metaItem}>
            <Ionicons name='time-outline' size={16} color='rgba(255,255,255,0.8)' />
            <Text style={styles.metaLabel}>Days Left:</Text>
            <Text
              style={[
                styles.metaValue,
                { color: isExpired ? '#FDA4AF' : '#6EE7B7', fontWeight: '800' },
              ]}
            >
              {isExpired ? ('Expired (' + Math.abs(daysLeft) + 'd)') : (daysLeft + ' Days')}
            </Text>
          </View>
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.currentRateText}>Active Rate</Text>
          <Text style={styles.priceValue}>
            ₹{currentPlan.price}{' '}
            <Text style={styles.priceInterval}>/{currentPlan.billingInterval}</Text>
          </Text>
        </View>
      </View>

      {/* Available Plans Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Available Upgrade Plans</Text>
        <Text style={styles.sectionSub}>Choose a plan to extend school service instantly</Text>
      </View>

      {SUBSCRIPTION_PLANS.map((plan) => {
        const isCurrent = subscription?.planId === plan.id;
        const isUpgrading = upgradingId === plan.id;

        return (
          <View
            key={plan.id}
            style={[
              styles.planCard,
              plan.popular ? styles.popularCard : isCurrent ? styles.activeBorderCard : undefined,
            ]}
          >
            {plan.badge && (
              <View
                style={[
                  styles.badgePill,
                  plan.id === 'OFFER_MONTHLY'
                    ? { backgroundColor: '#F59E0B' }
                    : { backgroundColor: color },
                ]}
              >
                <Text style={styles.badgePillText}>{plan.badge}</Text>
              </View>
            )}

            <View style={styles.planCardHeader}>
              <View>
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planDesc}>{plan.description}</Text>
              </View>
            </View>

            <View style={styles.planPriceContainer}>
              <Text style={styles.planPriceBig}>₹{plan.price}</Text>
              <Text style={styles.planPriceInterval}>/{plan.billingInterval}</Text>
            </View>

            <View style={styles.featureList}>
              {plan.features.map((feat, idx) => (
                <View key={idx} style={styles.featureRow}>
                  <Ionicons name='checkmark-circle' size={16} color='#10B981' />
                  <Text style={styles.featureText}>{feat}</Text>
                </View>
              ))}
            </View>

            {user?.role === 'ADMIN' && (
              <Pressable
                onPress={() => handleUpgrade(plan)}
                disabled={isUpgrading}
                style={({ pressed }) => [
                  styles.upgradeButton,
                  plan.popular
                    ? { backgroundColor: color }
                    : plan.id === 'OFFER_MONTHLY'
                    ? { backgroundColor: '#F59E0B' }
                    : { backgroundColor: '#1E293B' },
                  pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                ]}
              >
                {isUpgrading ? (
                  <ActivityIndicator size='small' color='#FFFFFF' />
                ) : (
                  <>
                    <Ionicons
                      name={isCurrent ? 'flash' : 'arrow-forward-circle'}
                      size={18}
                      color='#FFFFFF'
                    />
                    <Text style={styles.upgradeButtonText}>
                      {isCurrent
                        ? ('Recharge / Extend (' + plan.billingInterval + ')')
                        : ('Upgrade to ' + plan.name)}
                    </Text>
                  </>
                )}
              </Pressable>
            )}
          </View>
        );
      })}

      {/* Guarantee & Expiry Info Card */}
      <View style={styles.infoBox}>
        <View style={styles.infoTitleRow}>
          <Ionicons name='shield-checkmark' size={20} color={color} />
          <Text style={styles.infoTitle}>Subscription & Renewal Policy</Text>
        </View>

        <Text style={styles.infoBullet}>
          • <Text style={styles.bold}>Automatic Reminders:</Text> Notifications are dispatched to Admin 7 days, 2 days, and on the expiry date.
        </Text>
        <Text style={styles.infoBullet}>
          • <Text style={styles.bold}>Zero Data Loss:</Text> All historical records, marks, and student data remain permanently safe when expired.
        </Text>
        <Text style={styles.infoBullet}>
          • <Text style={styles.bold}>Seamless Rollover:</Text> Upgrading before expiry extends your remaining balance with full uninterrupted continuity.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: spacing.md,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  header: {
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  activeBadge: {
    backgroundColor: '#D1FAE5',
  },
  expiredBadge: {
    backgroundColor: '#FFE4E6',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  currentCard: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  currentCardExpired: {
    backgroundColor: '#BE123C',
  },
  currentCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  planIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentCardLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 0.8,
  },
  currentPlanName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginVertical: spacing.md,
  },
  currentCardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  metaLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  currentRateText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  priceValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  priceInterval: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
  },
  sectionHeader: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  popularCard: {
    borderColor: '#6366F1',
    backgroundColor: '#FFFFFF',
  },
  activeBorderCard: {
    borderColor: '#10B981',
  },
  badgePill: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: radius.full,
    elevation: 2,
  },
  badgePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  planCardHeader: {
    marginTop: 4,
  },
  planName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  planDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  planPriceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: spacing.md,
  },
  planPriceBig: {
    fontSize: 30,
    fontWeight: '900',
    color: '#0F172A',
  },
  planPriceInterval: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 4,
  },
  featureList: {
    gap: 8,
    marginVertical: spacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 12,
    color: '#334155',
    flex: 1,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: radius.lg,
    marginTop: spacing.md,
  },
  upgradeButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  infoBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
    marginTop: spacing.sm,
  },
  infoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  infoBullet: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 16,
  },
  bold: {
    fontWeight: '700',
    color: '#0F172A',
  },
  loaderMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaValueLoading: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  skeletonTitle: {
    width: 160,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: radius.md,
    marginTop: 6,
  },
  skeletonRate: {
    width: 90,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: radius.md,
  },
  skeletonBlock: {
    backgroundColor: '#E2E8F0',
    borderRadius: radius.md,
  },
});
