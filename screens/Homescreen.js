import React, { useState } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar } from 'react-native-calendars';

const TRAILS = [
    {
        id: '1',
        name: 'Vârful Omu',
        location: 'Bucegi, Romania',
        difficulty: 'Advanced',
        duration: '6-8h',
        distance: '18 km',
        elevation: '1200m',
        rating: 4.8,
        dangers: 2,
    },
    {
        id: '2',
        name: 'Babele si Sfinxul',
        location: 'Bucegi, Romania',
        difficulty: 'Beginner',
        duration: '2-3h',
        distance: '8 km',
        elevation: '300m',
        rating: 4.5,
        dangers: 0,
    },
    {
        id: '3',
        name: 'Lacul Balea',
        location: 'Fagaras, Romania',
        difficulty: 'Intermediate',
        duration: '4-5h',
        distance: '12 km',
        elevation: '800m',
        rating: 4.9,
        dangers: 1,
    },
    {
        id: '4',
        name: 'Creasta Cocosului',
        location: 'Gutai, Romania',
        difficulty: 'Intermediate',
        duration: '3-4h',
        distance: '10 km',
        elevation: '600m',
        rating: 4.6,
        dangers: 0,
    },
    {
        id: '5',
        name: 'Varful Moldoveanu',
        location: 'Fagaras, Romania',
        difficulty: 'Expert',
        duration: '8-10h',
        distance: '24 km',
        elevation: '1800m',
        rating: 5.0,
        dangers: 3,
    },
];

const DIFFICULTY_OPTIONS = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
const FITNESS_OPTIONS = ['Low', 'Medium', 'High', 'Athlete'];
const DURATION_OPTIONS = ['Under 2h', '2-4h', '4-6h', 'Over 6h'];

const DIFFICULTY_COLORS = {
    Beginner: '#4ade80',
    Intermediate: '#facc15',
    Advanced: '#fb923c',
    Expert: '#f87171',
};

const buildMarkedDates = (start, end) => {
    if (!start) return {};
    const marked = {};
    const startColor = '#f8c8c8';
    const rangeColor = 'rgba(248,200,200,0.25)';

    if (!end || start === end) {
        marked[start] = {
            selected: true,
            startingDay: true,
            endingDay: true,
            color: startColor,
            textColor: '#2d5a3d',
        };
        return marked;
    }

    let current = new Date(start);
    const endDate = new Date(end);

    while (current <= endDate) {
        const dateStr = current.toISOString().split('T')[0];
        if (dateStr === start) {
            marked[dateStr] = { startingDay: true, color: startColor, textColor: '#2d5a3d' };
        } else if (dateStr === end) {
            marked[dateStr] = { endingDay: true, color: startColor, textColor: '#2d5a3d' };
        } else {
            marked[dateStr] = { color: rangeColor, textColor: 'white' };
        }
        current.setDate(current.getDate() + 1);
    }
    return marked;
};

const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
};

export default function HomeScreen({ navigation }) {
    const [search, setSearch] = useState('');
    const [filterVisible, setFilterVisible] = useState(false);

    const [selectedDifficulty, setSelectedDifficulty] = useState([]);
    const [selectedFitness, setSelectedFitness] = useState([]);
    const [selectedDuration, setSelectedDuration] = useState([]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const [pendingDifficulty, setPendingDifficulty] = useState([]);
    const [pendingFitness, setPendingFitness] = useState([]);
    const [pendingDuration, setPendingDuration] = useState([]);
    const [pendingStart, setPendingStart] = useState('');
    const [pendingEnd, setPendingEnd] = useState('');

    const openFilters = () => {
        setPendingDifficulty([...selectedDifficulty]);
        setPendingFitness([...selectedFitness]);
        setPendingDuration([...selectedDuration]);
        setPendingStart(startDate);
        setPendingEnd(endDate);
        setFilterVisible(true);
    };

    const applyFilters = () => {
        setSelectedDifficulty(pendingDifficulty);
        setSelectedFitness(pendingFitness);
        setSelectedDuration(pendingDuration);
        setStartDate(pendingStart);
        setEndDate(pendingEnd);
        setFilterVisible(false);
    };

    const clearFilters = () => {
        setPendingDifficulty([]);
        setPendingFitness([]);
        setPendingDuration([]);
        setPendingStart('');
        setPendingEnd('');
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

    const toggle = (value, list, setList) => {
        if (list.includes(value)) setList(list.filter((v) => v !== value));
        else setList([...list, value]);
    };

    const activeFilterCount =
        selectedDifficulty.length +
        selectedFitness.length +
        selectedDuration.length +
        (startDate ? 1 : 0);

    const filteredTrails = TRAILS.filter((t) => {
        if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
        if (selectedDifficulty.length && !selectedDifficulty.includes(t.difficulty)) return false;
        return true;
    });

    const ChipGroup = ({ label, options, selected, onToggle }) => (
        <View style={styles.chipSection}>
            <Text style={styles.chipSectionLabel}>{label}</Text>
            <View style={styles.chipRow}>
                {options.map((opt) => {
                    const active = selected.includes(opt);
                    return (
                        <TouchableOpacity
                            key={opt}
                            style={[styles.chip, active && styles.chipActive]}
                            onPress={() => onToggle(opt)}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt}</Text>
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
                        <Text style={styles.greeting}>Hello!</Text>
                        <Text style={styles.headerTitle}>Where are we hiking?</Text>
                    </View>
                    <View style={styles.avatarCircle}>
                        <Text style={styles.avatarText}>HB</Text>
                    </View>
                </View>

                {/* Search + Filter */}
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

                {/* Active date range display */}
                {startDate ? (
                    <View style={styles.activeDateRow}>
                        <Text style={styles.activeDateText}>
                            {formatDate(startDate)}{endDate ? ` -> ${formatDate(endDate)}` : ''}
                        </Text>
                    </View>
                ) : null}

                {/* Trail Cards */}
                <FlatList
                    data={filteredTrails}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.card}
                            activeOpacity={0.9}
                            onPress={() => navigation?.navigate('TrailDetail', { trail: item })}
                        >
                            <LinearGradient colors={['#1a3a2a', '#2d5a3d']} style={styles.cardImageArea}>
                                <Text style={styles.cardTrailName}>{item.name}</Text>
                                <View style={[
                                    styles.difficultyBadge,
                                    { backgroundColor: DIFFICULTY_COLORS[item.difficulty] + '33', borderColor: DIFFICULTY_COLORS[item.difficulty] }
                                ]}>
                                    <Text style={[styles.difficultyText, { color: DIFFICULTY_COLORS[item.difficulty] }]}>
                                        {item.difficulty}
                                    </Text>
                                </View>
                                {item.dangers > 0 && (
                                    <View style={styles.dangerBadge}>
                                        <Text style={styles.dangerText}>! {item.dangers} danger{item.dangers > 1 ? 's' : ''}</Text>
                                    </View>
                                )}
                            </LinearGradient>
                            <View style={styles.cardBody}>
                                <Text style={styles.cardLocation}>{item.location}</Text>
                                <View style={styles.cardStats}>
                                    <Text style={styles.cardStat}>{item.duration}</Text>
                                    <Text style={styles.cardStatDot}>·</Text>
                                    <Text style={styles.cardStat}>{item.distance}</Text>
                                    <Text style={styles.cardStatDot}>·</Text>
                                    <Text style={styles.cardStat}>{item.elevation} gain</Text>
                                    <Text style={styles.cardStatDot}>·</Text>
                                    <Text style={styles.cardStat}>{item.rating} / 5</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    )}
                />

                {/* Filter Modal */}
                <Modal visible={filterVisible} animationType="slide" transparent>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalSheet}>

                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Filters</Text>
                                <TouchableOpacity onPress={() => setFilterVisible(false)}>
                                    <Text style={styles.modalClose}>x</Text>
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false}>

                                <View style={styles.chipSection}>
                                    <Text style={styles.chipSectionLabel}>Select a date range</Text>
                                    {pendingStart ? (
                                        <Text style={styles.dateSelectedText}>
                                            {formatDate(pendingStart)}{pendingEnd ? ` -> ${formatDate(pendingEnd)}` : ' -> select end date'}
                                        </Text>
                                    ) : (
                                        <Text style={styles.dateSelectedText}>Select start date</Text>
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
                                            dotColor: '#f8c8c8',
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
                                    label="Experience"
                                    options={DIFFICULTY_OPTIONS}
                                    selected={pendingDifficulty}
                                    onToggle={(v) => toggle(v, pendingDifficulty, setPendingDifficulty)}
                                />
                                <ChipGroup
                                    label="Physical fitness"
                                    options={FITNESS_OPTIONS}
                                    selected={pendingFitness}
                                    onToggle={(v) => toggle(v, pendingFitness, setPendingFitness)}
                                />
                                <ChipGroup
                                    label="Duration"
                                    options={DURATION_OPTIONS}
                                    selected={pendingDuration}
                                    onToggle={(v) => toggle(v, pendingDuration, setPendingDuration)}
                                />

                            </ScrollView>

                            <View style={styles.modalFooter}>
                                <TouchableOpacity style={styles.clearBtn} onPress={clearFilters} activeOpacity={0.8}>
                                    <Text style={styles.clearBtnText}>Clear</Text>
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
    safe: { flex: 1 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 12,
    },
    greeting: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
    headerTitle: { color: 'white', fontSize: 24, fontWeight: '800' },
    avatarCircle: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    avatarText: { color: 'white', fontWeight: '700', fontSize: 14 },
    searchRow: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        marginBottom: 8,
        gap: 10,
    },
    searchBox: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 12,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    searchIcon: { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginRight: 8 },
    searchInput: { flex: 1, color: 'white', fontSize: 15, paddingVertical: 12 },
    filterBtn: {
        width: 48,
        height: 48,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    hamburger: { gap: 4, alignItems: 'center', justifyContent: 'center' },
    hamburgerLine: {
        width: 18,
        height: 2,
        backgroundColor: 'white',
        borderRadius: 2,
    },
    filterBadge: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#f8c8c8',
        alignItems: 'center',
        justifyContent: 'center',
    },
    filterBadgeText: { fontSize: 10, fontWeight: '700', color: '#2d5a3d' },
    activeDateRow: {
        paddingHorizontal: 24,
        marginBottom: 8,
    },
    activeDateText: {
        color: '#f8c8c8',
        fontSize: 13,
        fontWeight: '600',
    },
    list: { paddingHorizontal: 24, paddingBottom: 32, gap: 16 },
    card: {
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    cardImageArea: {
        height: 100,
        justifyContent: 'flex-end',
        padding: 12,
        position: 'relative',
    },
    cardTrailName: {
        color: 'white',
        fontSize: 20,
        fontWeight: '800',
    },
    difficultyBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 99,
        borderWidth: 1,
    },
    difficultyText: { fontSize: 11, fontWeight: '700' },
    dangerBadge: {
        position: 'absolute',
        top: 10,
        left: 10,
        backgroundColor: 'rgba(239,68,68,0.2)',
        borderRadius: 99,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: '#f87171',
    },
    dangerText: { fontSize: 11, color: '#fca5a5', fontWeight: '600' },
    cardBody: { padding: 14, gap: 4 },
    cardLocation: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
    cardStats: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 2 },
    cardStat: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '500' },
    cardStatDot: { color: 'rgba(255,255,255,0.3)', fontSize: 13 },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalSheet: {
        backgroundColor: '#1e3a2a',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 20,
        paddingHorizontal: 24,
        paddingBottom: 36,
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: { color: 'white', fontSize: 20, fontWeight: '800' },
    modalClose: { color: 'rgba(255,255,255,0.6)', fontSize: 20, padding: 4 },
    chipSection: { marginBottom: 20 },
    chipSectionLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.5,
        marginBottom: 10,
    },
    dateSelectedText: {
        color: '#f8c8c8',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 10,
    },
    calendar: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 99,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    chipActive: {
        backgroundColor: 'rgba(248,200,200,0.25)',
        borderColor: '#f8c8c8',
    },
    chipText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '500' },
    chipTextActive: { color: 'white', fontWeight: '700' },
    modalFooter: { flexDirection: 'row', gap: 12, marginTop: 24 },
    clearBtn: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    clearBtnText: { color: 'rgba(255,255,255,0.7)', fontWeight: '600', fontSize: 15 },
    applyBtn: {
        flex: 2,
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        backgroundColor: '#f8c8c8',
    },
    applyBtnText: { color: '#2d5a3d', fontWeight: '700', fontSize: 15 },
});