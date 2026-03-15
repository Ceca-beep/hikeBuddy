import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    Dimensions,
    ActivityIndicator,
    Modal,
    TextInput,
} from 'react-native';
import MapView, { Polyline, Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const { width, height } = Dimensions.get('window');
const QUEUE_KEY = 'pending_pings';
const API_URL = 'https://summarisable-subarticulative-queenie.ngrok-free.dev/pings';

const geojsonToCoords = (routePath) => {
    if (!routePath) return [];

    try {
        const geojson = typeof routePath === 'string' ? JSON.parse(routePath) : routePath;

        if (geojson.type === 'LineString') {
            return geojson.coordinates.map(([lng, lat]) => ({
                latitude: lat,
                longitude: lng,
            }));
        }

        if (geojson.type === 'MultiLineString') {
            return geojson.coordinates.flatMap(line =>
                line.map(([lng, lat]) => ({ latitude: lat, longitude: lng }))
            );
        }
    } catch (e) {
        console.error('Failed to parse route_path:', e);
    }

    return [];
};

// ─── Calculate map region to fit all coords ───────────────────────────────────
const getRegion = (coords) => {
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

export default function Mapscreen({ route, navigation }) {
    const trail = route?.params?.trail || {};
    const pings = route?.params?.pings || [];

    const [routeCoords, setRouteCoords] = useState([]);
    const [region, setRegion] = useState(null);
    const [selectedPing, setSelectedPing] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tempPing, setTempPing] = useState(null);
    const [isAddingPing, setIsAddingPing] = useState(false);
    const [dangerType, setDangerType] = useState('');
    const [customDetail, setCustomDetail] = useState('');

    const [simulateOffline, setSimulateOffline] = useState(false);
    const [queueCount, setQueueCount] = useState(0);
    const [syncStatus, setSyncStatus] = useState('online'); // 'online' | 'offline' | 'syncing' | 'synced'
    const isSyncing = useRef(false);
    const [currentPings, setCurrentPings] = useState(route?.params?.pings || []);

    const toggleOfflineMode = async () => {
        const goingOffline = !simulateOffline;
        setSimulateOffline(goingOffline);
        if (!goingOffline) {
            // revine online → flush
            await flushQueue();
        } else {
            setSyncStatus('offline');
        }
    };

    useEffect(() => {
        loadQueueCount();
    }, []);

    const loadQueueCount = async () => {
        try {
            const raw = await AsyncStorage.getItem(QUEUE_KEY);
            const queue = raw ? JSON.parse(raw) : [];
            setQueueCount(queue.length);
        } catch (e) {
            console.error('Failed to load queue:', e);
        }
    };

    const saveToQueue = async (payload) => {
        try {
            const raw = await AsyncStorage.getItem(QUEUE_KEY);
            const queue = raw ? JSON.parse(raw) : [];
            queue.push(payload);
            await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
            setQueueCount(queue.length);
        } catch (e) {
            console.error('Failed to save to queue:', e);
        }
    };

    const flushQueue = async () => {
        if (isSyncing.current) return;
        try {
            const raw = await AsyncStorage.getItem(QUEUE_KEY);
            const queue = raw ? JSON.parse(raw) : [];
            if (queue.length === 0) return;

            isSyncing.current = true;
            setSyncStatus('syncing');

            const failed = [];
            for (const payload of queue) {
                try {
                    const res = await fetch(API_URL, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'ngrok-skip-browser-warning': 'true',
                        },
                        body: JSON.stringify(payload),
                    });
                    if (!res.ok) failed.push(payload);
                } catch {
                    failed.push(payload);
                }
            }

            await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(failed));
            setQueueCount(failed.length);
            setSyncStatus(failed.length === 0 ? 'synced' : 'offline');

            // "synced" banner dispare după 3 secunde
            if (failed.length === 0) {
                setTimeout(() => setSyncStatus('online'), 3000);
            }
        } catch (e) {
            console.error('Flush error:', e);
            setSyncStatus('offline');
        } finally {
            isSyncing.current = false;
        }
    };

    useEffect(() => {
        if (trail?.route_path) {
            const coords = geojsonToCoords(trail.route_path);
            setRouteCoords(coords);
            setRegion(getRegion(coords));
        } else {
            setRegion({
                latitude: 45.45,
                longitude: 25.50,
                latitudeDelta: 0.1,
                longitudeDelta: 0.1
            });
        }
        setLoading(false);
    }, [trail.route_path]);

    const startPoint = routeCoords[0];
    const endPoint = routeCoords[routeCoords.length - 1];
    const handleMapPress = (e) => {
        setTempPing(e.nativeEvent.coordinate);
        setIsAddingPing(true);
    };

    const submitNewPing = async () => {
        const payload = {
            "type": dangerType === 'Custom' ? 'Danger' : dangerType,
            "lat": tempPing.latitude,
            "lng": tempPing.longitude,
            "description": customDetail,
            "id": trail.id || trail.osm_id // ne asigurăm că avem un ID
        };

        setIsAddingPing(false);
        setTempPing(null);
        setDangerType('');
        setCustomDetail('');

        if (simulateOffline) {
            await saveToQueue(payload);
            // Adăugăm local cu ID temporar să apară imediat
            setCurrentPings(prev => [...prev, { ...payload, id: `temp-${Date.now()}`, date: new Date().toISOString() }]);
            setSyncStatus('offline');
            return;
        }

        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true',
                },
                body: JSON.stringify(payload),
            });

            // FIX: Trebuie să citim JSON-ul din răspuns
            const result = await res.json();

            if (res.ok) {
                alert('Danger reported!');
                // Dacă backend-ul trimite datele salvate, le punem în listă
                if (result.data && result.data[0]) {
                    setCurrentPings(prev => [result.data[0], ...prev]);
                } else {
                    // Fallback în caz că backend-ul nu trimite obiectul înapoi, îl punem pe cel trimis de noi
                    setCurrentPings(prev => [{...payload, id: Date.now()}, ...prev]);
                }
            } else {
                await saveToQueue(payload);
                setSyncStatus('offline');
            }
        } catch (e) {
            console.error("Submit error:", e);
            await saveToQueue(payload);
            setSyncStatus('offline');
        }
    };

    const renderSyncBanner = () => {
        // Dacă suntem online și nu avem nimic de trimis, nu arătăm nimic
        if (!simulateOffline && queueCount === 0) return null;

        let bgColor, text;
        if (syncStatus === 'syncing') {
            bgColor = '#b45309'; // Portocaliu
            text = `Syncing ${queueCount} pings...`;
        } else if (syncStatus === 'synced') {
            bgColor = '#15803d'; // Verde
            text = '✓ All pings synced!';
        } else if (simulateOffline) {
            bgColor = '#4b5563'; // Gri pentru Offline manual
            text = `Offline Mode · ${queueCount} queued`;
        } else if (queueCount > 0) {
            bgColor = '#991b1b'; // Roșu pentru eroare de semnal (ești online dar ai pachete eșuate)
            text = `Connection issue · ${queueCount} pings waiting`;
        } else {
            return null;
        }

        return (
            <View style={[styles.syncBanner, { backgroundColor: bgColor }]}>
                <Text style={styles.syncBannerText}>{text}</Text>
            </View>
        );
    };

    if (loading || !region) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#f8c8c8" />
                <Text style={styles.loadingText}>Loading trail map...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <MapView
                style={styles.map}
                provider={PROVIDER_DEFAULT}
                initialRegion={region}
                showsUserLocation
                showsCompass
                onLongPress={handleMapPress}
            >
                {/* Trail route line */}
                {routeCoords.length > 0 && (
                    <Polyline
                        coordinates={routeCoords}
                        strokeColor="#f8c8c8"
                        strokeWidth={4}
                    />
                )}

                {/* Start marker */}
                {startPoint && (
                    <Marker
                        coordinate={startPoint}
                        title="Start"
                        pinColor="green"
                    />
                )}

                {/* End marker */}
                {endPoint && endPoint !== startPoint && (
                    <Marker
                        coordinate={endPoint}
                        title="Finish"
                        pinColor="#4a7c59"
                    />
                )}

                {/* Danger pings — lat/lng come directly from pings table */}
                {currentPings.map((ping) => (
                    <Marker
                        key={ping.id ? String(ping.id) : `ping-${ping.lat}-${ping.lng}-${Math.random()}`}
                        coordinate={{ latitude: Number(ping.lat), longitude: Number(ping.lng) }}
                        title={ping.type}
                        description={ping.description}
                        pinColor="red"
                        onPress={() => setSelectedPing(ping)}
                    />
                ))}
                {/*temp marker*/}
                {tempPing && <Marker coordinate={tempPing} pinColor="yellow" />}

            </MapView>
            <Modal visible={isAddingPing} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Report Danger</Text>
                        <View style={styles.chipRow}>
                            {['Bear', 'Viper', 'Wolf', 'Custom'].map(t => (
                                <TouchableOpacity
                                    key={t}
                                    style={[styles.chip, dangerType === t && styles.chipActive]}
                                    onPress={() => setDangerType(t)}
                                >
                                    <Text style={[styles.chipText, dangerType === t && styles.chipTextActive]}>{t}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TextInput
                            style={[styles.textInput, { height: 80, textAlignVertical: 'top' }]} // Înălțime mai mare
                         placeholder="Ex: The bridge over the river is destroyed..."
                            placeholderTextColor="rgba(255,255,255,0.4)"
                            value={customDetail}
                            onChangeText={setCustomDetail}
                            multiline={true}
                            numberOfLines={3}
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
            {/* Back button + trail name */}
            <SafeAreaView style={styles.topOverlay}>
                <View style={styles.topRow}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack()}>
                        <Text style={styles.backText}>← Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.offlineBtn, simulateOffline && styles.offlineBtnActive]}
                        onPress={toggleOfflineMode}
                    >
                        <Text style={styles.offlineBtnText}>
                            {simulateOffline ? 'Offline' : 'Online'}
                        </Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.trailPill}>
                    <Text style={styles.trailPillName}>{trail.name}</Text>
                    <Text style={styles.trailPillSub}>{trail.distance_km} km · {trail.duration}h</Text>
                </View>
                {renderSyncBanner()}
            </SafeAreaView>

            {/* Ping popup when marker is tapped */}
            {selectedPing && (
                <View style={styles.pingPopup}>
                    <View style={styles.pingPopupHeader}>
                        <View style={styles.pingTypeBadge}>
                            <Text style={styles.pingTypeText}>{selectedPing.type}</Text>
                        </View>
                        <TouchableOpacity onPress={() => setSelectedPing(null)}>
                            <Text style={styles.pingClose}>✕</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.pingDesc}>{selectedPing.description}</Text>
                    {selectedPing.date && (
                        <Text style={styles.pingDate}>
                            {new Date(selectedPing.date).toLocaleString('ro-RO', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </Text>
                    )}
                </View>
            )}

            {/* Bottom stats bar */}
            <View style={styles.bottomBar}>
                <View style={styles.bottomStat}>
                    <Text style={styles.bottomStatValue}>{trail.distance_km} km</Text>
                    <Text style={styles.bottomStatLabel}>Distance</Text>
                </View>
                <View style={styles.bottomDivider} />
                <View style={styles.bottomStat}>
                    <Text style={styles.bottomStatValue}>{trail.duration}h</Text>
                    <Text style={styles.bottomStatLabel}>Duration</Text>
                </View>
                <View style={styles.bottomDivider} />
                <View style={styles.bottomStat}>
                    <Text style={styles.bottomStatValue}>+{trail.ascent}m</Text>
                    <Text style={styles.bottomStatLabel}>Ascent</Text>
                </View>
                <View style={styles.bottomDivider} />
                <View style={styles.bottomStat}>
                    <Text style={[styles.bottomStatValue, pings.length > 0 && { color: '#f87171' }]}>
                        {pings.length}
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
    loadingContainer: {
        flex: 1,
        backgroundColor: '#2d5a3d',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
    },
    loadingText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 15,
    },
    topOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        paddingTop: 8,
        gap: 10,
    },
    backBtn: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(30,58,42,0.9)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 99,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    backText: { color: 'white', fontSize: 14, fontWeight: '600' },
    trailPill: {
        alignSelf: 'center',
        backgroundColor: 'rgba(30,58,42,0.9)',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 99,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    trailPillName: { color: 'white', fontWeight: '700', fontSize: 15 },
    trailPillSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 },
    syncBanner: {
        alignSelf: 'center',
        paddingHorizontal: 16, paddingVertical: 8,
        borderRadius: 99,
    },
    syncBannerText: { color: 'white', fontSize: 12, fontWeight: '600' },
    pingPopup: {
        position: 'absolute',
        bottom: 100,
        left: 24,
        right: 24,
        backgroundColor: 'rgba(30,58,42,0.95)',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(239,68,68,0.4)',
        gap: 8,
    },
    pingPopupHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    pingTypeBadge: {
        backgroundColor: 'rgba(239,68,68,0.2)',
        borderRadius: 99,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: '#f87171',
    },
    pingTypeText: { color: '#fca5a5', fontWeight: '700', fontSize: 13 },
    pingClose: { color: 'rgba(255,255,255,0.5)', fontSize: 18, padding: 4 },
    pingDesc: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
    pingDate: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(30,58,42,0.95)',
        flexDirection: 'row',
        paddingVertical: 16,
        paddingHorizontal: 24,
        paddingBottom: 32,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    bottomStat: { alignItems: 'center' },
    bottomStatValue: { color: 'white', fontSize: 18, fontWeight: '700' },
    bottomStatLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 },
    bottomDivider: {
        width: 1,
        height: 30,
        backgroundColor: 'rgba(255,255,255,0.15)',
    },

    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 15 },
    chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    chipActive: { backgroundColor: '#f8c8c8', borderColor: '#f8c8c8' },
    chipText: { color: 'white', fontSize: 13 },
    chipTextActive: { color: '#1e3a2a', fontWeight: '700' },
    modalButtons: { flexDirection: 'row', gap: 10 },
    cancelBtn: { flex: 1, padding: 15, alignItems: 'center' },
    cancelText: { color: 'rgba(255,255,255,0.5)' },
    confirmBtn: { flex: 2, backgroundColor: '#f8c8c8', padding: 15, borderRadius: 10, alignItems: 'center' },
    confirmText: { color: '#1e3a2a', fontWeight: '700' },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        padding: 20
    },
    modalContent: {
        backgroundColor: '#1e3a2a',
        borderRadius: 20,
        padding: 25,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)'
    },
    modalTitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 20,
        textAlign: 'center'
    },
    textInput: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12,
        padding: 15,
        color: 'white',
        fontSize: 16,
        marginBottom: 20
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    offlineBtn: {
        backgroundColor: 'rgba(30,58,42,0.9)',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 99,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    offlineBtnActive: {
        backgroundColor: 'rgba(153,27,27,0.9)',
        borderColor: '#f87171',
    },
    offlineBtnText: {
        color: 'white',
        fontSize: 13,
        fontWeight: '600',
    },

});
