import { styles } from '@/styles/driver-task-pending.styles';
import { Redirect, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, SafeAreaView, ScrollView, Text, useWindowDimensions, View } from 'react-native';

import { WorkerBottomNavigation } from '@/components/worker-bottom-navigation';
import { WorkerHeader } from '@/components/worker-header';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/lib/api';
import {
  DeliveryVehicle,
  DriverOrder,
  DriverOrdersResponse,
  DriverVehiclesResponse,
  deliveryStatusLabel,
  formatDeliveryAddress,
  formatDeliveryWindow,
  formatPeso,
} from '@/lib/driver-deliveries';

const vehicleImage = require('@/assets/images/driver-equipment.png');

function DetailField({ label, value }: { label: string; value: string | number }) {
  return <View style={styles.detailBox}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>;
}

function VehicleSelector({ vehicles, selectedId, open, onSelect, onToggle }: {
  vehicles: DeliveryVehicle[];
  selectedId?: number;
  open: boolean;
  onSelect: (vehicle: DeliveryVehicle) => void;
  onToggle: () => void;
}) {
  const selected = vehicles.find((vehicle) => vehicle.id === selectedId);
  return (
    <View style={[styles.detailBox, styles.vehicleField]}>
      <Text style={styles.detailLabel}>Select Vehicle</Text>
      <Pressable accessibilityRole="button" onPress={onToggle} style={styles.vehicleSelect}>
        <Text numberOfLines={1} style={[styles.vehicleValue, !selected && styles.vehiclePlaceholder]}>
          {selected ? `${selected.vehicle_name} · ${selected.plate_number}` : 'Choose an available vehicle'}
        </Text>
        <View style={styles.chevron} />
      </Pressable>
      {open ? (
        <View style={styles.vehicleOptions}>
          {vehicles.length ? vehicles.map((vehicle) => (
            <Pressable key={vehicle.id} onPress={() => onSelect(vehicle)} style={[styles.vehicleOption, selectedId === vehicle.id && styles.vehicleOptionSelected]}>
              <Text style={styles.vehicleOptionName}>{vehicle.vehicle_name}</Text>
              <Text style={styles.vehicleOptionPlate}>{vehicle.plate_number}</Text>
            </Pressable>
          )) : <Text style={styles.noVehicles}>No vehicle is currently available.</Text>}
        </View>
      ) : null}
    </View>
  );
}

function PendingDeliveryCard({ order, vehicles, selectedVehicleId, expanded, selectorOpen, busy, onAccept, onExpand, onSelectVehicle, onToggleSelector }: {
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
  return (
    <View style={[styles.taskCard, expanded && styles.taskCardExpanded]}>
      <Pressable onPress={onExpand} style={styles.taskSummary}>
        <View style={styles.taskIconCircle}><Image source={vehicleImage} style={styles.taskIcon} /></View>
        <View style={styles.taskTitleArea}><Text style={styles.taskCategory}>{order.order_number}</Text><Text numberOfLines={1} style={styles.taskDescription}>{formatDeliveryAddress(order)}</Text></View>
        <View style={styles.statusPill}><Text style={styles.statusPillText}>{deliveryStatusLabel(order.delivery_assignment_status)}</Text></View>
      </Pressable>
      {expanded ? (
        <View style={styles.details}>
          <DetailField label="Order Number" value={order.order_number} />
          <DetailField label="Receiver Name" value={order.delivery_full_name || 'Not provided'} />
          <DetailField label="Contact Number" value={order.delivery_mobile_number || 'Not provided'} />
          <DetailField label="Delivery Location" value={formatDeliveryAddress(order)} />
          <DetailField label="Delivery Window" value={formatDeliveryWindow(order.delivery_scheduled_at, order.delivery_window_end_at)} />
          <DetailField label="Payment" value={`${order.payment_method} · ${formatPeso(order.total_amount)}`} />
          <VehicleSelector vehicles={vehicles} selectedId={selectedVehicleId} open={selectorOpen} onSelect={onSelectVehicle} onToggle={onToggleSelector} />
          {!vehicles.length ? <Text style={styles.noVehiclesNotice}>No available vehicle can be assigned right now.</Text> : null}
          <Pressable disabled={busy || !selectedVehicleId || !vehicles.length} onPress={onAccept} style={[styles.startButton, (busy || !selectedVehicleId || !vehicles.length) && styles.startButtonDisabled]}>
            {busy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.startButtonText}>Accept Delivery</Text>}
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export default function DriverTaskPending() {
  const { width } = useWindowDimensions();
  const { loading: authLoading, profile, signOut } = useAuth();
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
      const pendingOrders = (orderResult.orders ?? []).filter((order) => order.delivery_assignment_status === 'assigned');
      setOrders(pendingOrders);
      setVehicles(vehicleResult.vehicles ?? []);
      setExpandedId((current) => pendingOrders.some((order) => order.id === current) ? current : pendingOrders[0]?.id ?? null);
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

  useEffect(() => { if (profile) loadDeliveries(); }, [loadDeliveries, profile]);

  async function acceptDelivery(order: DriverOrder) {
    const vehicleId = selectedVehicles[order.id];
    if (!vehicleId) { setError('Select an available vehicle before accepting this delivery.'); return; }
    setBusyId(order.id);
    setError('');
    try {
      await apiRequest(`/api/driver/orders/${order.id}/accept`, { method: 'POST', body: JSON.stringify({ vehicle_id: vehicleId }) });
      router.replace('/DriverTaskActive');
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Could not accept this delivery.';
      await loadDeliveries();
      setError(message);
    } finally { setBusyId(null); }
  }

  async function logout() { await signOut(); router.replace('/login'); }

  if (authLoading) return <View style={styles.center}><ActivityIndicator color="#237c31" size="large" /></View>;
  if (!profile) return <Redirect href="/login" />;
  const horizontalPadding = width < 360 ? 14 : 22;

  return (
    <SafeAreaView style={styles.safeArea}>
      <WorkerHeader />
      <ScrollView contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding }]} refreshControl={<RefreshControl colors={['#237c31']} onRefresh={() => loadDeliveries(true)} refreshing={refreshing} />}>
        <View style={styles.titleRow}><Text style={styles.sectionTitle}>Today&apos;s Deliveries</Text><Pressable onPress={logout}><Text style={styles.signOut}>Sign out</Text></Pressable></View>
        <View style={styles.filters}>
          <Pressable accessibilityState={{ selected: true }} style={[styles.filterButton, styles.filterButtonActive]}><Text style={[styles.filterText, styles.filterTextActive]}>Pending</Text></Pressable>
          <Pressable onPress={() => router.replace('/DriverTaskActive')} style={styles.filterButton}><Text style={styles.filterText}>Active</Text></Pressable>
          <Pressable onPress={() => router.replace('/DriverTaskCompleted')} style={styles.filterButton}><Text style={styles.filterText}>Completed</Text></Pressable>
        </View>
        {error ? <Pressable onPress={() => loadDeliveries()} style={styles.errorBox}><Text style={styles.errorText}>{error}</Text><Text style={styles.retry}>Tap to retry</Text></Pressable> : null}
        {loading ? <View style={styles.loadingBox}><ActivityIndicator color="#237c31" /><Text style={styles.loadingText}>Loading assigned deliveries...</Text></View> : orders.length ? orders.map((order) => (
          <PendingDeliveryCard
            busy={busyId === order.id} expanded={expandedId === order.id} key={order.id}
            onAccept={() => acceptDelivery(order)} onExpand={() => setExpandedId((current) => current === order.id ? null : order.id)}
            onSelectVehicle={(vehicle) => { setSelectedVehicles((current) => ({ ...current, [order.id]: vehicle.id })); setOpenSelectorId(null); }}
            onToggleSelector={() => setOpenSelectorId((current) => current === order.id ? null : order.id)}
            order={order} selectedVehicleId={selectedVehicles[order.id]} selectorOpen={openSelectorId === order.id} vehicles={vehicles}
          />
        )) : <View style={styles.emptyBox}><Text style={styles.emptyIcon}>✓</Text><Text style={styles.emptyTitle}>No pending deliveries</Text><Text style={styles.emptyText}>Pull down to check for newly assigned orders.</Text></View>}
      </ScrollView>
      <WorkerBottomNavigation activeTab="tasks" />
    </SafeAreaView>
  );
}
