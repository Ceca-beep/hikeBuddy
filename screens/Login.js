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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function SignUpScreen({ navigation }) {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleSignUp = async () => {
        try {
            const response = await fetch('http://localhost:3000/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fullName, email, password }),
            });

            const data = await response.json();

            if (response.ok) {
                alert('Signup successful!');
                navigation?.navigate('Login');
            } else {
                alert(data.message || 'Signup failed');
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
                <ScrollView
                    contentContainerStyle={styles.container}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Logo */}
                    <View style={styles.logoContainer}>
                        <View style={styles.logoCircle}>
                            <MaterialIcons name="terrain" size={48} color="#3d5a44" />
                        </View>
                        <Text style={styles.appName}>HikeBuddy</Text>
                    </View>

                    {/* Title */}
                    <View style={styles.titleContainer}>
                        <Text style={styles.title}>Join the Adventure</Text>
                        <Text style={styles.subtitle}>Start your journey into the wild today.</Text>
                    </View>

                    {/* Form */}
                    <View style={styles.form}>
                        {/* Full Name */}
                        <View style={styles.fieldContainer}>
                            <Text style={styles.label}>Full Name</Text>
                            <View style={styles.inputWrapper}>
                                <MaterialIcons name="person" size={20} color="#94a3b8" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your full name"
                                    placeholderTextColor="#94a3b8"
                                    value={fullName}
                                    onChangeText={setFullName}
                                    autoCapitalize="words"
                                />
                            </View>
                        </View>

                        {/* Email */}
                        <View style={styles.fieldContainer}>
                            <Text style={styles.label}>Email</Text>
                            <View style={styles.inputWrapper}>
                                <MaterialIcons name="mail" size={20} color="#94a3b8" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your email"
                                    placeholderTextColor="#94a3b8"
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>
                        </View>

                        {/* Password */}
                        <View style={styles.fieldContainer}>
                            <Text style={styles.label}>Password</Text>
                            <View style={styles.inputWrapper}>
                                <MaterialIcons name="lock" size={20} color="#94a3b8" style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, styles.passwordInput]}
                                    placeholder="Create a password"
                                    placeholderTextColor="#94a3b8"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                    autoCapitalize="none"
                                />
                                <TouchableOpacity
                                    onPress={() => setShowPassword(!showPassword)}
                                    style={styles.eyeIcon}
                                >
                                    <MaterialIcons
                                        name={showPassword ? 'visibility-off' : 'visibility'}
                                        size={20}
                                        color="#94a3b8"
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Submit Button */}
                        <TouchableOpacity style={styles.button} onPress={handleSignUp} activeOpacity={0.9}>
                            <Text style={styles.buttonText}>Create Account</Text>
                            <MaterialIcons name="arrow-forward" size={20} color="white" />
                        </TouchableOpacity>

                        {/* Login Link */}
                        <View style={styles.loginContainer}>
                            <Text style={styles.loginText}>Already have an account? </Text>
                            <TouchableOpacity onPress={() => navigation?.navigate('Login')}>
                                <Text style={styles.loginLink}>Log in</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <MaterialIcons name="forest" size={36} color="#3d5a44" style={styles.footerIcon} />
                        <MaterialIcons name="hiking" size={36} color="#3d5a44" style={styles.footerIcon} />
                        <MaterialIcons name="explore" size={36} color="#3d5a44" style={styles.footerIcon} />
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
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 32,
    },
    logoCircle: {
        backgroundColor: 'rgba(61, 90, 68, 0.1)',
        padding: 16,
        borderRadius: 999,
        marginBottom: 12,
    },
    appName: {
        color: '#3d5a44',
        fontSize: 22,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    titleContainer: {
        alignItems: 'center',
        marginBottom: 32,
    },
    title: {
        color: '#0f172a',
        fontSize: 28,
        fontWeight: '700',
        marginBottom: 6,
    },
    subtitle: {
        color: '#475569',
        fontSize: 14,
    },
    form: {
        width: '100%',
        maxWidth: 440,
        gap: 20,
    },
    fieldContainer: {
        gap: 8,
    },
    label: {
        color: '#334155',
        fontSize: 14,
        fontWeight: '600',
        paddingHorizontal: 4,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.7)',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        paddingHorizontal: 16,
    },
    inputIcon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        paddingVertical: 14,
        color: '#0f172a',
        fontSize: 15,
    },
    passwordInput: {
        paddingRight: 8,
    },
    eyeIcon: {
        padding: 4,
    },
    button: {
        backgroundColor: '#3d5a44',
        borderRadius: 12,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 4,
        shadowColor: '#3d5a44',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
    },
    loginContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 8,
    },
    loginText: {
        color: '#475569',
        fontSize: 14,
    },
    loginLink: {
        color: '#3d5a44',
        fontSize: 14,
        fontWeight: '700',
    },
    footer: {
        flexDirection: 'row',
        gap: 16,
        marginTop: 48,
        opacity: 0.2,
    },
    footerIcon: {},
});