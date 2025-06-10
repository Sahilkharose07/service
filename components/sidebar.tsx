import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import HomeScreen from '../app/home';
import ServicesScreen from '../app/service';

const Drawer = createDrawerNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Drawer.Navigator
      >
        <Drawer.Screen name="Home" component={HomeScreen} />
        <Drawer.Screen name="Services" component={ServicesScreen} />
      </Drawer.Navigator>
    </NavigationContainer>
  );
}
