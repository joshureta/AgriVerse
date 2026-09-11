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
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { WorkerBottomNavigation } from '@/components/worker-bottom-navigation';
import { WorkerHeader } from '@/components/worker-header';
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

function SearchIcon() {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
      <Circle cx={11} cy={11} r={6.5} stroke="#64748B" strokeWidth={2} />
      <Path d="m16 16 4 4" stroke="#64748B" strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

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
    <View style={styles.vehicleSection}>
      <Text style={styles.vehicleSectionLabel}>SELECT VEHICLE</Text>
      <Pressable accessibilityRole="button" onPress={onToggle} style={styles.vehicleDropdownButton}>
        <Text
          numberOfLines={1}
          style={[styles.vehicleDropdownText, !selected && styles.vehicleDropdownPlaceholder]}>
          {selected
            ? `${selected.vehicle_name} · ${selected.plate_number}`
            : 'Choose an available vehicle'}
        </Text>
        <Text style={styles.vehicleCaret}>{open ? '▴' : '▾'}</Text>
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
                <Text style={styles.vehicleOptionName}>{vehicle.vehicle_name}</Text>
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
  const deliveryWindow = formatDeliveryWindow(order.delivery_scheduled_at, order.delivery_window_end_at);

  return (
    <View style={[styles.pendingCard, expanded && styles.pendingCardExpanded]}>
      {/* Top Header Row: Badges & Price */}
      <View style={styles.pendingHeaderRow}>
        <View style={styles.pendingBadgesLeft}>
          <View style={styles.deliveryTagPill}>
            <Text style={styles.deliveryTagPillText}>DELIVERY ORDER</Text>
          </View>
          <View style={styles.orderNumberPill}>
            <Text style={styles.orderNumberPillText}>{orderNumber}</Text>
          </View>
        </View>
        <Text style={styles.pendingOrderAmount}>{formatPeso(order.total_amount)}</Text>
      </View>

      {/* Recipient & Destination (No icons) */}
      <Text style={styles.recipientTitle}>
        Deliver to {order.delivery_full_name || 'Customer'}
      </Text>
      <Text style={styles.destinationText}>{destination}</Text>

      {/* Schedule & Payment Meta Rows (No backgrounds, Time: instead of Window:) */}
      <View style={styles.metaTextContainer}>
        <View style={styles.metaTextRow}>
          <Text style={styles.metaTextLabel}>Time:</Text>
          <Text style={styles.metaTextValue}>{deliveryWindow}</Text>
        </View>
        <View style={styles.metaTextRow}>
          <Text style={styles.metaTextLabel}>Payment:</Text>
          <Text style={styles.metaTextValue}>
            {order.payment_method || 'Cash on Delivery'} · {formatPeso(order.total_amount)}
          </Text>
        </View>
      </View>

      {/* Collapsible Details Section */}
      {expanded ? (
        <View style={styles.pendingDetailsBox}>
          <View style={styles.pendingDetailRow}>
            <Text style={styles.pendingDetailLabel}>Receiver:</Text>
            <Text numberOfLines={1} style={styles.pendingDetailValue}>
              {order.delivery_full_name || 'Not provided'}
            </Text>
          </View>
          <View style={styles.pendingDetailRow}>
            <Text style={styles.pendingDetailLabel}>Contact:</Text>
            <Text numberOfLines={1} style={styles.pendingDetailValue}>
              {order.delivery_mobile_number || 'Not provided'}
            </Text>
          </View>
          <View style={styles.pendingDetailRow}>
            <Text style={styles.pendingDetailLabel}>Address:</Text>
            <Text style={styles.pendingDetailValue}>{destination}</Text>
          </View>
        </View>
      ) : null}

      {/* Toggle Details Link */}
      <Pressable onPress={onExpand} style={styles.toggleDetailsButton}>
        <Text style={styles.toggleDetailsText}>
          {expanded ? 'Hide Details ▴' : 'View Details ▾'}
        </Text>
      </Pressable>

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
        accessibilityRole="button"
        disabled={busy || !selectedVehicleId || !vehicles.length}
        onPress={onAccept}
        style={({ pressed }) => [
          styles.acceptBtn,
          (busy || !selectedVehicleId || !vehicles.length) && styles.acceptBtnDisabled,
          pressed && styles.acceptBtnPressed,
        ]}>
        {busy ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={styles.acceptBtnText}>Accept Delivery</Text>
        )}
      </Pressable>
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
  const [searchQuery, setSearchQuery] = useState('');

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
  const filteredOrders = orders.filter((order) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    const searchable = `${order.order_number} ${order.delivery_full_name} ${formatDeliveryAddress(order)}`;
    return searchable.toLowerCase().includes(query);
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <WorkerHeader logoPosition="left" logoSize={48} logoSource={require('@/assets/images/driver-dashboard-emblem.png')} />

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
          <View style={styles.titleRow}>
            <Text style={styles.sectionTitle}>My Deliveries</Text>
          </View>

          <View style={styles.deliveryToolbar}>
            <View style={styles.deliverySearch}>
              <SearchIcon />
              <TextInput accessibilityLabel="Search deliveries" onChangeText={setSearchQuery} placeholder="Search deliveries" placeholderTextColor="#94A3B8" style={styles.deliverySearchInput} value={searchQuery} />
            </View>
          </View>
          <View style={styles.deliveryStatusTabs}>
            {[{ label: 'Pending', route: '/DriverTaskPending' }, { label: 'Active', route: '/DriverTaskActive' }, { label: 'Completed', route: '/DriverTaskCompleted' }].map((tab) => {
              const active = tab.label === 'Pending';
              return <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} key={tab.label} onPress={() => router.replace(tab.route as any)} style={[styles.deliveryStatusTab, active && styles.deliveryStatusTabActive]}><Text style={[styles.deliveryStatusTabText, active && styles.deliveryStatusTabTextActive]}>{tab.label}</Text></Pressable>;
            })}
          </View>

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
          ) : filteredOrders.length ? (
            filteredOrders.map((order) => (
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
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'No matching deliveries' : 'No pending deliveries'}
              </Text>
              <Text style={styles.emptyText}>
                {searchQuery ? 'Try another search term.' : 'Pull down to check for newly assigned orders.'}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>

      <WorkerBottomNavigation activeTab="tasks" />
    </SafeAreaView>
  );
}

