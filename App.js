import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootSiblingParent } from 'react-native-root-siblings';
import { LogBox } from 'react-native';
import Toast from 'react-native-toast-message';

// Pantallas de Autenticación
import LoginScreen from './screens/auth/LoginScreen';
import ForgotPasswordScreen from './screens/auth/ForgotPasswordScreen';
import AdminDashboardScreen from './screens/admin/AdminDashboardScreen';

// Pantallas del Cliente
import HomeScreen from './screens/cliente/HomeScreen';
import RequestScreen from './screens/cliente/RequestScreen';
import MapPickerScreen from './screens/cliente/MapPickerScreen';
import RecentsScreen from './screens/cliente/RecentsScreen';
import ProfileScreen from './screens/cliente/ProfileScreen';
import TrackingScreen from './screens/cliente/TrackingScreen';

// Pantallas del Conductor
import ConductorScreen from './screens/conductor/ConductorScreen';
import OrderListScreen from './screens/conductor/OrderListScreen';
import ConfigureShiftScreen from './screens/conductor/ConfigureShiftScreen';
import DriverProfileScreen from './screens/conductor/DriverProfileScreen';
import DriverRouteScreen from './screens/conductor/DriverRouteScreen';
import IncomingOrderScreen from './screens/conductor/IncomingOrderScreen';
import WaitingPaymentScreen from './screens/conductor/WaitingPaymentScreen';

// NUEVAS PANTALLAS (Lógica de Llenado de Tanque)
import ShiftMenuScreen from './screens/conductor/ShiftMenuScreen';
import FillTruckScreen from './screens/conductor/FillTruckScreen';

// Ignoramos las advertencias no críticas en pantalla
LogBox.ignoreLogs(['Non-serializable values']); 

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <RootSiblingParent> 
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
          {/* --- Autenticación --- */}
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen 
  name="ForgotPassword" 
  component={ForgotPasswordScreen} // <-- Sin comillas, debe ser la variable importada
  options={{ headerShown: false }} 
/>
          
          <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ headerShown: false }} />
          {/* --- Rutas del Cliente --- */}
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Request" component={RequestScreen} />
          <Stack.Screen name="MapPicker" component={MapPickerScreen} options={{ presentation: 'modal' }} />
          <Stack.Screen name="Recents" component={RecentsScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Tracking" component={TrackingScreen} />
          
          {/* --- Rutas del Conductor --- */}
          <Stack.Screen name="Conductor" component={ConductorScreen} />
          <Stack.Screen name="OrderList" component={OrderListScreen} />
          <Stack.Screen name="ConfigureShift" component={ConfigureShiftScreen} />
          <Stack.Screen name="DriverProfile" component={DriverProfileScreen} />
          <Stack.Screen name="DriverRoute" component={DriverRouteScreen} />
          <Stack.Screen name="IncomingOrder" component={IncomingOrderScreen} />
          <Stack.Screen name="WaitingPayment" component={WaitingPaymentScreen} />
          
          {/* --- Nuevas Rutas del Conductor --- */}
          <Stack.Screen name="ShiftMenu" component={ShiftMenuScreen} />
          <Stack.Screen name="FillTruck" component={FillTruckScreen} />

        </Stack.Navigator>
      </NavigationContainer>
      <Toast/>
    </RootSiblingParent> 
  );
}