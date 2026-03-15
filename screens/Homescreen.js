import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Modal,
    SafeAreaView,
    FlatList,
    ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar } from 'react-native-calendars';
import { API_BASE, API_HEADERS } from './Api';

const DIFFICULTY_OPTIONS = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
const FITNESS_OPTIONS    = ['Low', 'Medium', 'High', 'Athlete'];
const DURATION_OPTIONS   = ['Under 2h', '2-4h', '4-6h', 'Over 6h'];
const DISTANCE_OPTIONS   = [
    { label: 'Any',       min: null, max: null  },
    { label: 'Under 5km', min: null, max: 5     },
    { label: '5–15km',    min: 5,    max: 15    },
    { label: '15–30km',   min: 15,   max: 30    },
    { label: 'Over 30km', min: 30,   max: null  },
];

const DIFFICULTY_COLORS = {
    Beginner:     '#4ade80',
    Intermediate: '#facc15',
    Advanced:     '#fb923c',
    Expert:       '#f87171',
};

const buildMarkedDates = (start, end) => {
    if (!start) return {};
    const marked     = {};
    const startColor = '#f8c8c8';
    const rangeColor = 'rgba(248,200,200,0.25)';
    if (!end || start === end) {
        marked[start] = { selected: true, startingDay: true, endingDay: true, color: startColor, textColor: '#2d5a3d' };
        return marked;
    }
    let current = new Date(start);
    const endDate = new Date(end);
    while (current <= endDate) {
        const dateStr = current.toISOString().split('T')[0];
        if (dateStr === start)    marked[dateStr] = { startingDay: true, color: startColor, textColor: '#2d5a3d' };
        else if (dateStr === end) marked[dateStr] = { endingDay: true, color: startColor, textColor: '#2d5a3d' };
        else                      marked[dateStr] = { color: rangeColor, textColor: 'white' };
        current.setDate(current.getDate() + 1);
    }
    return marked;
};

const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
};

const formatDuration = (minutes) => {
    if (!minutes) return '--';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}min` : `${m}min`;
};

export default function HomeScreen({ navigation }) {
    const [trails,        setTrails]        = useState([]);
    const [loading,       setLoading]       = useState(true);
    const [error,         setError]         = useState(null);
    const [search,        setSearch]        = useState('');
    const [filterVisible, setFilterVisible] = useState(false);

    const [selectedDifficulty, setSelectedDifficulty] = useState([]);
    const [selectedFitness,    setSelectedFitness]    = useState('Medium');
    const [selectedDuration,   setSelectedDuration]   = useState([]);
    const [selectedDistance,   setSelectedDistance]   = useState('Any');
    const [startDate,          setStartDate]          = useState('');
    const [endDate,            setEndDate]            = useState('');

    const [pendingDifficulty, setPendingDifficulty] = useState([]);
    const [pendingFitness,    setPendingFitness]    = useState('Medium');
    const [pendingDuration,   setPendingDuration]   = useState([]);
    const [pendingDistance,   setPendingDistance]   = useState('Any');
    const [pendingStart,      setPendingStart]      = useState('');
    const [pendingEnd,        setPendingEnd]        = useState('');

    const fetchTrails = async (params = {}) => {
        setLoading(true);
        setError(null);
        try {
            const q = new URLSearchParams();
            if (params.query)      q.append('query',      params.query);
            if (params.difficulty) q.append('difficulty', params.difficulty);
            if (params.duration)   q.append('duration',   params.duration);
            if (params.min_dist)   q.append('min_dist',   params.min_dist);
            if (params.max_dist)   q.append('max_dist',   params.max_dist);
            q.append('limit', '50');

            const resp = await fetch(`${API_BASE}/trails?${q.toString()}`, {
                headers: API_HEADERS,
            });
            const data = await resp.json();
            setTrails(data.trails || []);
        } catch (e) {
            console.error('Failed to fetch trails:', e);
            setError('Could not load trails. Check your connection.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchTrails(); }, []);

    useEffect(() => {
        const distObj = DISTANCE_OPTIONS.find(d => d.label === selectedDistance);
        const timer = setTimeout(() => {
            fetchTrails({
                query:      search       || undefined,
                difficulty: selectedDifficulty[0] || undefined,
                duration:   selectedDuration[0]   || undefined,
                min_dist:   distObj?.min  || undefined,
                max_dist:   distObj?.max  || undefined,
            });
        }, 400);
        return () => clearTimeout(timer);
    }, [search, selectedDifficulty, selectedDuration, selectedDistance]);

    const openFilters = () => {
        setPendingDifficulty([...selectedDifficulty]);
        setPendingFitness(selectedFitness);
        setPendingDuration([...selectedDuration]);
        setPendingDistance(selectedDistance);
        setPendingStart(startDate);
        setPendingEnd(endDate);
        setFilterVisible(true);
    };

    const applyFilters = () => {
        setSelectedDifficulty(pendingDifficulty);
        setSelectedFitness(pendingFitness);
        setSelectedDuration(pendingDuration);
        setSelectedDistance(pendingDistance);
        setStartDate(pendingStart);
        setEndDate(pendingEnd);
        setFilterVisible(false);
    };

    const clearFilters = () => {
        setPendingDifficulty([]);
        setPendingFitness('Medium');
        setPendingDuration([]);
        setPendingDistance('Any');
        setPendingStart('');
        setPendingEnd('');

        setSelectedDifficulty([]);
        setSelectedFitness('Medium');
        setSelectedDuration([]);
        setSelectedDistance('Any');
        setStartDate('');
        setEndDate('');
    };
    const handleDayPress = (day) => {
        if (!pendingStart || (pendingStart && pendingEnd)) {
            setPendingStart(day.dateString);
            setPendingEnd('');
        } else {
            if (day.dateString < pendingStart) {
                setPendingStart(day.dateString);
                setPendingEnd('');
            } else {
                setPendingEnd(day.dateString);
            }
        }
    };

    const toggleList = (value, list, setList) => {
        if (list.includes(value)) setList(list.filter(v => v !== value));
        else setList([...list, value]);
    };

    const activeFilterCount =
        selectedDifficulty.length +
        selectedDuration.length +
        (selectedDistance !== 'Any' ? 1 : 0) +
        (startDate ? 1 : 0) +
        (selectedFitness !== 'Medium' ? 1 : 0);

    const openTrail = (trail) => {
        navigation?.navigate('TrailDetail', {
            trail,
            date:    startDate || null,
            fitness: selectedFitness,
        });
    };

    const ChipGroup = ({ label, options, selected, onToggle, single = false, isObjects = false }) => (
        <View style={styles.chipSection}>
            <Text style={styles.chipSectionLabel}>{label}</Text>
            <View style={styles.chipRow}>
                {options.map((opt) => {
                    const key    = isObjects ? opt.label : opt;
                    const active = single
                        ? selected === key
                        : selected.includes(key);
                    return (
                        <TouchableOpacity
                            key={key}
                            style={[styles.chip, active && styles.chipActive]}
                            onPress={() => single
                                ? onToggle(key)
                                : toggleList(key, selected, onToggle)
                            }
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.chipText, active && styles.chipTextActive]}>{key}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );

    return (
        <LinearGradient colors={['#2d5a3d', '#4a7c59', '#7a9e7e']} style={styles.gradient}>
            <SafeAreaView style={styles.safe}>

                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerTitle}>Where are we hiking?</Text>
                    </View>
                    <View style={styles.avatarCircle}>
                        <Text style={styles.avatarText}>HB</Text>
                    </View>
                </View>

                <View style={styles.searchRow}>
                    <View style={styles.searchBox}>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search for a trail..."
                            placeholderTextColor="rgba(255,255,255,0.5)"
                            value={search}
                            onChangeText={setSearch}
                        />
                    </View>
                    <TouchableOpacity style={styles.filterBtn} onPress={openFilters} activeOpacity={0.8}>
                        <View style={styles.hamburger}>
                            <View style={styles.hamburgerLine} />
                            <View style={styles.hamburgerLine} />
                            <View style={styles.hamburgerLine} />
                        </View>
                        {activeFilterCount > 0 && (
                            <View style={styles.filterBadge}>
                                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Filtrele active (Stau mereu sus) */}
                <View style={{ height: activeFilterCount > 0 ? 50 : 0 }}>
                    {activeFilterCount > 0 && (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.activeFiltersScroll}
                            contentContainerStyle={styles.activeFiltersRow}
                        >
                            {selectedDifficulty.map(d => (
                                <TouchableOpacity key={d} style={styles.activeChip} onPress={() => setSelectedDifficulty(selectedDifficulty.filter(x => x !== d))}>
                                    <Text style={styles.activeChipText}>{d} ✕</Text>
                                </TouchableOpacity>
                            ))}
                            {selectedDuration.map(d => (
                                <TouchableOpacity key={d} style={styles.activeChip} onPress={() => setSelectedDuration(selectedDuration.filter(x => x !== d))}>
                                    <Text style={styles.activeChipText}>{d} ✕</Text>
                                </TouchableOpacity>
                            ))}
                            {selectedDistance !== 'Any' && (
                                <TouchableOpacity style={styles.activeChip} onPress={() => setSelectedDistance('Any')}>
                                    <Text style={styles.activeChipText}>{selectedDistance} ✕</Text>
                                </TouchableOpacity>
                            )}
                            {startDate && (
                                <TouchableOpacity style={styles.activeChip} onPress={() => { setStartDate(''); setEndDate(''); }}>
                                    <Text style={styles.activeChipText}>📅 {formatDate(startDate)} ✕</Text>
                                </TouchableOpacity>
                            )}
                            {selectedFitness !== 'Medium' && (
                                <TouchableOpacity style={styles.activeChip} onPress={() => setSelectedFitness('Medium')}>
                                    <Text style={styles.activeChipText}>🏃 {selectedFitness} ✕</Text>
                                </TouchableOpacity>
                            )}
                        </ScrollView>
                    )}
                </View>

                {/* Zona de conținut (Lista sau Mesajul de eroare) */}
                <View style={{ flex: 1 }}>
                    {loading ? (
                        <View style={styles.centerBox}>
                            <ActivityIndicator size="large" color="#f8c8c8" />
                            <Text style={styles.centerText}>Loading trails...</Text>
                        </View>
                    ) : error ? (
                        <View style={styles.centerBox}>
                            <Text style={styles.errorText}>{error}</Text>
                            <TouchableOpacity style={styles.retryBtn} onPress={() => fetchTrails()}>
                                <Text style={styles.retryText}>Retry</Text>
                            </TouchableOpacity>
                        </View>
                    ) : trails.length === 0 ? (
                        <View style={styles.centerBox}>
                            <Text style={styles.centerText}>No trails match your filters.</Text>
                            <TouchableOpacity style={styles.retryBtn} onPress={clearFilters}>
                                <Text style={styles.retryText}>Clear filters</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <FlatList
                            data={trails}
                            keyExtractor={(item) => String(item.osm_id || item.id)}
                            contentContainerStyle={styles.list}
                            showsVerticalScrollIndicator={false}
                            renderItem={({ item }) => {
                                const diffColor = DIFFICULTY_COLORS[item.difficulty] || '#fff';
                                return (
                                    <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={() => openTrail(item)}>
                                        <LinearGradient colors={['#1a3a2a', '#2d5a3d']} style={styles.cardImageArea}>
                                            <Text style={styles.cardTrailName} numberOfLines={1}>{item.name}</Text>
                                            {item.dangers > 0 && (
                                                <View style={styles.dangerBadge}>
                                                    <Text style={styles.dangerText}>⚠ {item.dangers}</Text>
                                                </View>
                                            )}
                                        </LinearGradient>
                                        <View style={styles.cardBody}>
                                            <View style={styles.cardStatsRow}>
                                                <View style={styles.cardStats}>
                                                    <Text style={styles.cardStat}>{formatDuration(item.duration)}</Text>
                                                    <Text style={styles.cardStatDot}>·</Text>
                                                    <Text style={styles.cardStat}>
                                                        {(() => {
                                                            const d = parseFloat(item.distance_km);
                                                            if (isNaN(d)) return "0";
                                                            return d > 1000 ? (d / 1000).toFixed(1) : d.toFixed(1);
                                                        })()} km
                                                    </Text>
                                                    {item.ascent && (
                                                        <>
                                                            <Text style={styles.cardStatDot}>·</Text>
                                                            <Text style={styles.cardStat}>+{item.ascent}m</Text>
                                                        </>
                                                    )}
                                                </View>
                                                <View style={[styles.difficultyBadge, { backgroundColor: diffColor + '33', borderColor: diffColor }]}>
                                                    <Text style={[styles.difficultyText, { color: diffColor }]}>{item.difficulty}</Text>
                                                </View>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                );
                            }}
                        />
                    )}
                </View>

                {/* Filter Modal */}
                <Modal visible={filterVisible} animationType="slide" transparent>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalSheet}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Filters</Text>
                                <TouchableOpacity onPress={() => setFilterVisible(false)}>
                                    <Text style={styles.modalClose}>✕</Text>
                                </TouchableOpacity>
                            </View>
                            <ScrollView showsVerticalScrollIndicator={false}>

                                {/* Date */}
                                <View style={styles.chipSection}>
                                    <Text style={styles.chipSectionLabel}>Hike date</Text>
                                    <Text style={styles.dateHint}>Used for weather forecasts and gear suggestions.</Text>
                                    {pendingStart ? (
                                        <Text style={styles.dateSelectedText}>
                                            {formatDate(pendingStart)}{pendingEnd ? ` → ${formatDate(pendingEnd)}` : ''}
                                        </Text>
                                    ) : (
                                        <Text style={styles.dateSelectedText}>Tap a day to select</Text>
                                    )}
                                    <Calendar
                                        onDayPress={handleDayPress}
                                        markingType="period"
                                        markedDates={buildMarkedDates(pendingStart, pendingEnd)}
                                        minDate={new Date().toISOString().split('T')[0]}
                                        theme={{
                                            backgroundColor: 'transparent',
                                            calendarBackground: 'rgba(255,255,255,0.05)',
                                            textSectionTitleColor: 'rgba(255,255,255,0.5)',
                                            selectedDayBackgroundColor: '#f8c8c8',
                                            selectedDayTextColor: '#2d5a3d',
                                            todayTextColor: '#f8c8c8',
                                            dayTextColor: 'white',
                                            textDisabledColor: 'rgba(255,255,255,0.2)',
                                            monthTextColor: 'white',
                                            arrowColor: '#f8c8c8',
                                            textDayFontWeight: '500',
                                            textMonthFontWeight: '700',
                                            textDayHeaderFontWeight: '600',
                                        }}
                                        style={styles.calendar}
                                    />
                                </View>

                                <ChipGroup
                                    label="Experience level"
                                    options={DIFFICULTY_OPTIONS}
                                    selected={pendingDifficulty}
                                    onToggle={setPendingDifficulty}
                                />
                                <ChipGroup
                                    label="Physical fitness"
                                    options={FITNESS_OPTIONS}
                                    selected={pendingFitness}
                                    onToggle={setPendingFitness}
                                    single={true}
                                />
                                <ChipGroup
                                    label="Duration"
                                    options={DURATION_OPTIONS}
                                    selected={pendingDuration}
                                    onToggle={setPendingDuration}
                                />
                                <ChipGroup
                                    label="Distance"
                                    options={DISTANCE_OPTIONS.map(d => d.label)}
                                    selected={pendingDistance}
                                    onToggle={setPendingDistance}
                                    single={true}
                                />

                            </ScrollView>
                            <View style={styles.modalFooter}>
                                <TouchableOpacity style={styles.clearBtn} onPress={clearFilters} activeOpacity={0.8}>
                                    <Text style={styles.clearBtnText}>Clear all</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.applyBtn} onPress={applyFilters} activeOpacity={0.9}>
                                    <Text style={styles.applyBtnText}>Apply filters</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    gradient: { flex: 1 },
    safe:     { flex: 1 },
    header: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12,
    },
    greeting:    { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
    headerTitle: { color: 'white', fontSize: 24, fontWeight: '800' },
    avatarCircle: {
        width: 46, height: 46, borderRadius: 23,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    },
    avatarText: { color: 'white', fontWeight: '700', fontSize: 14 },
    searchRow:  { flexDirection: 'row', paddingHorizontal: 24, marginBottom: 8, gap: 10 },
    searchBox: {
        flex: 1, flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12,
        paddingHorizontal: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    },
    searchInput: { flex: 1, color: 'white', fontSize: 15, paddingVertical: 12 },
    filterBtn: {
        width: 48, height: 48, backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 12, alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    },
    hamburger:     { gap: 4, alignItems: 'center', justifyContent: 'center' },
    hamburgerLine: { width: 18, height: 2, backgroundColor: 'white', borderRadius: 2 },
    filterBadge: {
        position: 'absolute', top: 6, right: 6, width: 16, height: 16,
        borderRadius: 8, backgroundColor: '#f8c8c8',
        alignItems: 'center', justifyContent: 'center',
    },
    filterBadgeText:    { fontSize: 10, fontWeight: '700', color: '#2d5a3d' },
    activeFiltersScroll:{ paddingHorizontal: 24, marginBottom: 8 , height: 40 },
    activeFiltersRow:    { flexDirection: 'row', gap: 8, alignItems: 'center', paddingVertical: 4 },
    activeChip: {
        backgroundColor: 'rgba(248,200,200,0.2)', borderRadius: 99,
        paddingHorizontal: 12, paddingVertical: 1,
        borderWidth: 1, borderColor: 'rgba(248,200,200,0.5)',
    },
    activeChipText: { color: '#f8c8c8', fontSize: 12, fontWeight: '600' },
    centerBox:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12},
    centerText: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
    errorText:  { color: '#fca5a5', fontSize: 14, textAlign: 'center', paddingHorizontal: 24 },
    retryBtn:   { backgroundColor: '#f8c8c8', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 99 },
    retryText:  { color: '#2d5a3d', fontWeight: '700' },
    list: { paddingHorizontal: 24, paddingBottom: 32, gap: 16 },
    card: {
        backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 16,
        overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    },
    cardImageArea:   { height: 100, justifyContent: 'flex-end', padding: 12, position: 'relative' },
    cardTrailName:   { color: 'white', fontSize: 20, fontWeight: '800' },
    difficultyBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, borderWidth: 1, marginLeft: 8 },    dangerBadge:     { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(239,68,68,0.2)', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#f87171' },
    dangerText:      { fontSize: 11, color: '#fca5a5', fontWeight: '600' },
    cardBody:        { padding: 14},
    cardStats:    { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, flex: 1 },    cardStat:        { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '500' },
    cardStatsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    cardStatDot:     { color: 'rgba(255,255,255,0.3)', fontSize: 13 },
    modalOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalSheet:      { backgroundColor: '#1e3a2a', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 20, paddingHorizontal: 24, paddingBottom: 36, maxHeight: '90%' },
    modalHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle:      { color: 'white', fontSize: 20, fontWeight: '800' },
    modalClose:      { color: 'rgba(255,255,255,0.6)', fontSize: 20, padding: 4 },
    chipSection:     { marginBottom: 20 },
    chipSectionLabel:{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '700', letterSpacing: 0.5, marginBottom: 6 },
    dateHint:        { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 8, fontStyle: 'italic' },
    dateSelectedText:{ color: '#f8c8c8', fontSize: 14, fontWeight: '600', marginBottom: 10 },
    calendar:        { borderRadius: 12, overflow: 'hidden' },
    chipRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip:            { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 99, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.08)' },
    chipActive:      { backgroundColor: 'rgba(248,200,200,0.25)', borderColor: '#f8c8c8' },
    chipText:        { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '500' },
    chipTextActive:  { color: 'white', fontWeight: '700' },
    modalFooter:     { flexDirection: 'row', gap: 12, marginTop: 24 },
    clearBtn:        { flex: 1, paddingVertical: 16, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.08)' },
    clearBtnText:    { color: 'rgba(255,255,255,0.7)', fontWeight: '600', fontSize: 15 },
    applyBtn:        { flex: 2, paddingVertical: 16, borderRadius: 14, alignItems: 'center', backgroundColor: '#f8c8c8' },
    applyBtnText:    { color: '#2d5a3d', fontWeight: '700', fontSize: 15 },
});