import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import Login from './screens/Login';
import SignUp from './screens/SignUp';
import Homescreen from './screens/Homescreen';
import TrailDetails from './screens/TrailDetails';
import Mapscreen from './screens/Mapscreen'


const Stack = createStackNavigator();

export default function App() {
    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{headerShown: false}} initialRouteName="Login">
                <Stack.Screen name="Login" component={Login}/>
                <Stack.Screen name="SignUp" component={SignUp}/>
                <Stack.Screen name="Home" component={Homescreen}/>
                <Stack.Screen name="TrailDetail" component={TrailDetails}/>
                <Stack.Screen name="Mapscreen" component={Mapscreen}/>
            </Stack.Navigator>
        </NavigationContainer>
    );
}