import { GREEN, styles } from '@/styles/driver-task-pending.styles';
import { Redirect, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { WorkerBottomNavigation } from '@/components/worker-bottom-navigation';
import { WorkerHeader } from '@/components/worker-header';
import {
  DRIVER_TASK_TABS,
  WorkerTaskSegmentedTabs,
} from '@/components/worker-task-segmented-tabs';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/lib/api';
import {
  DeliveryVehicle,
  DriverOrder,
  DriverOrdersResponse,
  DriverVehiclesResponse,
  formatDeliveryAddress,
  formatDeliveryWindow,
  formatPeso,
} from '@/lib/driver-deliveries';

function VehicleSelector({
  vehicles,
  selectedId,
  open,
  onSelect,
  onToggle,
}: {
  vehicles: DeliveryVehicle[];
  selectedId?: number;
  open: boolean;
  onSelect: (vehicle: DeliveryVehicle) => void;
  onToggle: () => void;
}) {
  const selected = vehicles.find((vehicle) => vehicle.id === selectedId);
  return (
    <View style={styles.vehiclePickerBox}>
      <Text style={styles.detailLabel}>SELECT VEHICLE</Text>
      <Pressable accessibilityRole="button" onPress={onToggle} style={styles.vehicleSelectControl}>
        <Text
          numberOfLines={1}
          style={[styles.vehicleSelectText, !selected && styles.vehiclePlaceholder]}>
          {selected
            ? `🚛 ${selected.vehicle_name} · ${selected.plate_number}`
            : 'Choose an available vehicle'}
        </Text>
        <Text style={{ fontSize: 11, color: GREEN }}>▾</Text>
      </Pressable>
      {open ? (
        <View style={styles.vehicleOptionsList}>
          {vehicles.length ? (
            vehicles.map((vehicle) => (
              <Pressable
                key={vehicle.id}
                onPress={() => onSelect(vehicle)}
                style={[
                  styles.vehicleOptionItem,
                  selectedId === vehicle.id && styles.vehicleOptionItemSelected,
                ]}>
                <Text style={styles.vehicleOptionName}>🚛 {vehicle.vehicle_name}</Text>
                <Text style={styles.vehicleOptionPlate}>Plate: {vehicle.plate_number}</Text>
              </Pressable>
            ))
          ) : (
            <View style={{ padding: 10 }}>
              <Text style={styles.noVehiclesNotice}>No vehicle is currently available.</Text>
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

function PendingDeliveryCard({
  order,
  vehicles,
  selectedVehicleId,
  expanded,
  selectorOpen,
  busy,
  onAccept,
  onExpand,
  onSelectVehicle,
  onToggleSelector,
}: {
  order: DriverOrder;
  vehicles: DeliveryVehicle[];
  selectedVehicleId?: number;
  expanded: boolean;
  selectorOpen: boolean;
  busy: boolean;
  onAccept: () => void;
  onExpand: () => void;
  onSelectVehicle: (vehicle: DeliveryVehicle) => void;
  onToggleSelector: () => void;
}) {
  const orderNumber = order.order_number || `Order #${order.id}`;
  const destination = formatDeliveryAddress(order);

  return (
    <View style={[styles.taskCard, expanded && styles.taskCardExpanded]}>
      {/* Top Header Row */}
      <Pressable onPress={onExpand} style={styles.cardHeaderRow}>
        <View style={styles.cardHeaderLeft}>
          <View style={styles.categorySquircle}>
            <Text style={styles.categoryIconText}>🚚</Text>
          </View>
          <View style={[styles.priorityPill, styles.priorityPill_order]}>
            <Text style={[styles.priorityText, styles.priorityText_order]}>{orderNumber}</Text>
          </View>
        </View>

        <View style={styles.cardHeaderRight}>
          <View style={styles.durationRow}>
            <Text style={styles.durationClock}>🕒</Text>
            <Text style={styles.durationText}>Window</Text>
          </View>
          <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </Pressable>

      {/* Main Item Title */}
      <Text style={styles.taskTitle}>
        Deliver to {order.delivery_full_name || 'Customer'} · {destination}
      </Text>

      {/* Expanded Details Section */}
      {expanded ? (
        <View style={styles.detailsSection}>
          {/* Side-by-side Info Boxes */}
          <View style={styles.detailGrid}>
            <View style={styles.detailBoxSmall}>
              <Text style={styles.detailLabel}>RECEIVER</Text>
              <Text numberOfLines={1} style={styles.detailValue}>
                {order.delivery_full_name || 'Not provided'}
              </Text>
            </View>
            <View style={styles.detailBoxSmall}>
              <Text style={styles.detailLabel}>CONTACT</Text>
              <Text numberOfLines={1} style={styles.detailValue}>
                {order.delivery_mobile_number || 'Not provided'}
              </Text>
            </View>
          </View>

          {/* Delivery Location & Payment Box */}
          <View style={styles.detailBox}>
            <Text style={styles.detailLabel}>DELIVERY LOCATION &amp; PAYMENT</Text>
            <Text style={styles.detailValue}>
              {destination} · {order.payment_method} ({formatPeso(order.total_amount)})
            </Text>
          </View>

          {/* Delivery Window Box */}
          <View style={styles.detailBox}>
            <Text style={styles.detailLabel}>DELIVERY WINDOW</Text>
            <Text style={styles.detailValue}>
              {formatDeliveryWindow(order.delivery_scheduled_at, order.delivery_window_end_at)}
            </Text>
          </View>

          {/* Vehicle Selector */}
          <VehicleSelector
            vehicles={vehicles}
            selectedId={selectedVehicleId}
            open={selectorOpen}
            onSelect={onSelectVehicle}
            onToggle={onToggleSelector}
          />

          {!vehicles.length ? (
            <Text style={styles.noVehiclesNotice}>
              No available vehicle can be assigned right now.
            </Text>
          ) : null}

          {/* Accept Delivery Action Button */}
          <Pressable
            disabled={busy || !selectedVehicleId || !vehicles.length}
            onPress={onAccept}
            style={({ pressed }) => [
              styles.startButton,
              (busy || !selectedVehicleId || !vehicles.length) && styles.startButtonDisabled,
              pressed && styles.startButtonPressed,
            ]}>
            {busy ? (
              <ActivityIndicator color={GREEN} size="small" />
            ) : (
              <Text style={styles.startButtonText}>Accept Delivery</Text>
            )}
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export default function DriverTaskPending() {
  const { width } = useWindowDimensions();
  const { loading: authLoading, profile } = useAuth();
  const [orders, setOrders] = useState<DriverOrder[]>([]);
  const [vehicles, setVehicles] = useState<DeliveryVehicle[]>([]);
  const [selectedVehicles, setSelectedVehicles] = useState<Record<number, number>>({});
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [openSelectorId, setOpenSelectorId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadDeliveries = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const [orderResult, vehicleResult] = await Promise.all([
        apiRequest<DriverOrdersResponse>('/api/driver/orders'),
        apiRequest<DriverVehiclesResponse>('/api/driver/orders/vehicles'),
      ]);
      const pendingOrders = (orderResult.orders ?? []).filter(
        (order) => order.delivery_assignment_status === 'assigned'
      );
      setOrders(pendingOrders);
      setVehicles(vehicleResult.vehicles ?? []);
      setExpandedId((current) =>
        pendingOrders.some((order) => order.id === current) ? current : pendingOrders[0]?.id ?? null
      );
    } catch (caught) {
      setOrders([]);
      setVehicles([]);
      setExpandedId(null);
      setError(caught instanceof Error ? caught.message : 'Could not load pending deliveries.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (profile) loadDeliveries();
  }, [loadDeliveries, profile]);

  async function acceptDelivery(order: DriverOrder) {
    const vehicleId = selectedVehicles[order.id];
    if (!vehicleId) {
      setError('Select an available vehicle before accepting this delivery.');
      return;
    }
    setBusyId(order.id);
    setError('');
    try {
      await apiRequest(`/api/driver/orders/${order.id}/accept`, {
        method: 'POST',
        body: JSON.stringify({ vehicle_id: vehicleId }),
      });
      router.replace('/DriverTaskActive');
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Could not accept this delivery.';
      await loadDeliveries();
      setError(message);
    } finally {
      setBusyId(null);
    }
  }

  if (authLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={GREEN} size="large" />
      </View>
    );
  }
  if (!profile) return <Redirect href="/login" />;
  const horizontalPadding = width < 360 ? 14 : 20;

  return (
    <SafeAreaView style={styles.safeArea}>
      <WorkerHeader />

      <View style={styles.mainBodyContainer}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding }]}
          refreshControl={
            <RefreshControl
              colors={[GREEN]}
              onRefresh={() => loadDeliveries(true)}
              refreshing={refreshing}
            />
          }>
          {/* Section Title */}
          <View style={styles.titleRow}>
            <Text style={styles.sectionTitle}>Today’s Tasks</Text>
          </View>

          {/* Segmented 3-Tab Filter Bar */}
          <WorkerTaskSegmentedTabs
            activeTab="pending"
            tabs={DRIVER_TASK_TABS}
            onTabChange={(_, route) => router.replace(route as any)}
          />

          {/* Error Banner */}
          {error ? (
            <Pressable onPress={() => loadDeliveries()} style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
              <Text style={styles.retry}>Tap to retry</Text>
            </Pressable>
          ) : null}

          {/* Deliveries List */}
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={GREEN} />
              <Text style={styles.loadingText}>Loading assigned deliveries...</Text>
            </View>
          ) : orders.length ? (
            orders.map((order) => (
              <PendingDeliveryCard
                key={order.id}
                order={order}
                vehicles={vehicles}
                selectedVehicleId={selectedVehicles[order.id]}
                expanded={expandedId === order.id}
                selectorOpen={openSelectorId === order.id}
                busy={busyId === order.id}
                onAccept={() => acceptDelivery(order)}
                onExpand={() =>
                  setExpandedId((current) => (current === order.id ? null : order.id))
                }
                onSelectVehicle={(vehicle) => {
                  setSelectedVehicles((current) => ({ ...current, [order.id]: vehicle.id }));
                  setOpenSelectorId(null);
                }}
                onToggleSelector={() =>
                  setOpenSelectorId((current) => (current === order.id ? null : order.id))
                }
              />
            ))
          ) : (
            <View style={styles.emptyBox}>
              <View style={styles.emptyCheckCircle}>
                <Text style={styles.emptyCheckText}>✓</Text>
              </View>
              <Text style={styles.emptyTitle}>No pending deliveries</Text>
              <Text style={styles.emptyText}>Pull down to check for newly assigned orders.</Text>
            </View>
          )}
        </ScrollView>
      </View>

      <WorkerBottomNavigation activeTab="tasks" />
    </SafeAreaView>
  );
}

