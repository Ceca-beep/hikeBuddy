import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    ActivityIndicator,
    Modal,
    TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Polyline, Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { API_BASE } from './Api';

const { width, height } = Dimensions.get('window');

// AsyncStorage key used to persist pings that couldn't be sent while offline
const QUEUE_KEY = 'pending_pings';

// Converts a GeoJSON route (LineString or MultiLineString) into arrays of { latitude, longitude } that react-native-maps Polyline can render directly.
// GeoJSON stores coordinates as [lng, lat], so we swap them here.
const geojsonToSegments = (routePath) => {
    if (!routePath) return [];
    try {
        const geojson = typeof routePath === 'string' ? JSON.parse(routePath) : routePath;

        if (geojson.type === 'LineString') {
            return [geojson.coordinates.map(([lng, lat]) => ({ latitude: lat, longitude: lng }))];
        }

        if (geojson.type === 'MultiLineString') {
            return geojson.coordinates.map(line =>
                line.map(([lng, lat]) => ({ latitude: lat, longitude: lng }))
            );
        }
    } catch (e) {
        console.error('Failed to parse route_path:', e);
    }
    return [];
};

// Calculates a map region that fits all route coordinates with some padding (1.4x)
const getRegion = (segments) => {
    const coords = segments.flat();
    if (!coords.length) return null;

    const lats = coords.map(c => c.latitude);
    const lngs = coords.map(c => c.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    return {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: (maxLat - minLat) * 1.4 || 0.05,
        longitudeDelta: (maxLng - minLng) * 1.4 || 0.05,
    };
};


// Converts raw minutes into a readable "Xh Ym" string
const formatDuration = (minutes) => {
    if (!minutes) return '--';
    const num = parseInt(minutes);
    const h = Math.floor(num / 60);
    const m = num % 60;
    if (h > 100) return `${num}h`;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

export default function Mapscreen({ route, navigation }) {
    // Converts raw minutes into a readable "Xh Ym" string
    const trail = route?.params?.trail || {};

    const [routeSegments, setRouteSegments] = useState([]);
    const [region, setRegion] = useState(null);
    const [selectedPing, setSelectedPing] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tempPing, setTempPing] = useState(null);
    const [isAddingPing, setIsAddingPing] = useState(false);
    const [dangerType, setDangerType] = useState('');
    const [customDetail, setCustomDetail] = useState('');
    const [currentPings, setCurrentPings] = useState(route?.params?.pings || []);

    // Offline mode simulation, when true, pings go to the local queue instead of the server
    const [simulateOffline, setSimulateOffline] = useState(false);
    const [queueCount, setQueueCount] = useState(0);
    const [syncStatus, setSyncStatus] = useState('online');
    const isSyncing = useRef(false);

    useEffect(() => {
        if (trail?.route_path) {
            const segments = geojsonToSegments(trail.route_path);
            setRouteSegments(segments);
            setRegion(getRegion(segments));
        } else {
            // Default region (central Romania) if no route data is available
            setRegion({ latitude: 45.45, longitude: 25.50, latitudeDelta: 0.1, longitudeDelta: 0.1 });
        }
        setLoading(false);
        loadQueueCount();
    }, [trail.route_path]);

    // Auto-flush queued pings when real connectivity is restored
    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            if (state.isConnected && !simulateOffline) {
                flushQueue();
            }
        });
        return () => unsubscribe();
    }, [simulateOffline]);

    const loadQueueCount = async () => {
        const raw = await AsyncStorage.getItem(QUEUE_KEY);
        setQueueCount(raw ? JSON.parse(raw).length : 0);
    };

    // Toggles between simulated offline and online mode
    // Coming back online triggers a flush of any queued pings
    const toggleOfflineMode = async () => {
        const goingOffline = !simulateOffline;
        setSimulateOffline(goingOffline);

        if (!goingOffline) {
            setSyncStatus('syncing');
            await flushQueue();
        } else {
            setSyncStatus('offline');
        }
    };

    const saveToQueue = async (payload) => {
        const raw = await AsyncStorage.getItem(QUEUE_KEY);
        const queue = raw ? JSON.parse(raw) : [];
        queue.push(payload);
        await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
        setQueueCount(queue.length);
    };

    // Attempts to send all queued pings to the server.
    // Any that fail are kept in the queue for the next retry.
    // isSyncing.current prevents overlapping flush calls.
    const flushQueue = async () => {
        if (isSyncing.current) return;
        const raw = await AsyncStorage.getItem(QUEUE_KEY);
        const queue = raw ? JSON.parse(raw) : [];

        if (queue.length === 0) {
            setSyncStatus('online');
            return;
        }

        isSyncing.current = true;
        setSyncStatus('syncing');

        const failed = [];
        for (const payload of queue) {
            try {
                const res = await fetch(`${API_BASE}/pings`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'ngrok-skip-browser-warning': 'true'
                    },
                    body: JSON.stringify(payload),
                });

                if (!res.ok) {
                    console.log("Server rejected ping:", await res.text());
                    failed.push(payload);
                }
            } catch (err) {
                console.log("Network error during sync:", err);
                failed.push(payload);
            }
        }

        // Overwrite the queue with only the pings that still failed
        await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(failed));
        setQueueCount(failed.length);

        if (failed.length === 0) {
            setSyncStatus('synced');
            setTimeout(() => setSyncStatus('online'), 3000);
        } else {
            setSyncStatus('offline');
        }
        isSyncing.current = false;
    };

    const handleMapPress = (e) => {
        setTempPing(e.nativeEvent.coordinate);
        setIsAddingPing(true);
    };
    // Builds the ping payload and either sends it to the server or queues it if offline
    const submitNewPing = async () => {
        if (!dangerType) {
            alert('Please select a danger type first.');
            return;
        }
        const payload = {
            "type": dangerType === 'Custom' ? 'Danger' : dangerType,
            "lat": tempPing.latitude,
            "lng": tempPing.longitude,
            "description": customDetail,
            "trail_id": trail.id
        };

        setIsAddingPing(false);
        setTempPing(null);
        setDangerType('');
        setCustomDetail('');

        if (simulateOffline) {
            await saveToQueue(payload);
            setCurrentPings(prev => [...prev, { ...payload, id: `temp-${Date.now()}` }]);
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/pings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify(payload),
            });

            const result = await res.json();

            if (res.ok) {
                if (result.data && result.data[0]) {
                    setCurrentPings(prev => [...prev, result.data[0]]);
                } else {
                    setCurrentPings(prev => [...prev, { ...payload, id: Date.now() }]);
                }
                alert('Danger reported!');
            } else {
                const errMsg = result?.detail || result?.message || `Server error ${res.status}`;
                alert(`Ping failed: ${errMsg}`);
                await saveToQueue(payload);
                setCurrentPings(prev => [...prev, { ...payload, id: `temp-${Date.now()}` }]);
                setSyncStatus('offline');
            }
        } catch (e) {
            console.error("Submit error:", e);
            await saveToQueue(payload);
            setCurrentPings(prev => [...prev, { ...payload, id: `temp-${Date.now()}` }]);
            setSyncStatus('offline');
        }
    };
    // Start and end markers are the first and last coordinates of the full route
    const startPoint = routeSegments[0]?.[0];
    const endPoint = routeSegments.length > 0
        ? routeSegments[routeSegments.length - 1][routeSegments[routeSegments.length - 1].length - 1]
        : null;
    // Returns the colored banner shown below the trail pill when offline or syncing
    const renderSyncBanner = () => {
        if (!simulateOffline && queueCount === 0) return null;
        const pingWord = queueCount === 1 ? 'ping' : 'pings';
        let bgColor = '#4b5563', text = `Offline Mode: ${queueCount} ${pingWord} queued`;
        if (syncStatus === 'syncing') { bgColor = '#b45309'; text = `Syncing ${queueCount} ${pingWord}...`; }
        else if (syncStatus === 'synced') { bgColor = '#15803d'; text = '✓ All pings synced!'; }
        else if (queueCount > 0 && !simulateOffline) { bgColor = '#991b1b'; text = `Connection issue: ${queueCount} ${pingWord} waiting`; }
        return (
            <View style={[styles.syncBanner, { backgroundColor: bgColor }]}>
                <Text style={styles.syncBannerText}>{text}</Text>
            </View>
        );
    };

    if (loading || !region) {
        return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#f8c8c8" /></View>;
    }

    return (
        <View style={styles.container}>
            <MapView
                style={styles.map}
                provider={PROVIDER_DEFAULT}
                initialRegion={region}
                showsUserLocation
                onLongPress={handleMapPress}
            >
                {routeSegments.map((seg, i) => (
                    <Polyline
                        key={`segment-${i}`}
                        coordinates={seg}
                        strokeColor="#f8c8c8"
                        strokeWidth={4}
                    />
                ))}

                {startPoint && <Marker coordinate={startPoint} title="Start" pinColor="green" />}
                {endPoint && <Marker coordinate={endPoint} title="Finish" pinColor="#4a7c59" />}

                {currentPings.map((ping) => (
                    <Marker
                        key={ping.id ? String(ping.id) : `ping-${ping.lat}-${ping.lng}`}
                        coordinate={{ latitude: Number(ping.lat), longitude: Number(ping.lng) }}
                        title={ping.type}
                        description={ping.description}
                        pinColor="red"
                        onPress={() => setSelectedPing(ping)}
                    />
                ))}
                {tempPing && <Marker coordinate={tempPing} pinColor="yellow" />}
            </MapView>

            <Modal visible={isAddingPing} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Report Danger</Text>
                        <View style={styles.chipRow}>
                            {['Bear', 'Viper', 'Wolf', 'Custom'].map(t => (
                                <TouchableOpacity key={t} style={[styles.chip, dangerType === t && styles.chipActive]} onPress={() => setDangerType(t)}>
                                    <Text style={[styles.chipText, dangerType === t && styles.chipTextActive]}>{t}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TextInput
                            style={[styles.textInput, { height: 80, textAlignVertical: 'top' }]}
                            placeholder="Ex: Bridge is broken..."
                            placeholderTextColor="rgba(255,255,255,0.4)"
                            value={customDetail}
                            onChangeText={setCustomDetail}
                            multiline
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setIsAddingPing(false); setTempPing(null); }}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.confirmBtn} onPress={submitNewPing}>
                                <Text style={styles.confirmText}>Submit</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <SafeAreaView style={styles.topOverlay}>
                <View style={styles.topRow}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack()}><Text style={styles.backText}>← Back</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.offlineBtn, simulateOffline && styles.offlineBtnActive]} onPress={toggleOfflineMode}>
                        <Text style={styles.offlineBtnText}>{simulateOffline ? 'Offline' : 'Online'}</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.trailPill}>
                    <Text style={styles.trailPillName}>{trail.name}</Text>
                    <Text style={styles.trailPillSub}>
                        {(() => {
                            const d = parseFloat(trail.distance_km);
                            if (isNaN(d)) return "0";
                            return d > 1000 ? (d / 1000).toFixed(1) : d.toFixed(1);
                        })()} km · {formatDuration(trail.duration)}
                    </Text>
                </View>
                {renderSyncBanner()}
            </SafeAreaView>

            {selectedPing && (
                <View style={styles.pingPopup}>
                    <View style={styles.pingPopupHeader}>
                        <View style={styles.pingTypeBadge}><Text style={styles.pingTypeText}>{selectedPing.type}</Text></View>
                        <TouchableOpacity onPress={() => setSelectedPing(null)}><Text style={styles.pingClose}>✕</Text></TouchableOpacity>
                    </View>
                    <Text style={styles.pingDesc}>{selectedPing.description}</Text>
                </View>
            )}

            <View style={styles.bottomBar}>
                <View style={styles.bottomStat}>
                    <Text style={styles.bottomStatValue}>
                        {(() => {
                            const d = parseFloat(trail.distance_km);
                            if (isNaN(d)) return "0";
                            return d > 1000 ? (d / 1000).toFixed(1) : d.toFixed(1);
                        })()} km
                    </Text>
                    <Text style={styles.bottomStatLabel}>Distance</Text>
                </View>

                <View style={styles.bottomStat}>
                    <Text style={styles.bottomStatValue}>{formatDuration(trail.duration)}</Text>
                    <Text style={styles.bottomStatLabel}>Duration</Text>
                </View>

                <View style={styles.bottomStat}>
                    <Text style={styles.bottomStatValue}>+{trail.ascent}m</Text>
                    <Text style={styles.bottomStatLabel}>Ascent</Text>
                </View>

                <View style={styles.bottomStat}>
                    <Text style={[styles.bottomStatValue, currentPings.length > 0 && { color: '#f87171' }]}>
                        {currentPings.length}
                    </Text>
                    <Text style={styles.bottomStatLabel}>Dangers</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    map: { width, height },
    loadingContainer: { flex: 1, backgroundColor: '#2d5a3d', alignItems: 'center', justifyContent: 'center' },
    topOverlay: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 8, gap: 10 },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    backBtn: { backgroundColor: 'rgba(30,58,42,0.9)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 99 },
    backText: { color: 'white', fontWeight: '600' },
    trailPill: { alignSelf: 'center', backgroundColor: 'rgba(30,58,42,0.9)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 99, alignItems: 'center' },
    trailPillName: { color: 'white', fontWeight: '700' },
    trailPillSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
    syncBanner: { alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 99 },
    syncBannerText: { color: 'white', fontSize: 12, fontWeight: '600' },
    pingPopup: { position: 'absolute', bottom: 120, left: 24, right: 24, backgroundColor: 'rgba(30,58,42,0.95)', borderRadius: 16, padding: 16, borderLeftWidth: 4, borderLeftColor: '#f87171' },
    pingPopupHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    pingTypeBadge: { backgroundColor: 'rgba(239,68,68,0.2)', paddingHorizontal: 10, borderRadius: 99 },
    pingTypeText: { color: '#fca5a5', fontWeight: '700' },
    pingClose: { color: 'white' },
    pingDesc: { color: 'white' },
    bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(30,58,42,0.95)', flexDirection: 'row', paddingVertical: 20, paddingBottom: 40, justifyContent: 'space-around' },
    bottomStat: { alignItems: 'center' },
    bottomStatValue: { color: 'white', fontSize: 16, fontWeight: '700' },
    bottomStatLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: '#1e3a2a', borderRadius: 20, padding: 25 },
    modalTitle: { color: 'white', fontSize: 18, fontWeight: '700', marginBottom: 20, textAlign: 'center' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 15 },
    chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    chipActive: { backgroundColor: '#f8c8c8', borderColor: '#f8c8c8' },
    chipText: { color: 'white' },
    chipTextActive: { color: '#1e3a2a', fontWeight: '700' },
    textInput: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 15, color: 'white', marginBottom: 20 },
    modalButtons: { flexDirection: 'row', gap: 10 },
    cancelBtn: { flex: 1, alignItems: 'center', padding: 15 },
    cancelText: { color: 'white', opacity: 0.6 },
    confirmBtn: { flex: 2, backgroundColor: '#f8c8c8', borderRadius: 12, alignItems: 'center', padding: 15 },
    confirmText: { color: '#1e3a2a', fontWeight: '700' },
    offlineBtn: { backgroundColor: 'rgba(30,58,42,0.9)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99 },
    offlineBtnActive: { backgroundColor: '#991b1b' },
    offlineBtnText: { color: 'white', fontSize: 12, fontWeight: '600' },
});