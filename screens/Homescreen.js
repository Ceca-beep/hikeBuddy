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

// ─── Mock Data ────────────────────────────────────────────────────────────────
const TRAILS = [
    {
        id: '1',
        name: 'Vârful Omu',
        location: 'Bucegi, Romania',
        difficulty: 'Advanced',
        duration: '6-8h',
        distance: '18 km',
        elevation: '1200m',
        emoji: '🏔️',
        rating: 4.8,
        dangers: 2,
    },
    {
        id: '2',
        name: 'Babele și Sfinxul',
        location: 'Bucegi, Romania',
        difficulty: 'Beginner',
        duration: '2-3h',
        distance: '8 km',
        elevation: '300m',
        emoji: '🌄',
        rating: 4.5,
        dangers: 0,
    },
    {
        id: '3',
        name: 'Lacul Bâlea',
        location: 'Făgăraș, Romania',
        difficulty: 'Intermediate',
        duration: '4-5h',
        distance: '12 km',
        elevation: '800m',
        emoji: '🏞️',
        rating: 4.9,
        dangers: 1,
    },
    {
        id: '4',
        name: 'Creasta Cocoșului',
        location: 'Gutâi, Romania',
        difficulty: 'Intermediate',
        duration: '3-4h',
        distance: '10 km',
        elevation: '600m',
        emoji: '⛰️',
        rating: 4.6,
        dangers: 0,
    },
    {
        id: '5',
        name: 'Vârful Moldoveanu',
        location: 'Făgăraș, Romania',
        difficulty: 'Expert',
        duration: '8-10h',
        distance: '24 km',
        elevation: '1800m',
        emoji: '🗻',
        rating: 5.0,
        dangers: 3,
    },
];

const DIFFICULTY_OPTIONS = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
const FITNESS_OPTIONS = ['Low', 'Medium', 'High', 'Athlete'];
const DURATION_OPTIONS = ['Under 2h', '2–4h', '4–6h', 'Over 6h'];

const DIFFICULTY_COLORS = {
    Beginner: '#4ade80',
    Intermediate: '#facc15',
    Advanced: '#fb923c',
    Expert: '#f87171',
};

export default function HomeScreen({ navigation }) {
    const [search, setSearch] = useState('');
    const [filterVisible, setFilterVisible] = useState(false);

    // Filters state
    const [selectedDifficulty, setSelectedDifficulty] = useState([]);
    const [selectedFitness, setSelectedFitness] = useState([]);
    const [selectedDuration, setSelectedDuration] = useState([]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Pending filters (inside modal before applying)
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

    const toggle = (value, list, setList) => {
        if (list.includes(value)) setList(list.filter((v) => v !== value));
        else setList([...list, value]);
    };

    const activeFilterCount =
        selectedDifficulty.length + selectedFitness.length + selectedDuration.length +
        (startDate ? 1 : 0);

    const filteredTrails = TRAILS.filter((t) => {
        if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
        if (selectedDifficulty.length && !selectedDifficulty.includes(t.difficulty)) return false;
        if (selectedDuration.length) {
            const match = selectedDuration.some((d) => {
                if (d === 'Under 2h') return t.duration.startsWith('2') === false && parseFloat(t.duration) < 2;
                if (d === '2–4h') return t.duration.includes('2-3') || t.duration.includes('3-4');
                if (d === '4–6h') return t.duration.includes('4-5') || t.duration.includes('4-6');
                if (d === 'Over 6h') return t.duration.includes('6-8') || t.duration.includes('8-10');
                return false;
            });
            if (!match) return false;
        }
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
                        <Text style={styles.greeting}>Bună! 👋</Text>
                        <Text style={styles.headerTitle}>Unde mergem azi?</Text>
                    </View>
                    <View style={styles.avatarCircle}>
                        <Text style={styles.avatarEmoji}>🧗</Text>
                    </View>
                </View>

                {/* Search + Filter */}
                <View style={styles.searchRow}>
                    <View style={styles.searchBox}>
                        <Text style={styles.searchIcon}>🔍</Text>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Caută un traseu..."
                            placeholderTextColor="rgba(255,255,255,0.5)"
                            value={search}
                            onChangeText={setSearch}
                        />
                    </View>
                    <TouchableOpacity style={styles.filterBtn} onPress={openFilters} activeOpacity={0.8}>
                        <Text style={styles.filterIcon}>☰</Text>
                        {activeFilterCount > 0 && (
                            <View style={styles.filterBadge}>
                                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

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
                            {/* Card Header with emoji bg */}
                            <LinearGradient
                                colors={['#1a3a2a', '#2d5a3d']}
                                style={styles.cardImageArea}
                            >
                                <Text style={styles.cardEmoji}>{item.emoji}</Text>
                                <View style={[styles.difficultyBadge, { backgroundColor: DIFFICULTY_COLORS[item.difficulty] + '33', borderColor: DIFFICULTY_COLORS[item.difficulty] }]}>
                                    <Text style={[styles.difficultyText, { color: DIFFICULTY_COLORS[item.difficulty] }]}>{item.difficulty}</Text>
                                </View>
                                {item.dangers > 0 && (
                                    <View style={styles.dangerBadge}>
                                        <Text style={styles.dangerText}>⚠️ {item.dangers}</Text>
                                    </View>
                                )}
                            </LinearGradient>

                            {/* Card Body */}
                            <View style={styles.cardBody}>
                                <Text style={styles.cardName}>{item.name}</Text>
                                <Text style={styles.cardLocation}>📍 {item.location}</Text>
                                <View style={styles.cardStats}>
                                    <Text style={styles.cardStat}>⏱ {item.duration}</Text>
                                    <Text style={styles.cardStat}>📏 {item.distance}</Text>
                                    <Text style={styles.cardStat}>↑ {item.elevation}</Text>
                                    <Text style={styles.cardStat}>⭐ {item.rating}</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    )}
                />

                {/* Filter Modal */}
                <Modal visible={filterVisible} animationType="slide" transparent>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalSheet}>

                            {/* Modal Header */}
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Filtre</Text>
                                <TouchableOpacity onPress={() => setFilterVisible(false)}>
                                    <Text style={styles.modalClose}>✕</Text>
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false}>

                                {/* Date Range */}
                                <View style={styles.chipSection}>
                                    <Text style={styles.chipSectionLabel}>📅 Perioadă</Text>
                                    <View style={styles.dateRow}>
                                        <View style={styles.dateBox}>
                                            <Text style={styles.dateLabel}>De la</Text>
                                            <TextInput
                                                style={styles.dateInput}
                                                placeholder="zz/ll/aaaa"
                                                placeholderTextColor="rgba(255,255,255,0.4)"
                                                value={pendingStart}
                                                onChangeText={setPendingStart}
                                            />
                                        </View>
                                        <Text style={styles.dateSeparator}>→</Text>
                                        <View style={styles.dateBox}>
                                            <Text style={styles.dateLabel}>Până la</Text>
                                            <TextInput
                                                style={styles.dateInput}
                                                placeholder="zz/ll/aaaa"
                                                placeholderTextColor="rgba(255,255,255,0.4)"
                                                value={pendingEnd}
                                                onChangeText={setPendingEnd}
                                            />
                                        </View>
                                    </View>
                                </View>

                                <ChipGroup
                                    label="🥾 Experiență"
                                    options={DIFFICULTY_OPTIONS}
                                    selected={pendingDifficulty}
                                    onToggle={(v) => toggle(v, pendingDifficulty, setPendingDifficulty)}
                                />
                                <ChipGroup
                                    label="💪 Condiție fizică"
                                    options={FITNESS_OPTIONS}
                                    selected={pendingFitness}
                                    onToggle={(v) => toggle(v, pendingFitness, setPendingFitness)}
                                />
                                <ChipGroup
                                    label="⏱ Durată"
                                    options={DURATION_OPTIONS}
                                    selected={pendingDuration}
                                    onToggle={(v) => toggle(v, pendingDuration, setPendingDuration)}
                                />

                            </ScrollView>

                            {/* Modal Footer */}
                            <View style={styles.modalFooter}>
                                <TouchableOpacity style={styles.clearBtn} onPress={clearFilters} activeOpacity={0.8}>
                                    <Text style={styles.clearBtnText}>Golește</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.applyBtn} onPress={applyFilters} activeOpacity={0.9}>
                                    <Text style={styles.applyBtnText}>Aplică filtrele</Text>
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
    avatarEmoji: { fontSize: 22 },

    // Search
    searchRow: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        marginBottom: 16,
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
    searchIcon: { fontSize: 16, marginRight: 8 },
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
    filterIcon: { fontSize: 20, color: 'white' },
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

    // List
    list: { paddingHorizontal: 24, paddingBottom: 32, gap: 16 },

    // Card
    card: {
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    cardImageArea: {
        height: 140,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    cardEmoji: { fontSize: 64 },
    difficultyBadge: {
        position: 'absolute',
        top: 10,
        left: 10,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 99,
        borderWidth: 1,
    },
    difficultyText: { fontSize: 11, fontWeight: '700' },
    dangerBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'rgba(239,68,68,0.2)',
        borderRadius: 99,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: '#f87171',
    },
    dangerText: { fontSize: 11, color: '#fca5a5', fontWeight: '600' },
    cardBody: { padding: 14, gap: 6 },
    cardName: { color: 'white', fontSize: 18, fontWeight: '700' },
    cardLocation: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
    cardStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
    cardStat: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '500' },

    // Modal
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
        maxHeight: '85%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: { color: 'white', fontSize: 20, fontWeight: '800' },
    modalClose: { color: 'rgba(255,255,255,0.6)', fontSize: 20, padding: 4 },

    // Chips
    chipSection: { marginBottom: 20 },
    chipSectionLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.5,
        marginBottom: 10,
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

    // Date
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    dateBox: { flex: 1 },
    dateLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 4 },
    dateInput: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: 'white',
        fontSize: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    dateSeparator: { color: 'rgba(255,255,255,0.4)', fontSize: 18, marginTop: 16 },

    // Footer
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