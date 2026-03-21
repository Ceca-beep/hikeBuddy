import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Image,
    Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE, API_HEADERS } from './Api';

const SEX_OPTIONS = ['Male', 'Female', 'Other'];

export default function EditProfile({ route, navigation }) {
    const { user } = route.params || {};

    const [name,            setName]            = useState(user?.name       || '');
    const [bio,             setBio]             = useState(user?.bio        || '');
    const [age,             setAge]             = useState(user?.age        ? String(user.age)    : '');
    const [weight,          setWeight]          = useState(user?.weight     ? String(user.weight) : '');
    const [height,          setHeight]          = useState(user?.height     ? String(user.height) : '');
    const [sex,             setSex]             = useState(user?.sex        || '');
    const [avatarUri,       setAvatarUri]       = useState(user?.avatar_url || null);
    const [saving,          setSaving]          = useState(false);
    const [avatarUploading, setAvatarUploading] = useState(false);

    const pickAvatar = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please allow access to your photo library.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });
        if (result.canceled) return;

        const asset = result.assets[0];
        setAvatarUri(asset.uri);

        if (!user?.id) return;
        setAvatarUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', {
                uri:  asset.uri,
                type: asset.mimeType || 'image/jpeg',
                name: asset.fileName || 'avatar.jpg',
            });
            const resp = await fetch(`${API_BASE}/users/${user.id}/avatar`, {
                method: 'POST',
                body:   formData,
            });
            const data = await resp.json();
            if (resp.ok) setAvatarUri(data.avatar_url);
        } catch (e) {
            console.warn('Avatar upload error:', e);
        } finally {
            setAvatarUploading(false);
        }
    };

    const handleSave = async () => {
        if (!user?.id) return;
        setSaving(true);
        try {
            const payload = {};
            if (name)              payload.name       = name;
            if (bio)               payload.bio        = bio;
            if (age)               payload.age        = parseInt(age);
            if (weight)            payload.weight     = parseFloat(weight);
            if (height)            payload.height     = parseFloat(height);
            if (sex)               payload.sex        = sex;
            if (avatarUri && avatarUri !== user.avatar_url) payload.avatar_url = avatarUri;

            const resp = await fetch(`${API_BASE}/users/${user.id}`, {
                method:  'PUT',
                headers: API_HEADERS,
                body:    JSON.stringify(payload),
            });

            if (resp.ok) {
                const stored = await AsyncStorage.getItem('user');
                if (stored) {
                    const info = JSON.parse(stored);
                    await AsyncStorage.setItem('user', JSON.stringify({ ...info, name: name || info.name }));
                }
                Alert.alert('Saved!', 'Your profile has been updated.', [
                    { text: 'OK', onPress: () => navigation.goBack() },
                ]);
            } else {
                Alert.alert('Error', 'Could not save changes. Please try again.');
            }
        } catch (e) {
            Alert.alert('Error', 'Network error. Please check your connection.');
        } finally {
            setSaving(false);
        }
    };

    const initials = (name || 'HB').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    return (
        <LinearGradient colors={['#2d5a3d', '#4a7c59', '#ccd5ae']} style={styles.gradient}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
                <ScrollView
                    contentContainerStyle={styles.container}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >

                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackBtn}>
                            <MaterialIcons name="arrow-back" size={24} color="white" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Edit Profile</Text>
                        <View style={{ width: 48 }} />
                    </View>

                    {/* Avatar picker */}
                    <View style={styles.avatarSection}>
                        <TouchableOpacity onPress={pickAvatar} activeOpacity={0.85} style={styles.avatarTouchable}>
                            <View style={styles.avatarRing}>
                                {avatarUri ? (
                                    <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
                                ) : (
                                    <LinearGradient colors={['#4a7c59', '#2d5a3d']} style={styles.avatarPlaceholder}>
                                        <Text style={styles.avatarInitials}>{initials}</Text>
                                    </LinearGradient>
                                )}
                            </View>
                            <View style={styles.cameraOverlay}>
                                <MaterialIcons name="camera-alt" size={18} color="white" />
                            </View>
                        </TouchableOpacity>
                        <Text style={styles.avatarHint}>
                            {avatarUploading ? 'Uploading...' : 'Tap to change photo'}
                        </Text>
                    </View>

                    {/* Form */}
                    <View style={styles.form}>
                        <Text style={styles.formTitle}>Personal Info</Text>

                        <View style={styles.fieldContainer}>
                            <Text style={styles.label}>Full Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Your name"
                                placeholderTextColor="rgba(255,255,255,0.5)"
                                value={name}
                                onChangeText={setName}
                                autoCapitalize="words"
                            />
                        </View>

                        <View style={styles.fieldContainer}>
                            <Text style={styles.label}>Bio</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Tell us a bit about yourself..."
                                placeholderTextColor="rgba(255,255,255,0.5)"
                                value={bio}
                                onChangeText={setBio}
                                multiline
                                numberOfLines={3}
                                textAlignVertical="top"
                            />
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.fieldContainer, { flex: 1, marginRight: 8 }]}>
                                <Text style={styles.label}>Age</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="25"
                                    placeholderTextColor="rgba(255,255,255,0.5)"
                                    value={age}
                                    onChangeText={t => setAge(t.replace(/[^0-9]/g, ''))}
                                    keyboardType="number-pad"
                                />
                            </View>
                            <View style={[styles.fieldContainer, { flex: 1 }]}>
                                <Text style={styles.label}>Weight (kg)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="70"
                                    placeholderTextColor="rgba(255,255,255,0.5)"
                                    value={weight}
                                    onChangeText={t => setWeight(t.replace(/[^0-9.]/g, ''))}
                                    keyboardType="decimal-pad"
                                />
                            </View>
                        </View>

                        <View style={styles.fieldContainer}>
                            <Text style={styles.label}>Height (cm)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="175"
                                placeholderTextColor="rgba(255,255,255,0.5)"
                                value={height}
                                onChangeText={t => setHeight(t.replace(/[^0-9]/g, ''))}
                                keyboardType="number-pad"
                            />
                        </View>

                        <View style={styles.fieldContainer}>
                            <Text style={styles.label}>Sex</Text>
                            <View style={styles.chipRow}>
                                {SEX_OPTIONS.map(opt => (
                                    <TouchableOpacity
                                        key={opt}
                                        style={[styles.chip, sex === opt && styles.chipActive]}
                                        onPress={() => setSex(opt)}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[styles.chipText, sex === opt && styles.chipTextActive]}>{opt}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                            onPress={handleSave}
                            disabled={saving}
                            activeOpacity={0.9}
                        >
                            <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    flex:      { flex: 1 },
    gradient:  { flex: 1 },
    container: { flexGrow: 1, paddingBottom: 32 },

    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16,
    },
    headerBackBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
    headerTitle:   { color: 'white', fontSize: 20, fontWeight: '700' },

    avatarSection:   { alignItems: 'center', paddingVertical: 20, gap: 10 },
    avatarTouchable: { position: 'relative' },
    avatarRing: {
        width: 110, height: 110, borderRadius: 55,
        borderWidth: 3, borderColor: '#f8c8c8', overflow: 'hidden',
    },
    avatarImg:         { width: '100%', height: '100%' },
    avatarPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    avatarInitials:    { color: 'white', fontSize: 36, fontWeight: '800' },
    cameraOverlay: {
        position: 'absolute', bottom: 4, right: 4,
        width: 30, height: 30, borderRadius: 15,
        backgroundColor: '#f8c8c8', alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: '#2d5a3d',
    },
    avatarHint: { color: 'rgba(255,255,255,0.55)', fontSize: 13 },

    form:         { paddingHorizontal: 24, gap: 16 },
    formTitle:    { color: 'white', fontSize: 22, fontWeight: '700', marginBottom: 4 },
    fieldContainer:{ gap: 6 },
    label:         { color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: '500', paddingHorizontal: 4 },
    input: {
        backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12,
        paddingHorizontal: 16, height: 56, color: 'white', fontSize: 16,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    },
    textArea: { height: 90, paddingTop: 14 },
    row:       { flexDirection: 'row' },
    chipRow:   { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
    chip: {
        paddingHorizontal: 20, paddingVertical: 12, borderRadius: 99,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    chipActive:     { backgroundColor: 'rgba(248,200,200,0.25)', borderColor: '#f8c8c8' },
    chipText:       { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '500' },
    chipTextActive: { color: 'white', fontWeight: '700' },

    saveBtn: {
        backgroundColor: '#f8c8c8', borderRadius: 14, height: 56,
        alignItems: 'center', justifyContent: 'center', marginTop: 8,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
    },
    saveBtnDisabled: { opacity: 0.6 },
    saveBtnText:     { color: '#2d5a3d', fontSize: 17, fontWeight: '700' },
});
