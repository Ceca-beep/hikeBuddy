import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { API_BASE, API_HEADERS } from './Api';

const DIFFICULTY_COLORS = {
    Beginner:     '#4ade80',
    Intermediate: '#facc15',
    Advanced:     '#fb923c',
    Expert:       '#f87171',
};

function getLevelFromKm(km) {
    if (km >= 500) return 'Expert';
    if (km >= 200) return 'Advanced';
    if (km >= 50)  return 'Intermediate';
    return 'Beginner';
}

const formatDuration = (minutes) => {
    if (!minutes) return '--';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}min` : `${m}min`;
};

export default function ProfileScreen({ navigation }) {
    const [user,        setUser]        = useState(null);
    const [hikeHistory, setHikeHistory] = useState([]);
    const [loading,     setLoading]     = useState(true);

    useFocusEffect(
        useCallback(() => {
            let active = true;
            (async () => {
                setLoading(true);
                try {
                    const stored = await AsyncStorage.getItem('user');
                    if (!stored) { if (active) setLoading(false); return; }
                    const userInfo = JSON.parse(stored);

                    try {
                        const resp = await fetch(`${API_BASE}/users/${userInfo.id}`, { headers: API_HEADERS });
                        if (resp.ok && active) {
                            setUser(await resp.json());
                        } else if (active) {
                            setUser(userInfo);
                        }
                    } catch {
                        if (active) setUser(userInfo);
                    }

                    const history = await AsyncStorage.getItem('hike_history');
                    if (active) setHikeHistory(history ? JSON.parse(history) : []);
                } catch (e) {
                    console.warn('Profile load error:', e);
                } finally {
                    if (active) setLoading(false);
                }
            })();
            return () => { active = false; };
        }, [])
    );

    if (loading) {
        return (
            <LinearGradient colors={['#2d5a3d', '#4a7c59', '#7a9e7e']} style={styles.gradient}>
                <SafeAreaView style={styles.safe}>
                    <View style={styles.centerBox}>
                        <ActivityIndicator size="large" color="#f8c8c8" />
                    </View>
                </SafeAreaView>
            </LinearGradient>
        );
    }

    if (!user) {
        return (
            <LinearGradient colors={['#2d5a3d', '#4a7c59', '#7a9e7e']} style={styles.gradient}>
                <SafeAreaView style={styles.safe}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                        <Text style={styles.backText}>← Back</Text>
                    </TouchableOpacity>
                    <View style={styles.centerBox}>
                        <Text style={styles.noUserText}>Please log in to view your profile.</Text>
                        <TouchableOpacity style={styles.loginBtn} onPress={() => navigation.navigate('Login')}>
                            <Text style={styles.loginBtnText}>Log In</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </LinearGradient>
        );
    }

    const totalKm    = hikeHistory.reduce((sum, h) => sum + (parseFloat(h.distance_km) || 0), 0);
    const level      = getLevelFromKm(totalKm);
    const levelColor = DIFFICULTY_COLORS[level];
    const initials   = (user.name || 'HB').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    return (
        <LinearGradient colors={['#2d5a3d', '#4a7c59', '#7a9e7e']} style={styles.gradient}>
            <SafeAreaView style={styles.safe}>

                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>

                <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

                    {/* Avatar + name + bio */}
                    <View style={styles.avatarSection}>
                        <View style={styles.avatarRing}>
                            {user.avatar_url ? (
                                <Image source={{ uri: user.avatar_url }} style={styles.avatarImg} />
                            ) : (
                                <LinearGradient colors={['#4a7c59', '#2d5a3d']} style={styles.avatarPlaceholder}>
                                    <Text style={styles.avatarInitials}>{initials}</Text>
                                </LinearGradient>
                            )}
                        </View>
                        <Text style={styles.userName}>{user.name}</Text>
                        <Text style={user.bio ? styles.userBio : styles.userBioPlaceholder}>
                            {user.bio || 'No bio yet — add one in Edit Profile'}
                        </Text>
                    </View>

                    {/* Stats dashboard */}
                    <View style={styles.statsRow}>
                        <View style={styles.statCard}>
                            <Text style={styles.statValue}>{hikeHistory.length}</Text>
                            <Text style={styles.statLabel}>Total Hikes</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statValue}>{totalKm.toFixed(1)}</Text>
                            <Text style={styles.statLabel}>km Hiked</Text>
                        </View>
                        <View style={[styles.statCard, { borderColor: levelColor + '66' }]}>
                            <Text style={[styles.statValue, { color: levelColor, fontSize: 15 }]}>{level}</Text>
                            <Text style={styles.statLabel}>Level</Text>
                        </View>
                    </View>

                    {/* Hike history */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Hike History</Text>
                        {hikeHistory.length === 0 ? (
                            <View style={styles.emptyCard}>
                                <Text style={styles.emptyText}>No hikes started yet. Hit the trails!</Text>
                            </View>
                        ) : (
                            [...hikeHistory].reverse().map((hike, i) => {
                                const diffColor = DIFFICULTY_COLORS[hike.difficulty] || '#fff';
                                return (
                                    <View key={i} style={styles.hikeCard}>
                                        <View style={styles.hikeLeft}>
                                            <Text style={styles.hikeName} numberOfLines={1}>{hike.name}</Text>
                                            <Text style={styles.hikeStats}>
                                                {formatDuration(hike.duration)}{'  ·  '}{parseFloat(hike.distance_km || 0).toFixed(1)} km
                                                {hike.ascent ? `  ·  +${hike.ascent}m` : ''}
                                            </Text>
                                            {hike.started_at && (
                                                <Text style={styles.hikeDate}>
                                                    {new Date(hike.started_at).toLocaleDateString('ro-RO')}
                                                </Text>
                                            )}
                                        </View>
                                        <View style={[styles.diffBadge, { backgroundColor: diffColor + '22', borderColor: diffColor }]}>
                                            <Text style={[styles.diffText, { color: diffColor }]}>{hike.difficulty}</Text>
                                        </View>
                                    </View>
                                );
                            })
                        )}
                    </View>

                    <View style={{ height: 100 }} />
                </ScrollView>

                {/* Edit Profile button — fixed at bottom */}
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={styles.editBtn}
                        activeOpacity={0.9}
                        onPress={() => navigation.navigate('EditProfile', { user })}
                    >
                        <Text style={styles.editBtnText}>Edit Profile</Text>
                    </TouchableOpacity>
                </View>

            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    gradient:  { flex: 1 },
    safe:      { flex: 1 },
    centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
    backBtn:   { paddingHorizontal: 24, paddingVertical: 12 },
    backText:  { color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '600' },
    container: { paddingHorizontal: 24, paddingBottom: 32, gap: 20 },

    avatarSection: { alignItems: 'center', paddingTop: 8, gap: 12 },
    avatarRing: {
        width: 110, height: 110, borderRadius: 55,
        borderWidth: 3, borderColor: '#f8c8c8',
        overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
    },
    avatarImg:         { width: '100%', height: '100%' },
    avatarPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    avatarInitials:    { color: 'white', fontSize: 36, fontWeight: '800' },
    userName:          { color: 'white', fontSize: 26, fontWeight: '800', textAlign: 'center' },
    userBio:           { color: 'rgba(255,255,255,0.75)', fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: 16 },
    userBioPlaceholder:{ color: 'rgba(255,255,255,0.35)', fontSize: 13, textAlign: 'center', fontStyle: 'italic' },

    statsRow: { flexDirection: 'row', gap: 10 },
    statCard: {
        flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 14,
        padding: 14, alignItems: 'center', gap: 4,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    },
    statValue: { color: 'white', fontSize: 20, fontWeight: '800' },
    statLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

    section:      { gap: 10 },
    sectionTitle: { color: 'white', fontSize: 18, fontWeight: '700' },

    emptyCard: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 },
    emptyText: { color: 'rgba(255,255,255,0.5)', fontSize: 14, textAlign: 'center' },

    hikeCard: {
        backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: 14,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', gap: 10,
    },
    hikeLeft:  { flex: 1, gap: 4 },
    hikeName:  { color: 'white', fontSize: 15, fontWeight: '700' },
    hikeStats: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
    hikeDate:  { color: 'rgba(255,255,255,0.35)', fontSize: 12 },
    diffBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, borderWidth: 1 },
    diffText:  { fontSize: 12, fontWeight: '700' },

    noUserText: { color: 'rgba(255,255,255,0.7)', fontSize: 15, textAlign: 'center' },
    loginBtn:   { backgroundColor: '#f8c8c8', borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14 },
    loginBtnText:{ color: '#2d5a3d', fontWeight: '700', fontSize: 16 },

    footer:  { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, backgroundColor: 'rgba(45,90,61,0.95)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
    editBtn: { backgroundColor: '#f8c8c8', borderRadius: 14, paddingVertical: 18, alignItems: 'center' },
    editBtnText: { color: '#2d5a3d', fontSize: 17, fontWeight: '700' },
});
