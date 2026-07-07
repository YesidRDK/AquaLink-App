// ================================================
// Pantalla: Selección de Ubicación en Mapa
// Permite al cliente arrastrar un pin sobre el
// mapa para definir la dirección de entrega del
// servicio de agua. Obtiene la ubicación GPS
// actual y resuelve la dirección mediante
// geocodificación inversa.
// ================================================

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { styles } from '../../styles';
import { Ionicons } from '@expo/vector-icons';

export default function MapPickerScreen({ navigation, route }) {
  const [currentLocation, setCurrentLocation] = useState(null); // Ubicación GPS actual
  const [selectedCoords, setSelectedCoords] = useState(null);   // Coordenadas del pin arrastrado
  const [address, setAddress] = useState("Buscando dirección..."); // Dirección resuelta

  // ==============================================
  // Obtener dirección a partir de coordenadas
  // ==============================================
  const getAddress = async (lat, lng) => {
    try {
      let response = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (response.length > 0) {
        let item = response[0];
        setAddress(`${item.street || 'Calle s/n'}, ${item.district || item.city || 'Barinas'}`);
      } else {
        setAddress("Ubicación seleccionada");
      }
    } catch (e) {
      setAddress("Ubicación seleccionada");
    }
  };

  // ==============================================
  // Inicializar ubicación actual del dispositivo
  // ==============================================
  useEffect(() => {
    (async () => {
      let pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setCurrentLocation(coords);
      setSelectedCoords(coords);
      getAddress(coords.lat, coords.lng);
    })();
  }, []);

  // ==============================================
  // Confirmar ubicación y regresar a la pantalla anterior
  // ==============================================
  const confirmarUbicacion = () => {
    const pantallaDestino = route.params?.origen;
    if (pantallaDestino) {
      navigation.navigate(pantallaDestino, {
        ubicacionSeleccionada: selectedCoords,
        ...route.params?.datosTemporales
      });
    } else {
      navigation.goBack();
    }
  };

  // ==============================================
  // INTERFAZ: Mapa con Leaflet + Panel inferior
  // ==============================================
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      {!currentLocation ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' }}>
          <Ionicons name="earth" size={24} color="#1976D2" style={{ marginRight: 8 }} />
          <Text style={{ color: '#1976D2', fontWeight: 'bold', fontSize: 16 }}>Buscando tu ubicación GPS...</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Mapa interactivo con marcador arrastrable */}
          <WebView
            originWhitelist={['*']}
            onMessage={(event) => {
              const coords = JSON.parse(event.nativeEvent.data);
              setSelectedCoords(coords);
              getAddress(coords.lat, coords.lng);
            }}
            source={{
              html: `
                <html>
                  <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                    <style> body { margin: 0; } #map { height: 100vh; width: 100vw; } </style>
                  </head>
                  <body>
                    <div id="map"></div>
                    <script>
                      var userLat = ${currentLocation.lat};
                      var userLng = ${currentLocation.lng};
                      var map = L.map('map').setView([userLat, userLng], 17);
                      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
                      var userCircle = L.circleMarker([userLat, userLng], {
                        radius: 10, fillColor: "#1976D2", color: "#fff",
                        weight: 3, opacity: 1, fillOpacity: 0.8
                      }).addTo(map);
                      userCircle.bindPopup("<b>Estás aquí</b>").openPopup();
                      var deliveryMarker = L.marker([userLat, userLng], {
                        draggable: true, autoPan: true
                      }).addTo(map);
                      deliveryMarker.bindPopup("Arrastra este pin al destino").openPopup();
                      deliveryMarker.on('dragend', function(e) {
                        var position = deliveryMarker.getLatLng();
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                          lat: position.lat, lng: position.lng
                        }));
                      });
                    </script>
                  </body>
                </html>
              `
            }}
            style={{ flex: 1 }}
          />

          {/* Panel inferior con dirección y botones */}
          <View style={{
            paddingHorizontal: 20, paddingTop: 20, paddingBottom: 65,
            backgroundColor: '#fff', elevation: 10
          }}>
            <View style={{
              flexDirection: 'row', justifyContent: 'center',
              alignItems: 'center', marginBottom: 5
            }}>
              <Ionicons name="location-sharp" size={20} color="#1976D2" style={{ marginRight: 5 }} />
              <Text style={{ fontWeight: 'bold', color: '#1976D2', fontSize: 16 }}>{address}</Text>
            </View>
            <Text style={{ textAlign: 'center', marginBottom: 15, color: '#555' }}>
              El círculo azul es tu guía. Arrastra el pin a donde deseas el agua.
            </Text>

            <TouchableOpacity
              style={[styles.mainButton, { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }]}
              onPress={confirmarUbicacion}
            >
              <Text style={styles.mainButtonText}>Confirmar Ubicación</Text>
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" style={{ marginLeft: 8 }} />
            </TouchableOpacity>

            <TouchableOpacity
              style={{ marginTop: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="close" size={18} color="#d32f2f" style={{ marginRight: 4 }} />
              <Text style={{ textAlign: 'center', color: '#d32f2f', fontWeight: 'bold' }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}