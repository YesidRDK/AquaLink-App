// ================================================
// Pantalla: Inicio del Cliente
// Muestra la ubicación actual en un mapa y
// permite acceder a solicitar camión, contactos
// recientes, perfil o cerrar sesión.
// También redirige automáticamente al seguimiento
// si hay un pedido activo en proceso de pago.
// ================================================

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { styles } from '../../styles';
import { Ionicons } from '@expo/vector-icons';

// Firebase Firestore
import { auth, db } from '../../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export default function HomeScreen({ navigation }) {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // ==============================================
  // EFECTO: Radar de pedidos activos
  // Escucha pedidos en estado "esperando_pago" o
  // "pago_en_revision" y redirige al seguimiento
  // ==============================================
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(collection(db, 'pedidos'), where('clienteId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let activas = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.estado === 'esperando_pago' || data.estado === 'pago_en_revision') {
          activas.push({ id: docSnap.id, ...data });
        }
      });

      if (activas.length > 0) {
        activas.sort((a, b) => {
          const dateA = a.fecha?.toMillis ? a.fecha.toMillis() : 0;
          const dateB = b.fecha?.toMillis ? b.fecha.toMillis() : 0;
          return dateB - dateA;
        });
        navigation.navigate('Tracking', { pedidoId: activas[0].id });
      }
    });

    return () => unsubscribe();
  }, [navigation]);

  // ==============================================
  // EFECTO: Obtener ubicación GPS del dispositivo
  // ==============================================
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permiso denegado. Usando ubicación por defecto.');
        setLocation({ latitude: 8.7562, longitude: -70.4074 });
        return;
      }
      let currentPosition = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });
      setLocation({
        latitude: currentPosition.coords.latitude,
        longitude: currentPosition.coords.longitude
      });
    })();
  }, []);

  // ==============================================
  // INTERFAZ: Mapa y panel de opciones
  // ==============================================
  return (
    <SafeAreaView style={styles.container}>
      {/* Mapa con la ubicación actual */}
      <View style={styles.mapContainer}>
        {!location ? (
          <View style={{
            flex: 1, justifyContent: 'center', alignItems: 'center',
            backgroundColor: '#e0e0e0', flexDirection: 'row'
          }}>
            <Ionicons name="earth" size={24} color="#1976D2" style={{ marginRight: 8 }} />
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1976D2' }}>
              Localizando tu posición...
            </Text>
            {errorMsg && (
              <Text style={{ color: '#d32f2f', marginTop: 10, position: 'absolute', bottom: 20 }}>
                {errorMsg}
              </Text>
            )}
          </View>
        ) : (
          <WebView
            originWhitelist={['*']}
            source={{
              html: `
                <html>
                  <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                    <style> body { margin: 0; } #map { height: 100vh; width: 100vw; } </style>
                  </head>
                  <body>
                    <div id="map"></div>
                    <script>
                      var lat = ${location.latitude};
                      var lng = ${location.longitude};
                      var map = L.map('map').setView([lat, lng], 16);
                      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
                      L.marker([lat, lng]).addTo(map).bindPopup('Tu ubicación actual').openPopup();
                    </script>
                  </body>
                </html>
              `
            }}
            style={styles.map}
          />
        )}
      </View>

      {/* Panel inferior con opciones principales */}
      <View style={styles.bottomPanel}>
        <Text style={styles.titleHome}>Bienvenido</Text>
        <Text style={styles.subtitleHome}>¿Qué deseas hacer hoy?</Text>

        {/* Solicitar camión cisterna */}
        <TouchableOpacity
          style={[styles.mainButton, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
          onPress={() => navigation.navigate('Request')}
        >
          <Text style={styles.mainButtonText}>Solicitar Camión</Text>
          <Ionicons name="water" size={20} color="#fff" style={{ marginLeft: 8 }} />
        </TouchableOpacity>

        {/* Contactos recientes */}
        <TouchableOpacity
          style={[styles.mainButton, {
            backgroundColor: '#4CAF50', marginTop: 10,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center'
          }]}
          onPress={() => navigation.navigate('Recents')}
        >
          <Text style={styles.mainButtonText}>Contactos Recientes</Text>
          <Ionicons name="time" size={20} color="#fff" style={{ marginLeft: 8 }} />
        </TouchableOpacity>

        {/* Perfil del usuario */}
        <TouchableOpacity
          style={[styles.mainButton, {
            backgroundColor: '#FF9800', marginTop: 10,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center'
          }]}
          onPress={() => navigation.navigate('Profile')}
        >
          <Text style={styles.mainButtonText}>Mi Perfil</Text>
          <Ionicons name="person" size={20} color="#fff" style={{ marginLeft: 8 }} />
        </TouchableOpacity>

        {/* Cerrar sesión */}
        <TouchableOpacity
          style={[styles.mainButton, {
            backgroundColor: '#e3f2fd', marginTop: 10,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center'
          }]}
          onPress={() => navigation.replace('Login')}
        >
          <Text style={[styles.mainButtonText, { color: '#1976D2' }]}>Cerrar Sesión</Text>
          <Ionicons name="log-out-outline" size={22} color="#1976D2" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}