import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { styles } from '../../styles';

// --- IMPORTACIÓN DE ICONOS VECTORIALES ---
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function DriverRouteScreen({ navigation, route }) {
  const [location, setLocation] = useState(null);
  
  // 1: Manejando (Mapa), 2: Llegó (Esperando Pago), 3: Pago Recibido (Validar)
  const [estadoRuta, setEstadoRuta] = useState(1); 

  const clienteNombre = route.params?.cliente || "Cliente";
  const destinoLat = route.params?.destLat || 8.7595; 
  const destinoLng = route.params?.destLng || -70.4120;

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Se necesita acceso al GPS.');
        navigation.goBack();
        return;
      }
      let currentPosition = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation({ latitude: currentPosition.coords.latitude, longitude: currentPosition.coords.longitude });
    })();
  }, []);

  const handleLlegada = () => {
    setEstadoRuta(2);
    // Simula que el cliente tarda unos segundos en hacer el pago desde su teléfono
    setTimeout(() => {
      setEstadoRuta(3);
    }, 6000);
  };

  const handleCompletar = () => {
    alert("¡Pago verificado y agua entregada con éxito! ✅");
    navigation.goBack(); // Regresa a la lista de pedidos para que lo marque como completado
  };

  return (
    <SafeAreaView style={styles.container}>
      

      {estadoRuta === 1 ? (
        <>
          <View style={[styles.mapContainer, { flex: 1, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, marginTop: 0 }]}>
            {!location ? (
              <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', flexDirection: 'row'}}>
                <MaterialCommunityIcons name="satellite-uplink" size={24} color="#1976D2" style={{marginRight: 8}} />
                <Text style={{fontSize: 18, color: '#1976D2', fontWeight: 'bold'}}>Calculando ruta GPS...</Text>
              </View>
            ) : (
              <WebView
                originWhitelist={['*']}
                source={{ html: `<html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" /><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><link rel="stylesheet" href="https://unpkg.com/leaflet-routing-machine@latest/dist/leaflet-routing-machine.css" /><script src="https://unpkg.com/leaflet-routing-machine@latest/dist/leaflet-routing-machine.js"></script><style> body { margin: 0; } #map { height: 100vh; width: 100vw; } .leaflet-routing-container { display: none !important; }</style></head><body><div id="map"></div><script>var driverLat = ${location.latitude}; var driverLng = ${location.longitude}; var destLat = ${destinoLat}; var destLng = ${destinoLng}; var map = L.map('map'); L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map); L.Routing.control({ waypoints: [ L.latLng(driverLat, driverLng), L.latLng(destLat, destLng) ], lineOptions: { styles: [{color: '#35FC51', opacity: 0.9, weight: 7}] }, createMarker: function(i, wp, nWps) { if (i === 0) { return L.marker(wp.latLng).bindPopup('Tu camión'); } else { return L.circleMarker(wp.latLng, {radius: 8, fillColor: "#d32f2f", color: "#fff", weight: 2, opacity: 1, fillOpacity: 1}).bindPopup('Destino'); } }, routeWhileDragging: false, addWaypoints: false, fitSelectedRoutes: true }).addTo(map);</script></body></html>`}}
                style={{ flex: 1 }}
              />
            )}
          </View>
          
          <View style={{ padding: 20, paddingBottom: 50, backgroundColor: '#fff', elevation: 15 }}>
             <Text style={{ textAlign: 'center', color: '#666', marginBottom: 15, fontSize: 13 }}>Sigue la línea de color para llegar a tu destino.</Text>
             <TouchableOpacity 
               style={[styles.mainButton, { backgroundColor: '#34C759', marginTop: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]} 
               onPress={handleLlegada}
             >
               <Text style={styles.mainButtonText}>Llegué al destino</Text>
               <Ionicons name="location-sharp" size={20} color="#fff" style={{ marginLeft: 8 }} />
             </TouchableOpacity>
          </View>
        </>
      ) : (
        /* --- INTERFAZ DE ESPERA DE PAGO --- */
        <View style={{ flex: 1, justifyContent: 'center', padding: 30, backgroundColor: '#fdfdfd' }}>
          <View style={{ backgroundColor: '#fff', padding: 30, borderRadius: 20, elevation: 5, alignItems: 'center', borderWidth: 1, borderColor: estadoRuta === 2 ? '#FF9800' : '#34C759' }}>
            
            {/* ICONO GIGANTE REEMPLAZANDO EMOJI */}
            {estadoRuta === 2 ? (
              <Ionicons name="hourglass-outline" size={64} color="#FF9800" style={{ marginBottom: 15 }} />
            ) : (
              <MaterialCommunityIcons name="cash-fast" size={64} color="#34C759" style={{ marginBottom: 15 }} />
            )}
            
            <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 10 }}>
              {estadoRuta === 2 ? 'Esperando Pago' : '¡Pago Reportado!'}
            </Text>
            
            <Text style={{ fontSize: 15, color: '#666', textAlign: 'center', marginBottom: 25 }}>
              {estadoRuta === 2 
                ? 'El cliente ha sido notificado de tu llegada. Por favor, espera a que reporte el pago para liberar el agua.'
                : `El cliente ${clienteNombre} indica que ya realizó la transferencia/pago móvil.`}
            </Text>

            {estadoRuta === 2 ? (
               <ActivityIndicator size="large" color="#FF9800" />
            ) : (
              <View style={{ width: '100%' }}>
                <View style={{ backgroundColor: '#F0F8FF', padding: 15, borderRadius: 10, marginBottom: 20 }}>
                  <Text style={{ color: '#1976D2', fontWeight: 'bold', textAlign: 'center' }}>Referencia: 98765432</Text>
                  <Text style={{ color: '#555', textAlign: 'center', fontSize: 12, marginTop: 5 }}>Banco de Venezuela</Text>
                </View>

                <TouchableOpacity 
                  style={[styles.mainButton, { backgroundColor: '#34C759', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]} 
                  onPress={handleCompletar}
                >
                  <Text style={styles.mainButtonText}>Verificar y Completar</Text>
                  <Ionicons name="checkmark-circle-outline" size={22} color="#fff" style={{ marginLeft: 8 }} />
                </TouchableOpacity>
              </View>
            )}

          </View>
        </View>
      )}
    </SafeAreaView>
  );
}