import { GREEN, styles } from '@/styles/driver-task-pending.styles';
import { Redirect, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
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

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d={expanded ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'}
        stroke="#176D34"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function VehicleSelector({
  vehicles,
  selectedId,
  onOpen,
}: {
  vehicles: DeliveryVehicle[];
  selectedId?: number;
  onOpen: () => void;
}) {
  const selected = vehicles.find((vehicle) => vehicle.id === selectedId);
  return (
    <View style={styles.vehicleSection}>
      <Text style={styles.vehicleSectionLabel}>SELECT VEHICLE</Text>
      <Pressable accessibilityRole="button" onPress={onOpen} style={styles.vehicleDropdownButton}>
        <Text
          numberOfLines={1}
          style={[styles.vehicleDropdownText, !selected && styles.vehicleDropdownPlaceholder]}>
          {selected
            ? `${selected.vehicle_name} · ${selected.plate_number}`
            : 'Choose an available vehicle'}
        </Text>
      </Pressable>
    </View>
  );
}

function PendingDeliveryCard({
  order,
  vehicles,
  selectedVehicleId,
  expanded,
  busy,
  onAccept,
  onExpand,
  onSelectVehicle,
  onOpenVehicleSelector,
}: {
  order: DriverOrder;
  vehicles: DeliveryVehicle[];
  selectedVehicleId?: number;
  expanded: boolean;
  busy: boolean;
  onAccept: () => void;
  onExpand: () => void;
  onSelectVehicle: (vehicle: DeliveryVehicle) => void;
  onOpenVehicleSelector: () => void;
}) {
  const orderNumber = order.order_number || `Order #${order.id}`;
  const destination = formatDeliveryAddress(order);
  const deliveryWindow = formatDeliveryWindow(order.delivery_scheduled_at, order.delivery_window_end_at);

  return (
    <View style={[styles.pendingCard, expanded && styles.pendingCardExpanded]}>
      {/* Header Row: Pineapple Produce Icon, Title 'Order Delivery {orderNumber}', and Top-Right Dropdown Icon */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
        <View style={[styles.categorySquircle, { backgroundColor: '#EEF3EF' }]}>
          <Image
            source={require('@/assets/images/delivery-produce-icon.png')}
            style={styles.deliveryProductIcon}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={styles.recipientTitle}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}>
            Order Delivery {orderNumber}
          </Text>
          <Text style={styles.destinationText}>{destination}</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Hide details' : 'Show details'}
          onPress={onExpand}
          style={styles.topRightDropdownBtn}>
          <ChevronIcon expanded={expanded} />
        </Pressable>
      </View>

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

      {/* Vehicle Selector */}
      <VehicleSelector
        vehicles={vehicles}
        selectedId={selectedVehicleId}
        onOpen={onOpenVehicleSelector}
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
  const [collapsedIds, setCollapsedIds] = useState<Record<number, boolean>>({});
  const [vehiclePickerOrderId, setVehiclePickerOrderId] = useState<number | null>(null);
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
    } catch (caught) {
      setOrders([]);
      setVehicles([]);
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
                expanded={!collapsedIds[order.id]}
                busy={busyId === order.id}
                onAccept={() => acceptDelivery(order)}
                onExpand={() =>
                  setCollapsedIds((current) => ({ ...current, [order.id]: !current[order.id] }))
                }
                onSelectVehicle={(vehicle) => {
                  setSelectedVehicles((current) => ({ ...current, [order.id]: vehicle.id }));
                  setVehiclePickerOrderId(null);
                }}
                onOpenVehicleSelector={() => setVehiclePickerOrderId(order.id)}
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

      <Modal
        animationType="slide"
        transparent
        visible={vehiclePickerOrderId !== null}
        onRequestClose={() => setVehiclePickerOrderId(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setVehiclePickerOrderId(null)}>
          <Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select a Vehicle</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close vehicle selector"
                onPress={() => setVehiclePickerOrderId(null)}>
                <Text style={styles.modalCloseX}>×</Text>
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.vehicleModalList}>
              {vehicles.length ? vehicles.map((vehicle) => {
                const selected = vehiclePickerOrderId !== null
                  && selectedVehicles[vehiclePickerOrderId] === vehicle.id;
                return (
                  <Pressable
                    key={vehicle.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      if (vehiclePickerOrderId !== null) {
                        setSelectedVehicles((current) => ({ ...current, [vehiclePickerOrderId]: vehicle.id }));
                      }
                      setVehiclePickerOrderId(null);
                    }}
                    style={[styles.vehicleModalItem, selected && styles.vehicleModalItemSelected]}>
                    <Image source={require('@/assets/images/driver-equipment.png')} style={styles.vehicleModalImage} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.vehicleModalName}>{vehicle.vehicle_name}</Text>
                      <Text style={styles.vehicleModalPlate}>Plate: {vehicle.plate_number}</Text>
                    </View>
                    <View style={[styles.vehicleSelectRadio, selected && styles.vehicleSelectRadioActive]}>
                      {selected ? <Text style={styles.vehicleSelectRadioCheck}>✓</Text> : null}
                    </View>
                  </Pressable>
                );
              }) : <Text style={styles.noVehiclesNotice}>No vehicle is currently available.</Text>}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <WorkerBottomNavigation activeTab="tasks" />
    </SafeAreaView>
  );
}

