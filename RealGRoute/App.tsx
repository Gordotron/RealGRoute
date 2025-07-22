import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import WelcomeScreen from './src/screens/WelcomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import MapScreen from './src/screens/MapScreen';
import FencesScreen from './src/screens/FencesScreen';
import CreateFenceScreen from './src/screens/CreateFenceScreen';
import EditFenceScreen from './src/screens/EditFenceScreen';
import FeedbackScreen from './src/screens/FeedbackScreen';
import CreateFeedbackScreen from './src/screens/CreateFeedbackScreen';
import NavigationScreen from './src/screens/NavigationScreen'; 
import EditFeedbackScreen from './src/screens/EditFeedbackScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Welcome" 
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Map" component={MapScreen} />
        <Stack.Screen name="Fences" component={FencesScreen} />
        <Stack.Screen name="CreateFence" component={CreateFenceScreen} />
        <Stack.Screen name="EditFence" component={EditFenceScreen} />
        <Stack.Screen name="Feedback" component={FeedbackScreen} />
        <Stack.Screen name="CreateFeedback" component={CreateFeedbackScreen} />
        <Stack.Screen name="Navigation" component={NavigationScreen} />
        <Stack.Screen name="EditFeedback" component={EditFeedbackScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}