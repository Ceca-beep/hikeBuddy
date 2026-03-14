import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SignUpScreen from './screens/SignUp';
import LoginScreen from './screens/Login';
import HomescreenScreen from './screens/Homescreen';

const Stack = createNativeStackNavigator();

export default function App() {
    return (
        <NavigationContainer>
            <Stack.Navigator initialRouteName="SignUp" screenOptions={{ headerShown: false }}>
                <Stack.Screen name="SignUp" component={SignUpScreen} />
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="Homescreen" component={HomescreenScreen} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}