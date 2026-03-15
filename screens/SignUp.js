import React, { useState, useRef } from 'react';
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
import { Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const SEX_OPTIONS = ['Male', 'Female'];

export default function SignUpScreen({ navigation }) {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [step, setStep] = useState(0);
    const slideAnim = useRef(new Animated.Value(0)).current;
    const [age, setAge] = useState('');
    const [weight, setWeight] = useState('');
    const [height, setHeight] = useState('');
    const [sex, setSex] = useState('');

    const slideTo = (nextStep) => {
        const direction = nextStep > step ? -width : width;
        Animated.timing(slideAnim, {
            toValue: direction,
            duration: 220,
            useNativeDriver: true,
        }).start(() => {
            slideAnim.setValue(-direction);
            setStep(nextStep);
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 220,
                useNativeDriver: true,
            }).start();
        });
    };

    const handleNext = () => {
        if (!firstName || !email || !password) {
            alert('Please fill in all required fields.');
            return;
        }
        if (confirmPassword && password !== confirmPassword) {
            alert('Passwords do not match.');
            return;
        }
        slideTo(1);
    };

    const handleSignUp = async () => {
        if (password !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }
        try {
            const response = await fetch('https://summarisable-subarticulative-queenie.ngrok-free.dev/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true',
                },
                body: JSON.stringify({
                    first_name: firstName,
                    last_name: lastName,
                    email: email.trim().toLowerCase(),
                    password,
                    age: parseInt(age) || 0,
                    weight: parseFloat(weight) || 0,
                    height: parseFloat(height) || 0,
                    sex: sex || 'Other',
                }),
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
        <LinearGradient colors={['#2d5a3d', '#4a7c59', '#ccd5ae']} style={styles.gradient}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
                <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

                    <View style={styles.hero}>
                        <View style={styles.logoCircle}>
                            <MaterialIcons name="terrain" size={48} color="white" />
                        </View>
                        <Text style={styles.appName}>HikeBuddy</Text>
                        <Text style={styles.appTagline}>Your pocket travel guide</Text>
                        <View style={styles.mountainRow}>
                            <View style={[styles.mountain, { left: 0, width: 200, height: 80 }]} />
                            <View style={[styles.mountain, { left: 150, width: 250, height: 110 }]} />
                            <View style={[styles.mountain, { right: 0, width: 200, height: 80 }]} />
                        </View>
                    </View>

                    <View style={styles.progressContainer}>
                        <View style={styles.progressRow}>
                            <Text style={styles.progressLabel}>Step {step + 1} of 2</Text>
                            <Text style={styles.progressTag}>{step === 0 ? 'ACCOUNT' : 'YOUR PROFILE'}</Text>
                        </View>
                        <View style={styles.progressBar}>
                            <View style={[styles.progressFill, { width: step === 0 ? '50%' : '100%' }]} />
                        </View>
                    </View>

                    <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
                        {step === 0 && (
                            <View style={styles.form}>
                                <Text style={styles.formTitle}>Create Account</Text>
                                <View style={styles.row}>
                                    <View style={[styles.fieldContainer, { flex: 1, marginRight: 8 }]}>
                                        <Text style={styles.label}>First Name</Text>
                                        <TextInput style={styles.input} placeholder="Alex" placeholderTextColor="rgba(255,255,255,0.5)" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
                                    </View>
                                    <View style={[styles.fieldContainer, { flex: 1 }]}>
                                        <Text style={styles.label}>Last Name</Text>
                                        <TextInput style={styles.input} placeholder="Smith" placeholderTextColor="rgba(255,255,255,0.5)" value={lastName} onChangeText={setLastName} autoCapitalize="words" />
                                    </View>
                                </View>
                                <View style={styles.fieldContainer}>
                                    <Text style={styles.label}>Email</Text>
                                    <TextInput style={styles.input} placeholder="Enter your email" placeholderTextColor="rgba(255,255,255,0.5)" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                                </View>
                                <View style={styles.fieldContainer}>
                                    <Text style={styles.label}>Password</Text>
                                    <View style={styles.passwordWrapper}>
                                        <TextInput style={[styles.input, { flex: 1, borderWidth: 0, height: '100%', backgroundColor: 'transparent', paddingHorizontal: 0 }]} placeholder="Create a password" placeholderTextColor="rgba(255,255,255,0.5)" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoCapitalize="none" />
                                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                                            <MaterialIcons name={showPassword ? 'visibility-off' : 'visibility'} size={22} color="rgba(255,255,255,0.5)" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                <View style={styles.fieldContainer}>
                                    <Text style={styles.label}>Confirm Password</Text>
                                    <TextInput style={styles.input} placeholder="Repeat your password" placeholderTextColor="rgba(255,255,255,0.5)" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry autoCapitalize="none" />
                                </View>
                                <TouchableOpacity style={styles.button} onPress={handleNext} activeOpacity={0.9}>
                                    <Text style={styles.buttonText}>Next →</Text>
                                </TouchableOpacity>
                                <View style={styles.loginRow}>
                                    <Text style={styles.loginText}>Already have an account? </Text>
                                    <TouchableOpacity onPress={() => navigation?.navigate('Login')}>
                                        <Text style={styles.loginLink}>Log In</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {step === 1 && (
                            <View style={styles.form}>
                                <Text style={styles.formTitle}>Your Profile</Text>
                                <Text style={styles.formSubtitle}>
                                    This helps us calculate your water and calorie needs for each hike.
                                </Text>
                                <View style={styles.row}>
                                    <View style={[styles.fieldContainer, { flex: 1, marginRight: 8 }]}>
                                        <Text style={styles.label}>Age</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="25"
                                            placeholderTextColor="rgba(255,255,255,0.5)"
                                            value={age}
                                            onChangeText={(text) => setAge(text.replace(/[^0-9]/g, ''))}
                                            keyboardType="number-pad"
                                            selectionColor="white"
                                        />
                                    </View>
                                    <View style={[styles.fieldContainer, { flex: 1 }]}>
                                        <Text style={styles.label}>Weight (kg)</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="70"
                                            placeholderTextColor="rgba(255,255,255,0.5)"
                                            value={weight}
                                            onChangeText={(text) => setWeight(text.replace(/[^0-9.]/g, ''))}
                                            keyboardType="number-pad"
                                            selectionColor="white"
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
                                        onChangeText={(text) => setHeight(text.replace(/[^0-9]/g, ''))}
                                        keyboardType="number-pad"
                                        selectionColor="white"
                                    />
                                </View>
                                <View style={styles.fieldContainer}>
                                    <Text style={styles.label}>Sex</Text>
                                    <View style={styles.chipRow}>
                                        {SEX_OPTIONS.map((opt) => (
                                            <TouchableOpacity
                                                key={opt}
                                                style={[styles.chip, sex === opt && styles.chipActive]}
                                                onPress={() => setSex(opt)}
                                                activeOpacity={1}
                                            >
                                                <Text style={[styles.chipText, sex === opt && styles.chipTextActive]}>{opt}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                                <View style={styles.buttonRow}>
                                    <TouchableOpacity style={styles.backBtn} onPress={() => slideTo(0)} activeOpacity={0.8}>
                                        <Text style={styles.backBtnText}>← Back</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.button, { flex: 2, marginTop: 0 }]} onPress={handleSignUp} activeOpacity={0.9}>
                                        <Text style={styles.buttonText}>Create Account</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    gradient: { flex: 1 },
    container: { flexGrow: 1, paddingBottom: 32 },
    hero: { alignItems: 'center', paddingTop: 60, paddingBottom: 32, paddingHorizontal: 24, position: 'relative', minHeight: 220 },
    logoCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    appName: { color: 'white', fontSize: 28, fontWeight: '700', marginBottom: 4, zIndex: 1 },
    appTagline: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '500', zIndex: 1 },
    mountainRow: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 60 },
    mountain: { position: 'absolute', bottom: 0, backgroundColor: 'rgba(45,90,61,0.4)', borderTopLeftRadius: 999, borderTopRightRadius: 999 },
    form: { paddingHorizontal: 24, gap: 16 },
    formTitle: { color: 'white', fontSize: 24, fontWeight: '700', marginBottom: 8 },
    fieldContainer: { gap: 6 },
    label: { color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: '500', paddingHorizontal: 4 },
    input: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingHorizontal: 16, height: 56, color: 'white', fontSize: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    passwordWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', height: 56 },
    eyeBtn: { padding: 4 },
    button: { backgroundColor: '#f4c2c2', borderRadius: 12, height: 56, alignItems: 'center', justifyContent: 'center', marginTop: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
    buttonText: { color: '#2d5a3d', fontSize: 18, fontWeight: '700' },
    loginRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 8 },
    loginText: { color: 'rgba(255,255,255,0.9)', fontSize: 14 },
    loginLink: { color: 'white', fontSize: 14, fontWeight: '700', textDecorationLine: 'underline' },
    progressContainer: { paddingHorizontal: 24, marginBottom: 8, gap: 8 },
    progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    progressLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '500' },
    progressTag: { color: 'white', fontSize: 11, fontWeight: '700', letterSpacing: 1.2, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99 },
    progressBar: { height: 6, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 99, backgroundColor: '#f4c2c2' },
    formSubtitle: { color: 'rgba(255,255,255,0.6)', fontSize: 13, lineHeight: 20, marginBottom: 4 },
    row: { flexDirection: 'row' },
    chipRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
    chip: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 99, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.1)' },
    chipActive: { backgroundColor: 'rgba(244,194,194,0.25)', borderColor: '#f4c2c2' },
    chipText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '500' },
    chipTextActive: { color: 'white', fontWeight: '700' },
    buttonRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
    backBtn: { flex: 1, height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.1)' },
    backBtnText: { color: 'white', fontWeight: '600', fontSize: 15 },
});