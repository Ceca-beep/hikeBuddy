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
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';

export default function SignUpScreen({ navigation }) {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleSignUp = async () => {
        if (password !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }
        try {
            const response = await fetch('http://172.20.10.2:3000/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ firstName, lastName, email, password }),
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
                <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

                    {/* Logo */}
                    <View style={styles.hero}>
                        <View style={styles.logoCircle}>
                            <MaterialIcons name="terrain" size={48} color="white" />
                        </View>
                        <Text style={styles.appName}>HikeBuddy</Text>
                        <Text style={styles.appTagline}>Find your trail companion</Text>

                        {/* Mountain silhouette */}
                        <View style={styles.mountainRow}>
                            <View style={[styles.mountain, { left: 0, width: 200, height: 80 }]} />
                            <View style={[styles.mountain, { left: 150, width: 250, height: 110 }]} />
                            <View style={[styles.mountain, { right: 0, width: 200, height: 80 }]} />
                        </View>
                    </View>

                    {/* Form */}
                    <View style={styles.form}>
                        <Text style={styles.formTitle}>Create Account</Text>

                        <View style={styles.fieldContainer}>
                            <Text style={styles.label}>First Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your first name"
                                placeholderTextColor="rgba(255,255,255,0.5)"
                                value={firstName}
                                onChangeText={setFirstName}
                                autoCapitalize="words"
                            />
                        </View>

                        <View style={styles.fieldContainer}>
                            <Text style={styles.label}>Last Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your last name"
                                placeholderTextColor="rgba(255,255,255,0.5)"
                                value={lastName}
                                onChangeText={setLastName}
                                autoCapitalize="words"
                            />
                        </View>

                        <View style={styles.fieldContainer}>
                            <Text style={styles.label}>Email</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your email"
                                placeholderTextColor="rgba(255,255,255,0.5)"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>

                        <View style={styles.fieldContainer}>
                            <Text style={styles.label}>Password</Text>
                            <View style={styles.passwordWrapper}>
                                <TextInput
                                    style={[styles.input, { flex: 1, borderWidth: 0 , height: '100%'}]}
                                    placeholder="Create a password"
                                    placeholderTextColor="rgba(255,255,255,0.5)"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                    autoCapitalize="none"
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                                    <MaterialIcons
                                        name={showPassword ? 'visibility-off' : 'visibility'}
                                        size={22}
                                        color="rgba(255,255,255,0.5)"
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.fieldContainer}>
                            <Text style={styles.label}>Confirm Password</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Repeat your password"
                                placeholderTextColor="rgba(255,255,255,0.5)"
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry
                                autoCapitalize="none"
                            />
                        </View>

                        <TouchableOpacity style={styles.button} onPress={handleSignUp} activeOpacity={0.9}>
                            <Text style={styles.buttonText}>Create Account</Text>
                        </TouchableOpacity>

                        <View style={styles.loginRow}>
                            <Text style={styles.loginText}>Already have an account? </Text>
                            <TouchableOpacity onPress={() => navigation?.navigate('Login')}>
                                <Text style={styles.loginLink}>Log In</Text>
                            </TouchableOpacity>
                        </View>
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
        paddingBottom: 32,
    },
    hero: {
        alignItems: 'center',
        paddingTop: 60,
        paddingBottom: 32,
        paddingHorizontal: 24,
        position: 'relative',
        minHeight: 220,
    },
    logoCircle: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    appName: {
        color: 'white',
        fontSize: 28,
        fontWeight: '700',
        marginBottom: 4,
        zIndex: 1,
    },
    appTagline: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        fontWeight: '500',
        zIndex: 1,
    },
    mountainRow: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 60,
    },
    mountain: {
        position: 'absolute',
        bottom: 0,
        backgroundColor: 'rgba(45,90,61,0.4)',
        borderTopLeftRadius: 999,
        borderTopRightRadius: 999,
    },
    form: {
        paddingHorizontal: 24,
        gap: 16,
    },
    formTitle: {
        color: 'white',
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 8,
    },
    fieldContainer: {
        gap: 6,
    },
    label: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 14,
        fontWeight: '500',
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
        borderColor: 'rgba(255,255,255,0.2)',
    },
    passwordWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        height: 56,
    },
    eyeBtn: { padding: 4 },
    button: {
        backgroundColor: '#f4c2c2',
        borderRadius: 12,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonText: {
        color: '#2d5a3d',
        fontSize: 18,
        fontWeight: '700',
    },
    loginRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 8,
    },
    loginText: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 14,
    },
    loginLink: {
        color: 'white',
        fontSize: 14,
        fontWeight: '700',
        textDecorationLine: 'underline',
    },
    bottomBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 8,
        paddingHorizontal: 24,
        paddingTop: 24,
        opacity: 0.6,
    },
    bottomText: {
        color: 'white',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 3,
    },
});