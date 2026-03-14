import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    SafeAreaView,
    ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE, API_HEADERS } from './api';

const DIFFICULTY_COLORS = {
    Beginner:     '#4ade80',
    Intermediate: '#facc15',
    Advanced:     '#fb923c',
    Expert:       '#f87171',
};

const FITNESS_MET = { Low: 5.0, Medium: 6.0, High: 7.0, Athlete: 8.5 };

const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('ro-RO');
    } catch {
        return dateStr;
    }
};

const formatDuration = (minutes) => {
    if (!minutes) return '--';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}min` : `${m}min`;
};

const calcPrep = (trail, weight = 70, fitness = 'Medium') => {
    const met        = FITNESS_MET[fitness] || 6.0;
    const durationH  = (trail.duration || 240) / 60;
    const ascent     = trail.ascent || 0;
    const maxElev    = trail.max_elevation || 0;
    const difficulty = trail.difficulty || 'Intermediate';

    const calories = Math.round(met * weight * durationH);
    const waterL   = (durationH * 0.5).toFixed(1);

    const food = [];
    if (calories > 2000) food.push('Sandwich x2');
    if (calories > 1500) food.push('Energy bars x3');
    food.push('Nuts & dried fruit');
    if (durationH > 5) food.push('Hot meal');
    food.push('Chocolate');

    const equipment = ['Hiking boots', 'Water bottle', 'First aid kit', 'Sunscreen'];
    if (durationH > 4)  equipment.push('Headlamp');
    if (ascent > 600)   equipment.push('Trekking poles');
    if (difficulty === 'Advanced' || difficulty === 'Expert') equipment.push('Emergency blanket');
    if (maxElev > 1800) equipment.push('Wind/fleece layer');
    if (difficulty === 'Beginner') { equipment.push('Trail map'); equipment.push('Whistle'); }

    return {
        calories: `${calories} kcal`,
        water:    `${waterL}L`,
        food:     [...new Set(food)],
        equipment:[...new Set(equipment)],
    };
};

export default function TrailDetails({ route, navigation }) {
    const trailParam = route?.params?.trail || {};

    const [trail,   setTrail]   = useState(trailParam);
    const [pings,   setPings]   = useState([]);
    const [loading, setLoading] = useState(false);

    // Fetch full trail detail (with route_path and pings) from backend
    useEffect(() => {
        const id = trailParam.osm_id || trailParam.id;
        if (!id) return;
        fetchTrailDetail(id);
    }, []);

    const fetchTrailDetail = async (id) => {
        setLoading(true);
        try {
            const resp = await fetch(`${API_BASE}/trails/${id}`, { headers: API_HEADERS });
            const data = await resp.json();
            if (resp.ok) {
                setTrail(data);
                setPings(data.pings || []);
            }
        } catch (e) {
            console.warn('Could not fetch trail detail:', e);
        } finally {
            setLoading(false);
        }
    };

    const prep      = calcPrep(trail);
    const diffColor = DIFFICULTY_COLORS[trail.difficulty] || '#fff';

    return (
        <LinearGradient colors={['#2d5a3d', '#4a7c59', '#7a9e7e']} style={styles.gradient}>
            <SafeAreaView style={styles.safe}>

                <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack()}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>

                {loading ? (
                    <View style={styles.centerBox}>
                        <ActivityIndicator size="large" color="#f8c8c8" />
                    </View>
                ) : (
                    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

                        {/* Hero */}
                        <LinearGradient colors={['#1a3a2a', '#2d5a3d']} style={styles.heroCard}>
                            <View style={styles.heroBadgeRow}>
                                <View style={[styles.diffBadge, { backgroundColor: diffColor + '33', borderColor: diffColor }]}>
                                    <Text style={[styles.diffText, { color: diffColor }]}>{trail.difficulty}</Text>
                                </View>
                                <View style={styles.typeBadge}>
                                    <Text style={styles.typeText}>{trail.user_made ? 'Community trail' : 'Official trail'}</Text>
                                </View>
                            </View>
                            <Text style={styles.heroName}>{trail.name}</Text>
                        </LinearGradient>

                        {/* Stats */}
                        <View style={styles.statsRow}>
                            <View style={styles.statCard}>
                                <Text style={styles.statValue}>{trail.distance_km} km</Text>
                                <Text style={styles.statLabel}>Distance</Text>
                            </View>
                            <View style={styles.statCard}>
                                <Text style={styles.statValue}>{formatDuration(trail.duration)}</Text>
                                <Text style={styles.statLabel}>Duration</Text>
                            </View>
                            <View style={styles.statCard}>
                                <Text style={styles.statValue}>+{trail.ascent}m</Text>
                                <Text style={styles.statLabel}>Ascent</Text>
                            </View>
                            <View style={styles.statCard}>
                                <Text style={styles.statValue}>-{trail.descend}m</Text>
                                <Text style={styles.statLabel}>Descent</Text>
                            </View>
                        </View>

                        {/* Recent dangers */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Recent dangers</Text>
                            {pings.length === 0 ? (
                                <View style={styles.emptyCard}>
                                    <Text style={styles.emptyText}>No dangers reported recently.</Text>
                                </View>
                            ) : (
                                pings.map((ping) => (
                                    <View key={ping.id} style={styles.pingCard}>
                                        <View style={styles.pingHeader}>
                                            <View style={styles.pingTypeBadge}>
                                                <Text style={styles.pingType}>{ping.type}</Text>
                                            </View>
                                            <Text style={styles.pingDate}>{formatDate(ping.date)}</Text>
                                        </View>
                                        <Text style={styles.pingDesc}>{ping.description}</Text>
                                    </View>
                                ))
                            )}
                        </View>

                        {/* Hike prep */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Hike prep</Text>
                            <Text style={styles.prepNote}>
                                Estimated based on trail difficulty and duration. Calculated for an average hiker of 70kg.
                            </Text>
                            <View style={styles.prepStatsRow}>
                                <View style={styles.prepStatCard}>
                                    <Text style={styles.prepStatValue}>{prep.water}</Text>
                                    <Text style={styles.prepStatLabel}>Water</Text>
                                </View>
                                <View style={styles.prepStatCard}>
                                    <Text style={styles.prepStatValue}>{prep.calories}</Text>
                                    <Text style={styles.prepStatLabel}>Calories needed</Text>
                                </View>
                            </View>
                            <Text style={styles.prepSubtitle}>Food to pack</Text>
                            <View style={styles.chipRow}>
                                {prep.food.map((item) => (
                                    <View key={item} style={styles.chip}>
                                        <Text style={styles.chipText}>{item}</Text>
                                    </View>
                                ))}
                            </View>
                            <Text style={styles.prepSubtitle}>Equipment</Text>
                            <View style={styles.chipRow}>
                                {prep.equipment.map((item) => (
                                    <View key={item} style={styles.chip}>
                                        <Text style={styles.chipText}>{item}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        <View style={{ height: 100 }} />
                    </ScrollView>
                )}

                {/* Start Hike */}
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={styles.startBtn}
                        activeOpacity={0.9}
                        onPress={() => navigation.navigate('Mapscreen', { trail, pings })}
                    >
                        <Text style={styles.startBtnText}>Start Hike</Text>
                    </TouchableOpacity>
                </View>

            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    gradient:  { flex: 1 },
    safe:      { flex: 1 },
    centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    backBtn:   { paddingHorizontal: 24, paddingVertical: 12 },
    backText:  { color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '600' },
    container: { paddingHorizontal: 24, paddingBottom: 32, gap: 16 },
    heroCard:  { borderRadius: 16, padding: 20, gap: 8 },
    heroBadgeRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
    diffBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, borderWidth: 1 },
    diffText:  { fontSize: 12, fontWeight: '700' },
    typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    typeText:  { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
    heroName:  { color: 'white', fontSize: 26, fontWeight: '800' },
    statsRow:  { flexDirection: 'row', gap: 10 },
    statCard:  { flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
    statValue: { color: 'white', fontSize: 16, fontWeight: '700' },
    statLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 },
    section:   { gap: 12 },
    sectionTitle: { color: 'white', fontSize: 18, fontWeight: '700' },
    emptyCard: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    emptyText: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },
    pingCard:  { backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', gap: 6 },
    pingHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    pingTypeBadge: { backgroundColor: 'rgba(239,68,68,0.2)', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 3 },
    pingType:  { color: '#fca5a5', fontSize: 12, fontWeight: '700' },
    pingDate:  { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
    pingDesc:  { color: 'rgba(255,255,255,0.75)', fontSize: 14 },
    prepNote:  { color: 'rgba(255,255,255,0.45)', fontSize: 12, fontStyle: 'italic' },
    prepStatsRow: { flexDirection: 'row', gap: 10 },
    prepStatCard: { flex: 1, backgroundColor: 'rgba(248,200,200,0.15)', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(248,200,200,0.3)' },
    prepStatValue:{ color: '#f8c8c8', fontSize: 18, fontWeight: '700' },
    prepStatLabel:{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 },
    prepSubtitle: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },
    chipRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip:      { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    chipText:  { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '500' },
    footer:    { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, backgroundColor: 'rgba(45,90,61,0.95)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
    startBtn:  { backgroundColor: '#f8c8c8', borderRadius: 14, paddingVertical: 18, alignItems: 'center' },
    startBtnText: { color: '#2d5a3d', fontSize: 17, fontWeight: '700' },
});