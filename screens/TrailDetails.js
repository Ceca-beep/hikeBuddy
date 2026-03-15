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
import { API_BASE, API_HEADERS } from './Api';

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

    const [trail,      setTrail]      = useState(trailParam);
    const [pings,      setPings]      = useState([]);
    const [suggestions,setSuggestions]= useState(null);
    const [loading,    setLoading]    = useState(false);
    const [sugLoading, setSugLoading] = useState(false);

    useEffect(() => {
        const id = trailParam.osm_id || trailParam.id;
        if (!id) return;
        (async () => {
            setLoading(true);
            let fullTrailId = trailParam.id;
            try {
                const resp = await fetch(`${API_BASE}/trails/${id}`, { headers: API_HEADERS });
                const data = await resp.json();
                if (resp.ok) { setTrail(data); setPings(data.pings || []); fullTrailId = data.id; }
            } catch (e) { console.warn('Trail fetch error:', e); }
            finally { setLoading(false); }

            if (selectedDate && fullTrailId) {
                setSugLoading(true);
                try {
                    const params = new URLSearchParams({ date: selectedDate, weight_kg: 70, age: 30, fitness: selectedFitness || 'Medium' });
                    const resp = await fetch(`${API_BASE}/suggestions/${fullTrailId}?${params}`, { headers: API_HEADERS });
                    const data = await resp.json();
                    console.log('STATUS:', resp.status);
                    console.log('DATA:', JSON.stringify(data, null, 2));
                    if (resp.ok) setSuggestions(data);
                } catch (e) { console.warn('Suggestions fetch error:', e); }
                finally { setSugLoading(false); }
            }
        })();
    }, []);

    const gear      = suggestions?.gear || null;
    const weather   = suggestions?.weather || null;
    const localPrep = calcLocalPrep(trail);
    const diffColor = DIFFICULTY_COLORS[trail.difficulty] || '#fff';

    return (
        <LinearGradient colors={['#2d5a3d', '#4a7c59', '#7a9e7e']} style={styles.gradient}>
            <SafeAreaView style={styles.safe}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack()}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>

                {loading ? (
                    <View style={styles.centerBox}><ActivityIndicator size="large" color="#f8c8c8" /></View>
                ) : (
                    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

                        {/* HERO */}
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
                            {selectedDate && <Text style={styles.heroDate}> {formatDate(selectedDate)}</Text>}
                        </LinearGradient>

                        {/* STATS */}
                        <View style={styles.statsRow}>
                            <View style={styles.statCard}>
                                <Text style={styles.statValue}>{(() => { const d = parseFloat(trail.distance_km); return isNaN(d) ? '0' : d > 1000 ? (d/1000).toFixed(1) : d.toFixed(1); })()} km</Text>
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

                        {/* WEATHER */}
                        {selectedDate && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Weather forecast</Text>
                                {sugLoading ? (
                                    <View style={styles.loadingCard}>
                                        <ActivityIndicator size="small" color="#f8c8c8" />
                                        <Text style={styles.loadingText}>Loading forecast...</Text>
                                    </View>
                                ) : (
                                    <>
                                        {/* DAYLIGHT — always show if sunrise exists */}
                                        {weather?.sunrise ? (
                                            <View style={styles.daylightCard}>
                                                <View style={styles.daylightRow}>
                                                    <View style={styles.daylightItem}>
                                                        <Text style={styles.daylightIcon}></Text>
                                                        <View>
                                                            <Text style={styles.daylightLabel}>SUNRISE</Text>
                                                            <Text style={styles.daylightValue}>{weather.sunrise}</Text>
                                                        </View>
                                                    </View>
                                                    <View style={styles.daylightDivider} />
                                                    <View style={styles.daylightItem}>
                                                        <Text style={styles.daylightIcon}>️</Text>
                                                        <View>
                                                            <Text style={styles.daylightLabel}>DAYLIGHT</Text>
                                                            <Text style={styles.daylightValue}>{weather.total_daylight_hours}h</Text>
                                                        </View>
                                                    </View>
                                                    <View style={styles.daylightDivider} />
                                                    <View style={styles.daylightItem}>
                                                        <Text style={styles.daylightIcon}></Text>
                                                        <View>
                                                            <Text style={styles.daylightLabel}>SUNSET</Text>
                                                            <Text style={styles.daylightValue}>{weather.sunset}</Text>
                                                        </View>
                                                    </View>
                                                </View>
                                                {weather.latest_start_time && (
                                                    <View style={styles.latestStartBanner}>
                                                        <View>
                                                            <Text style={styles.latestStartLabel}> Latest safe start</Text>
                                                            <Text style={styles.latestStartHint}>To finish before dark (30 min buffer)</Text>
                                                        </View>
                                                        <Text style={styles.latestStartTime}>{weather.latest_start_time}</Text>
                                                    </View>
                                                )}
                                            </View>
                                        ) : !suggestions ? (
                                            <View style={styles.infoCard}>
                                                <Text style={styles.infoText}>Select a date to see forecast.</Text>
                                            </View>
                                        ) : null}

                                        {/* RELIABILITY */}
                                        {weather?.forecast_reliability && (
                                            <View style={[styles.reliabilityBadge, {
                                                backgroundColor: weather.forecast_reliability === 'high' ? 'rgba(74,222,128,0.15)' : weather.forecast_reliability === 'medium' ? 'rgba(250,204,21,0.15)' : 'rgba(251,146,60,0.15)',
                                                borderColor: weather.forecast_reliability === 'high' ? '#4ade8055' : weather.forecast_reliability === 'medium' ? '#facc1555' : '#fb923c55',
                                            }]}>
                                                <Text style={[styles.reliabilityText, { color: weather.forecast_reliability === 'high' ? '#4ade80' : weather.forecast_reliability === 'medium' ? '#facc15' : '#fb923c' }]}>
                                                    {weather.forecast_reliability === 'high' ? '✓ High reliability' : weather.forecast_reliability === 'medium' ? '~ Medium reliability' : '⚠ Low reliability'}
                                                </Text>
                                            </View>
                                        )}

                                        {/* TRAILHEAD + SUMMIT */}
                                        {weather?.weather_available && weather?.start && weather?.summit && (
                                            <View style={styles.weatherCard}>
                                                <Text style={styles.weatherPointTitle}> Trailhead</Text>
                                                <View style={styles.weatherStatRow}>
                                                    <View style={styles.weatherStat}><Text style={styles.weatherStatIcon}>🌡️</Text><Text style={styles.weatherStatLabel}>MIN</Text><Text style={styles.weatherStatValue}>{weather.start.temp_min_c}°C</Text></View>
                                                    <View style={styles.weatherStat}><Text style={styles.weatherStatIcon}>🌡️</Text><Text style={styles.weatherStatLabel}>MAX</Text><Text style={styles.weatherStatValue}>{weather.start.temp_max_c}°C</Text></View>
                                                    <View style={styles.weatherStat}><Text style={styles.weatherStatIcon}>🌧️</Text><Text style={styles.weatherStatLabel}>RAIN</Text><Text style={[styles.weatherStatValue, weather.start.rain_probability > 35 && { color: '#f8c8c8' }]}>{weather.start.rain_probability}%</Text></View>
                                                    <View style={styles.weatherStat}><Text style={styles.weatherStatIcon}>💨</Text><Text style={styles.weatherStatLabel}>WIND</Text><Text style={[styles.weatherStatValue, weather.start.wind_kmh > 40 && { color: '#f8c8c8' }]}>{weather.start.wind_kmh} km/h</Text></View>
                                                </View>
                                                <View style={styles.weatherDivider} />
                                                <Text style={styles.weatherPointTitle}> Summit</Text>
                                                <View style={styles.weatherStatRow}>
                                                    <View style={styles.weatherStat}><Text style={styles.weatherStatIcon}></Text><Text style={styles.weatherStatLabel}>MIN</Text><Text style={styles.weatherStatValue}>{weather.summit.temp_min_c}°C</Text></View>
                                                    <View style={styles.weatherStat}><Text style={styles.weatherStatIcon}></Text><Text style={styles.weatherStatLabel}>MAX</Text><Text style={styles.weatherStatValue}>{weather.summit.temp_max_c}°C</Text></View>
                                                    <View style={styles.weatherStat}><Text style={styles.weatherStatIcon}></Text><Text style={styles.weatherStatLabel}>RAIN</Text><Text style={[styles.weatherStatValue, weather.summit.rain_probability > 35 && { color: '#f8c8c8' }]}>{weather.summit.rain_probability}%</Text></View>
                                                    <View style={styles.weatherStat}><Text style={styles.weatherStatIcon}></Text><Text style={styles.weatherStatLabel}>WIND</Text><Text style={[styles.weatherStatValue, weather.summit.wind_kmh > 40 && { color: '#f8c8c8' }]}>{weather.summit.wind_kmh} km/h</Text></View>
                                                </View>
                                            </View>
                                        )}

                                        {/* NO FORECAST MESSAGE */}
                                        {weather && !weather.weather_available && weather.forecast_message && (
                                            <View style={styles.infoCard}>
                                                <Text style={styles.infoText}>{weather.forecast_message}</Text>
                                            </View>
                                        )}

                                        {/* SEASON */}
                                        {weather?.season && (
                                            <View style={styles.seasonIndicator}>
                                                <Text style={styles.seasonIndicatorText}>{SEASON_ICONS[weather.season]} Season: {weather.season.charAt(0).toUpperCase() + weather.season.slice(1)}</Text>
                                            </View>
                                        )}
                                    </>
                                )}
                            </View>
                        )}

                        {/* WARNINGS */}
                        {suggestions?.warnings?.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Warnings</Text>
                                {suggestions.warnings.map((w, i) => (
                                    <View key={i} style={[styles.warningCard, w.startsWith('🔴') && styles.warningCardCritical]}>
                                        <Text style={[styles.warningText, w.startsWith('🔴') && { color: '#ff6b6b', fontWeight: '700' }]}>{w}</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* BEST SEASONS */}
                        {suggestions?.recommended_seasons && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Best seasons</Text>
                                <View style={styles.seasonRow}>
                                    {['spring', 'summer', 'autumn', 'winter'].map((s) => {
                                        const active = suggestions.recommended_seasons.includes(s);
                                        return (
                                            <View key={s} style={[styles.seasonChip, active && styles.seasonChipActive]}>
                                                <Text style={styles.seasonChipIcon}>{SEASON_ICONS[s]}</Text>
                                                <Text style={[styles.seasonText, active && styles.seasonTextActive]}>{s.charAt(0).toUpperCase() + s.slice(1)}</Text>
                                            </View>
                                        );
                                    })}
                                </View>
                                {suggestions.season_warning && (
                                    <View style={styles.warningCard}><Text style={styles.warningText}>{suggestions.season_warning}</Text></View>
                                )}
                            </View>
                        )}

                        {/* RECENT DANGERS */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Recent dangers</Text>
                            {pings.length === 0 ? (
                                <View style={styles.emptyCard}><Text style={styles.emptyText}>No dangers reported recently.</Text></View>
                            ) : (
                                pings.map((ping) => (
                                    <View key={ping.id} style={styles.pingCard}>
                                        <View style={styles.pingHeader}>
                                            <View style={styles.pingTypeBadge}><Text style={styles.pingType}>{ping.type}</Text></View>
                                            <Text style={styles.pingDate}>{formatDate(ping.date)}</Text>
                                        </View>
                                        <Text style={styles.pingDesc}>{ping.description}</Text>
                                    </View>
                                ))
                            )}
                        </View>

                        {/* HIKE PREP */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Hike prep</Text>
                            {!selectedDate && <Text style={styles.prepNote}>Select a date on the home screen for personalised gear recommendations.</Text>}
                            {sugLoading ? (
                                <View style={styles.loadingCard}>
                                    <ActivityIndicator size="small" color="#f8c8c8" />
                                    <Text style={styles.loadingText}>Calculating gear...</Text>
                                </View>
                            ) : (
                                <>
                                    <View style={styles.prepStatsRow}>
                                        <View style={styles.prepStatCard}><Text style={styles.prepStatValue}>{localPrep.water}</Text><Text style={styles.prepStatLabel}>Water</Text></View>
                                        <View style={styles.prepStatCard}><Text style={styles.prepStatValue}>{localPrep.calories}</Text><Text style={styles.prepStatLabel}>Calories</Text></View>
                                    </View>
                                    {gear?.essential?.length > 0 ? (
                                        <>
                                            <Text style={styles.prepSubtitle}>Essential</Text>
                                            <View style={styles.chipRow}>{gear.essential.map((item, i) => <View key={i} style={[styles.chip, styles.chipEssential]}><Text style={styles.chipText}>{item}</Text></View>)}</View>
                                            {gear.recommended?.length > 0 && <><Text style={styles.prepSubtitle}>Recommended</Text><View style={styles.chipRow}>{gear.recommended.map((item, i) => <View key={i} style={styles.chip}><Text style={styles.chipText}>{item}</Text></View>)}</View></>}
                                            {gear.optional?.length > 0 && <><Text style={styles.prepSubtitle}>Optional</Text><View style={styles.chipRow}>{gear.optional.map((item, i) => <View key={i} style={[styles.chip, styles.chipOptional]}><Text style={styles.chipText}>{item}</Text></View>)}</View></>}
                                        </>
                                    ) : (
                                        <>
                                            <Text style={styles.prepSubtitle}>Food to pack</Text>
                                            <View style={styles.chipRow}>{localPrep.food.map((item) => <View key={item} style={styles.chip}><Text style={styles.chipText}>{item}</Text></View>)}</View>
                                            <Text style={styles.prepSubtitle}>Equipment</Text>
                                            <View style={styles.chipRow}>{localPrep.equipment.map((item) => <View key={item} style={styles.chip}><Text style={styles.chipText}>{item}</Text></View>)}</View>
                                        </>
                                    )}
                                </>
                            )}
                        </View>

                        <View style={{ height: 100 }} />
                    </ScrollView>
                )}

                <View style={styles.footer}>
                    <TouchableOpacity style={styles.startBtn} activeOpacity={0.9} onPress={() => navigation.navigate('Mapscreen', { trail, pings })}>
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
    statValue: { color: 'white', fontSize: 15, fontWeight: '700' },
    statLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 },
    section:      { gap: 10 },
    sectionTitle: { color: 'white', fontSize: 18, fontWeight: '700' },
    loadingCard:  { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
    loadingText:  { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
    daylightCard:    { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 16, gap: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    daylightRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    daylightItem:    { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'center' },
    daylightIcon:    { fontSize: 20 },
    daylightLabel:   { color: 'rgba(255,255,255,0.45)', fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
    daylightValue:   { color: 'white', fontSize: 15, fontWeight: '700' },
    daylightDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.1)' },
    latestStartBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(248,200,200,0.12)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(248,200,200,0.3)' },
    latestStartLabel:  { color: '#f8c8c8', fontSize: 13, fontWeight: '700' },
    latestStartHint:   { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 1 },
    latestStartTime:   { color: '#f8c8c8', fontSize: 24, fontWeight: '800' },
    reliabilityBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 99, borderWidth: 1 },
    reliabilityText:  { fontSize: 12, fontWeight: '600' },
    weatherCard:       { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 16, gap: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    weatherPointTitle: { color: '#f8c8c8', fontSize: 13, fontWeight: '700' },
    weatherStatRow:    { flexDirection: 'row', justifyContent: 'space-between' },
    weatherStat:       { alignItems: 'center', flex: 1 },
    weatherStatIcon:   { fontSize: 16, marginBottom: 2 },
    weatherStatLabel:  { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '700', letterSpacing: 0.4 },
    weatherStatValue:  { color: 'white', fontSize: 13, fontWeight: '700', marginTop: 1 },
    weatherDivider:    { height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
    seasonIndicator:     { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
    seasonIndicatorText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600' },
    infoCard:  { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 14, gap: 6 },
    infoText:  { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
    warningCard:         { backgroundColor: 'rgba(239,68,68,0.12)', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)' },
    warningCardCritical: { backgroundColor: 'rgba(239,68,68,0.22)', borderColor: 'rgba(239,68,68,0.5)' },
    warningText:         { color: '#fca5a5', fontSize: 13, lineHeight: 20 },
    seasonRow:        { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    seasonChip:       { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.06)' },
    seasonChipActive: { backgroundColor: 'rgba(248,200,200,0.2)', borderColor: '#f8c8c8' },
    seasonChipIcon:   { fontSize: 14 },
    seasonText:       { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '600' },
    seasonTextActive: { color: 'white' },
    emptyCard:     { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 14 },
    emptyText:     { color: 'rgba(255,255,255,0.5)', fontSize: 14 },
    pingCard:      { backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', gap: 6 },
    pingHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    pingTypeBadge: { backgroundColor: 'rgba(239,68,68,0.2)', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 3 },
    pingType:      { color: '#fca5a5', fontSize: 12, fontWeight: '700' },
    pingDate:      { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
    pingDesc:      { color: 'rgba(255,255,255,0.75)', fontSize: 14 },
    prepNote:      { color: 'rgba(255,255,255,0.45)', fontSize: 12, fontStyle: 'italic' },
    prepStatsRow:  { flexDirection: 'row', gap: 10 },
    prepStatCard:  { flex: 1, backgroundColor: 'rgba(248,200,200,0.15)', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(248,200,200,0.3)' },
    prepStatValue: { color: '#f8c8c8', fontSize: 18, fontWeight: '700' },
    prepStatLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 },
    prepSubtitle:  { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600', letterSpacing: 0.5, marginTop: 4 },
    chipRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip:          { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    chipEssential: { backgroundColor: 'rgba(248,200,200,0.15)', borderColor: 'rgba(248,200,200,0.4)' },
    chipOptional:  { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' },
    chipText:      { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '500' },
    footer:       { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, backgroundColor: 'rgba(45,90,61,0.95)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
    startBtn:     { backgroundColor: '#f8c8c8', borderRadius: 14, paddingVertical: 18, alignItems: 'center' },
    startBtnText: { color: '#2d5a3d', fontSize: 17, fontWeight: '700' },
});