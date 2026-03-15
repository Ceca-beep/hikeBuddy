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

const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try { return new Date(dateStr).toLocaleDateString('ro-RO'); }
    catch { return dateStr; }
};

const formatDuration = (minutes) => {
    if (!minutes) return '--';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}min` : `${m}min`;
};

const calcLocalPrep = (trail, weight = 70) => {
    const durationH = (trail.duration || 240) / 60;
    const calories  = Math.round(6.0 * weight * durationH);
    const waterL    = (durationH * 0.5).toFixed(1);
    return {
        calories: `${calories} kcal`,
        water:    `${waterL}L`,
        food:     ['Sandwich x2', 'Energy bars x3', 'Nuts & dried fruit', 'Chocolate'],
        equipment:['Hiking boots', 'Water bottle', 'First aid kit', 'Sunscreen'],
    };
};

export default function TrailDetails({ route, navigation }) {
    const trailParam      = route?.params?.trail   || {};
    const selectedDate    = route?.params?.date    || null;
    const selectedFitness = route?.params?.fitness || 'Medium';

    const [trail,       setTrail]       = useState(trailParam);
    const [pings,       setPings]       = useState([]);
    const [suggestions, setSuggestions] = useState(null);
    const [loading,     setLoading]     = useState(false);
    const [sugLoading,  setSugLoading]  = useState(false);

    useEffect(() => {
        const id = trailParam.osm_id || trailParam.id;
        if (id) fetchTrailDetail(id);
    }, []);

    useEffect(() => {
        if (trail?.id && selectedDate) {
            fetchSuggestions(trail.id, selectedDate, selectedFitness);
        }
    }, [trail?.id, selectedDate]);

    const fetchTrailDetail = async (id) => {
        setLoading(true);
        try {
            const resp = await fetch(`${API_BASE}/trails/${id}`, { headers: API_HEADERS });
            const data = await resp.json();
            if (resp.ok) { setTrail(data); setPings(data.pings || []); }
        } catch (e) {
            console.warn('Could not fetch trail detail:', e);
        } finally {
            setLoading(false);
        }
    };

    const fetchSuggestions = async (trailId, date, fitness) => {
        setSugLoading(true);
        try {
            const params = new URLSearchParams({ date, weight_kg: 70, age: 30, fitness: fitness || 'Medium' });
            const resp = await fetch(`${API_BASE}/suggestions/${trailId}?${params.toString()}`, { headers: API_HEADERS });
            const data = await resp.json();
            if (resp.ok) setSuggestions(data);
        } catch (e) {
            console.warn('Could not fetch suggestions:', e);
        } finally {
            setSugLoading(false);
        }
    };

    const gear      = suggestions?.gear || null;
    const localPrep = calcLocalPrep(trail);
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
                            {selectedDate && (
                                <Text style={styles.heroDate}>📅 {formatDate(selectedDate)}</Text>
                            )}
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

                        {/* Weather */}
                        {selectedDate && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Weather forecast</Text>
                                {sugLoading ? (
                                    <View style={styles.loadingCard}>
                                        <ActivityIndicator size="small" color="#f8c8c8" />
                                        <Text style={styles.loadingText}>Loading forecast...</Text>
                                    </View>
                                ) : suggestions?.weather?.weather_available ? (
                                    <View style={styles.weatherCard}>
                                        <View style={styles.weatherRow}>
                                            <Text style={styles.weatherLabel}>🌅 Sunrise</Text>
                                            <Text style={styles.weatherValue}>{suggestions.weather.sunrise}</Text>
                                            <Text style={styles.weatherLabel}>🌇 Sunset</Text>
                                            <Text style={styles.weatherValue}>{suggestions.weather.sunset}</Text>
                                        </View>
                                        {suggestions.weather.latest_start_time && (
                                            <>
                                                <View style={styles.weatherDivider} />
                                                <View style={styles.latestStartRow}>
                                                    <Text style={styles.weatherLabel}>⏰ Latest safe start</Text>
                                                    <Text style={styles.latestStartValue}>{suggestions.weather.latest_start_time}</Text>
                                                </View>
                                            </>
                                        )}
                                        <View style={styles.weatherDivider} />
                                        <Text style={styles.weatherSectionLabel}>Trailhead</Text>
                                        <View style={styles.weatherRow}>
                                            <Text style={styles.weatherLabel}>🌡️</Text>
                                            <Text style={styles.weatherValue}>{suggestions.weather.start.temp_min_c}° – {suggestions.weather.start.temp_max_c}°C</Text>
                                            <Text style={styles.weatherLabel}>🌧️</Text>
                                            <Text style={styles.weatherValue}>{suggestions.weather.start.rain_probability}%</Text>
                                            <Text style={styles.weatherLabel}>💨</Text>
                                            <Text style={styles.weatherValue}>{suggestions.weather.start.wind_kmh} km/h</Text>
                                        </View>
                                        <View style={styles.weatherDivider} />
                                        <Text style={styles.weatherSectionLabel}>Summit</Text>
                                        <View style={styles.weatherRow}>
                                            <Text style={styles.weatherLabel}>🌡️</Text>
                                            <Text style={styles.weatherValue}>{suggestions.weather.summit.temp_min_c}° – {suggestions.weather.summit.temp_max_c}°C</Text>
                                            <Text style={styles.weatherLabel}>🌧️</Text>
                                            <Text style={styles.weatherValue}>{suggestions.weather.summit.rain_probability}%</Text>
                                            <Text style={styles.weatherLabel}>💨</Text>
                                            <Text style={styles.weatherValue}>{suggestions.weather.summit.wind_kmh} km/h</Text>
                                        </View>
                                    </View>
                                ) : (
                                    <View style={styles.infoCard}>
                                        <Text style={styles.infoText}>
                                            {suggestions?.weather?.forecast_message || 'Weather not available for this date.'}
                                        </Text>
                                        {suggestions?.weather?.sunrise && (
                                            <Text style={styles.infoText}>🌅 {suggestions.weather.sunrise} – 🌇 {suggestions.weather.sunset}</Text>
                                        )}
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Warnings */}
                        {suggestions?.warnings?.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Warnings</Text>
                                {suggestions.warnings.map((w, i) => (
                                    <View key={i} style={styles.warningCard}>
                                        <Text style={styles.warningText}>{w}</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Seasons */}
                        {suggestions?.recommended_seasons && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Best seasons</Text>
                                <View style={styles.seasonRow}>
                                    {['spring', 'summer', 'autumn', 'winter'].map((s) => {
                                        const active = suggestions.recommended_seasons.includes(s);
                                        return (
                                            <View key={s} style={[styles.seasonChip, active && styles.seasonChipActive]}>
                                                <Text style={[styles.seasonText, active && styles.seasonTextActive]}>
                                                    {s.charAt(0).toUpperCase() + s.slice(1)}
                                                </Text>
                                            </View>
                                        );
                                    })}
                                </View>
                                {suggestions.season_warning && (
                                    <View style={styles.warningCard}>
                                        <Text style={styles.warningText}>{suggestions.season_warning}</Text>
                                    </View>
                                )}
                            </View>
                        )}

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
                            {!selectedDate && (
                                <Text style={styles.prepNote}>
                                    Select a date on the home screen for personalised gear recommendations.
                                </Text>
                            )}
                            {sugLoading ? (
                                <View style={styles.loadingCard}>
                                    <ActivityIndicator size="small" color="#f8c8c8" />
                                    <Text style={styles.loadingText}>Calculating gear...</Text>
                                </View>
                            ) : (
                                <>
                                    <View style={styles.prepStatsRow}>
                                        <View style={styles.prepStatCard}>
                                            <Text style={styles.prepStatValue}>{localPrep.water}</Text>
                                            <Text style={styles.prepStatLabel}>Water</Text>
                                        </View>
                                        <View style={styles.prepStatCard}>
                                            <Text style={styles.prepStatValue}>{localPrep.calories}</Text>
                                            <Text style={styles.prepStatLabel}>Calories</Text>
                                        </View>
                                    </View>

                                    {gear?.essential?.length > 0 ? (
                                        <>
                                            <Text style={styles.prepSubtitle}>Essential</Text>
                                            <View style={styles.chipRow}>
                                                {gear.essential.map((item, i) => (
                                                    <View key={i} style={[styles.chip, styles.chipEssential]}>
                                                        <Text style={styles.chipText}>{item}</Text>
                                                    </View>
                                                ))}
                                            </View>
                                            {gear.recommended?.length > 0 && (
                                                <>
                                                    <Text style={styles.prepSubtitle}>Recommended</Text>
                                                    <View style={styles.chipRow}>
                                                        {gear.recommended.map((item, i) => (
                                                            <View key={i} style={styles.chip}>
                                                                <Text style={styles.chipText}>{item}</Text>
                                                            </View>
                                                        ))}
                                                    </View>
                                                </>
                                            )}
                                            {gear.optional?.length > 0 && (
                                                <>
                                                    <Text style={styles.prepSubtitle}>Optional</Text>
                                                    <View style={styles.chipRow}>
                                                        {gear.optional.map((item, i) => (
                                                            <View key={i} style={[styles.chip, styles.chipOptional]}>
                                                                <Text style={styles.chipText}>{item}</Text>
                                                            </View>
                                                        ))}
                                                    </View>
                                                </>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <Text style={styles.prepSubtitle}>Food to pack</Text>
                                            <View style={styles.chipRow}>
                                                {localPrep.food.map((item) => (
                                                    <View key={item} style={styles.chip}>
                                                        <Text style={styles.chipText}>{item}</Text>
                                                    </View>
                                                ))}
                                            </View>
                                            <Text style={styles.prepSubtitle}>Equipment</Text>
                                            <View style={styles.chipRow}>
                                                {localPrep.equipment.map((item) => (
                                                    <View key={item} style={styles.chip}>
                                                        <Text style={styles.chipText}>{item}</Text>
                                                    </View>
                                                ))}
                                            </View>
                                        </>
                                    )}
                                </>
                            )}
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
    heroDate:  { color: '#f8c8c8', fontSize: 13, marginTop: 4 },
    statsRow:  { flexDirection: 'row', gap: 10 },
    statCard:  { flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
    statValue: { color: 'white', fontSize: 16, fontWeight: '700' },
    statLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 },
    section:      { gap: 10 },
    sectionTitle: { color: 'white', fontSize: 18, fontWeight: '700' },
    loadingCard:  { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
    loadingText:  { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
    weatherCard:         { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 16, gap: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    weatherRow:          { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    weatherLabel:        { color: 'rgba(255,255,255,0.55)', fontSize: 13 },
    weatherValue:        { color: 'white', fontSize: 13, fontWeight: '600', marginRight: 10 },
    weatherDivider:      { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 4 },
    weatherSectionLabel: { color: '#f8c8c8', fontSize: 13, fontWeight: '700' },
    latestStartRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    latestStartValue:    { color: '#f8c8c8', fontSize: 16, fontWeight: '800' },
    infoCard:  { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 14, gap: 6 },
    infoText:  { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
    warningCard: { backgroundColor: 'rgba(239,68,68,0.12)', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)' },
    warningText: { color: '#fca5a5', fontSize: 13, lineHeight: 20 },
    seasonRow:        { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    seasonChip:       { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.06)' },
    seasonChipActive: { backgroundColor: 'rgba(248,200,200,0.2)', borderColor: '#f8c8c8' },
    seasonText:       { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '600' },
    seasonTextActive: { color: 'white' },
    emptyCard:    { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 14 },
    emptyText:    { color: 'rgba(255,255,255,0.5)', fontSize: 14 },
    pingCard:     { backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', gap: 6 },
    pingHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    pingTypeBadge:{ backgroundColor: 'rgba(239,68,68,0.2)', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 3 },
    pingType:     { color: '#fca5a5', fontSize: 12, fontWeight: '700' },
    pingDate:     { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
    pingDesc:     { color: 'rgba(255,255,255,0.75)', fontSize: 14 },
    prepNote:     { color: 'rgba(255,255,255,0.45)', fontSize: 12, fontStyle: 'italic' },
    prepStatsRow: { flexDirection: 'row', gap: 10 },
    prepStatCard: { flex: 1, backgroundColor: 'rgba(248,200,200,0.15)', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(248,200,200,0.3)' },
    prepStatValue:{ color: '#f8c8c8', fontSize: 18, fontWeight: '700' },
    prepStatLabel:{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 },
    prepSubtitle: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600', letterSpacing: 0.5, marginTop: 4 },
    chipRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip:         { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    chipEssential:{ backgroundColor: 'rgba(248,200,200,0.15)', borderColor: 'rgba(248,200,200,0.4)' },
    chipOptional: { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' },
    chipText:     { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '500' },
    footer:       { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, backgroundColor: 'rgba(45,90,61,0.95)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
    startBtn:     { backgroundColor: '#f8c8c8', borderRadius: 14, paddingVertical: 18, alignItems: 'center' },
    startBtnText: { color: '#2d5a3d', fontSize: 17, fontWeight: '700' },
});