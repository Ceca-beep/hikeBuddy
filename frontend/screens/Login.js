import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';

export default function LoginScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // send credentials to backend and navigates to home if login succeeds
    const handleLogin = async () => {
        try {
            const NGROK_URL = 'https://summarisable-subarticulative-queenie.ngrok-free.dev';

            const response = await fetch(`${NGROK_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    password: password
                }),
            });
            const data = await response.json();
            if (response.ok) {
                navigation?.navigate('Home');
            } else {
                alert(data.message || 'Login failed');
            }
        } catch (error) {
            console.error(error);
            alert('Network error');
        }
    };

    return (
        <LinearGradient
            colors={['#2d5a3d', '#4a7c59', '#ccd5ae']}
            style={styles.gradient}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.flex}
            >
                <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
                            <MaterialIcons name="arrow-back" size={24} color="white" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>HikeBuddy</Text>
                        <View style={{ width: 48 }} />
                    </View>

                    {/* Logo */}
                    <View style={styles.logoSection}>
                        <View style={styles.logoCircle}>
                            <MaterialIcons name="terrain" size={48} color="white" />
                        </View>
                        <Text style={styles.appName}>HikeBuddy</Text>
                        <Text style={styles.appTagline}>Your pocket travel guide</Text>
                    </View>

                    {/* Form */}
                    <View style={styles.form}>
                        <Text style={styles.formTitle}>Welcome Back</Text>

                        <View style={styles.fieldContainer}>
                            <Text style={styles.label}>Email</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter email"
                                placeholderTextColor="rgba(255,255,255,0.5)"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>

                        {/* Password */}
                        <View style={styles.fieldContainer}>
                            <Text style={styles.label}>Password</Text>
                            <View style={styles.passwordWrapper}>
                                <TextInput
                                    style={[styles.input, { flex: 1, borderWidth: 0, backgroundColor: 'transparent' }]}
                                    placeholder="Password"
                                    placeholderTextColor="rgba(255,255,255,0.5)"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                    autoCapitalize="none"
                                />

                                {/* Toggle password visibility */}
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                                    <MaterialIcons
                                        name={showPassword ? 'visibility-off' : 'visibility'}
                                        size={22}
                                        color="rgba(255,255,255,0.7)"
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/*Main submit button*/}
                        <TouchableOpacity style={styles.button} onPress={handleLogin} activeOpacity={0.9}>
                            <Text style={styles.buttonText}>LOG IN</Text>
                        </TouchableOpacity>
                    </View>

                    {/*Skip button to go straight to home without logging in*/}
                    <TouchableOpacity onPress={() => navigation?.navigate('Home')}>
                        <Text style={styles.skipText}>Skip for now</Text>
                    </TouchableOpacity>

                    {/* Footer with link to sign up */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>New here? </Text>
                        <TouchableOpacity onPress={() => navigation?.navigate('SignUp')}>
                            <Text style={styles.footerLink}>Sign up</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Bottom mountains design */}
                    <View style={styles.mountains}>
                        <View style={[styles.mountain, { left: 0, width: 180, height: 90 }]} />
                        <View style={[styles.mountain, { left: 130, width: 220, height: 120 }]} />
                        <View style={[styles.mountain, { right: 0, width: 180, height: 90 }]} />
                    </View>

                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    gradient: { flex: 1 },
    container: {
        flexGrow: 1,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 52,
        paddingBottom: 8,
    },
    backBtn: {
        width: 48,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: '700',
    },
    skipText: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 13,
        textAlign: 'center',
        marginTop: 8,
        textDecorationLine: 'underline',
    },
    logoSection: {
        alignItems: 'center',
        paddingTop: 24,
        paddingBottom: 16,
    },
    logoCircle: {
        width: 128,
        height: 128,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        position: 'relative',
    },
    logoBlur: {
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        borderRadius: 64,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    logoIcons: {
        alignItems: 'center',
        zIndex: 1,
    },
    appName: {
        color: 'white',
        fontSize: 32,
        fontWeight: '700',
        marginBottom: 4,
    },
    appTagline: {
        color: 'rgba(204,213,174,0.9)',
        fontSize: 14,
        fontWeight: '500',
    },
    form: {
        paddingHorizontal: 24,
        paddingTop: 16,
        gap: 20,
    },
    formTitle: {
        color: 'white',
        fontSize: 24,
        fontWeight: '700',
    },
    fieldContainer: {
        gap: 8,
    },
    label: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
        paddingHorizontal: 4,
    },
    input: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 56,
        color: 'white',
        fontSize: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    passwordWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        height: 56,
    },
    eyeBtn: { padding: 4 },
    button: {
        backgroundColor: '#f4c2c2',
        borderRadius: 12,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonText: {
        color: '#1e293b',
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 1,
    },
    forgotBtn: {
        alignItems: 'center',
    },
    forgotText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 32,
    },
    footerText: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 15,
    },
    footerLink: {
        color: 'white',
        fontSize: 15,
        fontWeight: '700',
        textDecorationLine: 'underline',
    },
    mountains: {
        width: '100%',
        height: 120,
        marginTop: 24,
        position: 'relative',
        opacity: 0.2,
    },
    mountain: {
        position: 'absolute',
        bottom: 0,
        backgroundColor: '#2d5a3d',
        borderTopLeftRadius: 999,
        borderTopRightRadius: 999,
    },
});