// ================================================
// Pantalla: Panel del Conductor
// Gestiona la jornada laboral del conductor:
// - Mapa con ruta en vivo usando Leaflet y GPS.
// - Recepción de nuevos pedidos en tiempo real.
// - Control de llegada a destino y estado del servicio.
// - Modo pantalla completa para seguimiento de ruta.
// - Si el pago es en efectivo, finaliza el pedido
//   automáticamente sin esperar comprobante.
// ================================================

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { useIsFocused } from '@react-navigation/native';
import { styles } from '../../styles';
import { auth, db } from '../../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function ConductorScreen({ navigation, route }) {
  // ==============================================
  // ESTADOS PRINCIPALES
  // ==============================================
  const [location, setLocation] = useState(null);         // Coordenadas GPS actuales
  const [isOnline, setIsOnline] = useState(false);        // Estado de la jornada
  const [isFullScreen, setIsFullScreen] = useState(false); // Modo mapa expandido
  const [pedidosActivos, setPedidosActivos] = useState(0);
  const [litrosDisponibles, setLitrosDisponibles] = useState(0);
  const [mostrarNotificacion, setMostrarNotificacion] = useState(false);
  const [destinoRuta, setDestinoRuta] = useState(null);   // Coordenadas del destino activo
  const [pedidoActivoId, setPedidoActivoId] = useState(null);
  const [pedidoPendiente, setPedidoPendiente] = useState(null); // Nuevo pedido entrante

  const pedidosIgnorados = useRef([]);        // IDs de pedidos ya rechazados
  const activeOrderIdRef = useRef(null);      // Referencia actualizada del pedido activo

  // ==============================================
  // EFECTO: Procesar parámetros de navegación
  // ==============================================
  useEffect(() => {
    if (route.params?.isOnline) setIsOnline(true);
    if (route.params?.nuevoPedidoAceptado) {
      setPedidosActivos(prev => prev + 1);
      setMostrarNotificacion(false);
      if (route.params?.destinoCoords) setDestinoRuta(route.params.destinoCoords);
      if (route.params?.pedidoIdActivo) setPedidoActivoId(route.params.pedidoIdActivo);
      setIsFullScreen(true);
    }
    if (route.params?.pedidoCompletado) {
      setPedidosActivos(prev => Math.max(0, prev - 1));
      setIsFullScreen(false);
    }
    if (route.params?.pedidoRechazado) {
      if (!pedidosIgnorados.current.includes(route.params.pedidoRechazado)) {
        pedidosIgnorados.current.push(route.params.pedidoRechazado);
      }
    }
  }, [route.params]);

  // Mantener sincronizada la referencia del pedido activo
  useEffect(() => {
    activeOrderIdRef.current = pedidoActivoId;
  }, [pedidoActivoId]);

  // ==============================================
  // EFECTO: Escuchar litros disponibles del conductor
  // ==============================================
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) setLitrosDisponibles(docSnap.data().litrosActuales || 0);
    });
    return () => unsubscribe();
  }, []);

  // ==============================================
  // EFECTO: GPS en tiempo real y envío a Firestore
  // ==============================================
  useEffect(() => {
    let subscription = null;
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocation({ latitude: 8.7562, longitude: -70.4074 });
        return;
      }
      let currentPosition = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation({ latitude: currentPosition.coords.latitude, longitude: currentPosition.coords.longitude });

      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
        (loc) => {
          const newCoords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          setLocation(newCoords);
          if (activeOrderIdRef.current) {
            updateDoc(doc(db, 'pedidos', activeOrderIdRef.current), {
              conductorCoords: { lat: newCoords.latitude, lng: newCoords.longitude }
            }).catch(e => console.log("Error subiendo GPS:", e));
          }
        }
      );
    })();
    return () => { if (subscription) subscription.remove(); };
  }, []);

  const isFocused = useIsFocused();

  // ==============================================
  // EFECTO: Escuchar nuevos pedidos cuando está en jornada
  // ==============================================
  useEffect(() => {
    if (!isFocused || !isOnline) return;
    const q = query(collection(db, 'pedidos'), where('estado', '==', 'buscando_conductor'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          if (!pedidosIgnorados.current.includes(change.doc.id)) {
            setPedidoPendiente({ id: change.doc.id, data: change.doc.data() });
            setMostrarNotificacion(true);
            setIsFullScreen(false);
          }
        }
      });
    });
    return () => unsubscribe();
  }, [isFocused, isOnline, navigation]);

  // ==============================================
  // FUNCIONES DE CONTROL
  // ==============================================

  // Detener la jornada laboral
  const handleStopShift = () => {
    setIsOnline(false);
    setMostrarNotificacion(false);
    setDestinoRuta(null);
    setPedidoActivoId(null);
    setIsFullScreen(false);
    alert('Jornada detenida.');
  };

  // Confirmar llegada al destino
  const handleConfirmarLlegada = async () => {
    if (!pedidoActivoId) return;
    try {
      const pedidoRef = doc(db, 'pedidos', pedidoActivoId);
      const pedidoSnap = await getDoc(pedidoRef);
      if (!pedidoSnap.exists()) return;
      const pedidoData = pedidoSnap.data();

      // Si el pago es en efectivo, finalizar directamente
      if (pedidoData.metodoPago === 'Efectivo') {
        const user = auth.currentUser;
        const litrosEntregados = parseInt(pedidoData.litros || 0);
        const driverRef = doc(db, 'users', user.uid);
        const driverSnap = await getDoc(driverRef);
        const litrosEnTanque = driverSnap.data()?.litrosActuales || 0;
        const nuevosLitros = Math.max(0, litrosEnTanque - litrosEntregados);

        await updateDoc(driverRef, { litrosActuales: nuevosLitros });
        await updateDoc(pedidoRef, {
          estado: 'finalizado',
          fechaFinalizado: new Date().toISOString()
        });

        Alert.alert("¡Éxito!", `Pedido completado en efectivo. Te quedan ${nuevosLitros} Lts en el tanque.`);
        setDestinoRuta(null);
        setIsFullScreen(false);
        setPedidoActivoId(null);
        navigation.navigate('Conductor', { isOnline: true, pedidoCompletado: true });
        return;
      }

      // Para otros métodos de pago, esperar comprobante
      await updateDoc(pedidoRef, {
        estado: 'esperando_pago',
        fechaLlegada: new Date().toISOString()
      });
      setDestinoRuta(null);
      setIsFullScreen(false);
      navigation.navigate('WaitingPayment', { pedidoId: pedidoActivoId });
      setPedidoActivoId(null);
    } catch (error) {
      console.error(error);
    }
  };

  // ==============================================
  // ESTILOS DINÁMICOS SEGÚN ESTADO
  // ==============================================
  let statusColor = isOnline ? (litrosDisponibles <= 0 ? '#FF9800' : '#34C759') : '#d32f2f';
  let statusText = isOnline ? `EN SERVICIO (${litrosDisponibles} Lts restantes)` : 'FUERA DE SERVICIO';

  // ==============================================
  // INTERFAZ PRINCIPAL
  // ==============================================
  return (
    <SafeAreaView style={styles.container}>
      {/* Mapa: ocupa toda la pantalla si está en modo fullscreen */}
      <View style={[styles.mapContainer, isFullScreen && { flex: 1, maxHeight: '100%', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]}>
        {!location ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#e0e0e0', flexDirection: 'row' }}>
            <MaterialCommunityIcons name="truck-fast" size={28} color="#1976D2" style={{ marginRight: 10 }} />
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1976D2' }}>Conectando GPS...</Text>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            {/* Mapa Leaflet con ruta al destino */}
            <WebView
              originWhitelist={['*']}
              source={{ html: `
                <html>
                  <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                    <link rel="stylesheet" href="https://unpkg.com/leaflet-routing-machine@latest/dist/leaflet-routing-machine.css" />
                    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                    <script src="https://unpkg.com/leaflet-routing-machine@latest/dist/leaflet-routing-machine.js"></script>
                    <style> body { margin: 0; } #map { height: 100vh; width: 100vw; } .leaflet-routing-container { display: none; } </style>
                  </head>
                  <body>
                    <div id="map"></div>
                    <script>
                      var lat = ${location.latitude};
                      var lng = ${location.longitude};
                      var map = L.map('map').setView([lat, lng], 16);
                      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
                      L.marker([lat, lng]).addTo(map).bindPopup('Tu camión').openPopup();
                      if (${!!destinoRuta}) {
                        L.Routing.control({
                          waypoints: [L.latLng(lat, lng), L.latLng(${destinoRuta?.lat || 0}, ${destinoRuta?.lng || 0})],
                          lineOptions: { styles: [{ color: '#1976D2', weight: 6 }] },
                          addWaypoints: false, draggableWaypoints: false, routeWhileDragging: false
                        }).addTo(map);
                      }
                    </script>
                  </body>
                </html>
              `}}
              style={styles.map}
            />

            {/* Botón flotante: alternar pantalla completa */}
            <TouchableOpacity
              style={{
                position: 'absolute', top: 20, right: 20, backgroundColor: '#fff',
                padding: 10, borderRadius: 12, elevation: 5,
                shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3,
                borderWidth: 1, borderColor: '#eee'
              }}
              onPress={() => setIsFullScreen(!isFullScreen)}
            >
              <Ionicons name={isFullScreen ? "contract" : "expand"} size={24} color="#1976D2" />
            </TouchableOpacity>

            {/* Notificación de nuevo pedido entrante */}
            {mostrarNotificacion && (
              <TouchableOpacity
                style={{
                  position: 'absolute', top: 20, left: 20, right: 80, backgroundColor: '#fff',
                  padding: 15, borderRadius: 15, flexDirection: 'row', alignItems: 'center',
                  elevation: 10, borderLeftWidth: 5, borderLeftColor: '#1976D2'
                }}
                onPress={() => {
                  setMostrarNotificacion(false);
                  if (pedidoPendiente) {
                    navigation.navigate('IncomingOrder', {
                      pedidoId: pedidoPendiente.id,
                      pedidoData: pedidoPendiente.data
                    });
                    setPedidoPendiente(null);
                  }
                }}
              >
                <Ionicons name="water" size={38} color="#1976D2" style={{ marginRight: 15 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: 'bold', color: '#333', fontSize: 15 }}>¡Nuevo pedido disponible!</Text>
                  <Text style={{ color: '#666', fontSize: 13 }}>Toca para ver detalles...</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ color: '#1976D2', fontWeight: 'bold', marginRight: 5 }}>VER</Text>
                  <Ionicons name="arrow-forward" size={18} color="#1976D2" />
                </View>
              </TouchableOpacity>
            )}

            {/* Botón para confirmar llegada al destino */}
            {destinoRuta && pedidoActivoId && !mostrarNotificacion && (
              <TouchableOpacity
                style={{
                  position: 'absolute', bottom: 20, left: 20, right: 20, backgroundColor: '#34C759',
                  padding: 18, borderRadius: 15, alignItems: 'center', flexDirection: 'row',
                  justifyContent: 'center', elevation: 10, borderWidth: 2, borderColor: '#fff'
                }}
                onPress={handleConfirmarLlegada}
              >
                <Ionicons name="location-sharp" size={24} color="#fff" style={{ marginRight: 8 }} />
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>Confirmar Llegada</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Panel de control inferior (se oculta en pantalla completa) */}
      <View style={[styles.bottomPanel, isFullScreen && { display: 'none' }]}>
        <Text style={styles.titleHome}>Panel de Control</Text>

        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 5 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: statusColor, marginRight: 8 }} />
          <Text style={{ color: '#666', fontWeight: 'bold' }}>{statusText}</Text>
        </View>

        {/* Alerta de tanque vacío */}
        {isOnline && litrosDisponibles <= 0 && (
          <View style={{
            backgroundColor: '#ffebee', padding: 10, borderRadius: 10, marginBottom: 15,
            borderWidth: 1, borderColor: '#ffcdd2', flexDirection: 'column', alignItems: 'center'
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
              <Ionicons name="warning" size={20} color="#d32f2f" style={{ marginRight: 6 }} />
              <Text style={{ color: '#d32f2f', fontWeight: 'bold', textAlign: 'center' }}>¡Atención! Tanque Vacío</Text>
            </View>
            <Text style={{ color: '#d32f2f', fontSize: 12, textAlign: 'center' }}>
              No tienes litros suficientes. Por favor, detén tu jornada y dirígete al llenadero.
            </Text>
          </View>
        )}

        {/* Botones de acción */}
        <View style={{ flex: 1, justifyContent: 'center', paddingBottom: 10 }}>
          {!isOnline ? (
            <TouchableOpacity
              style={[styles.mainButton, { backgroundColor: '#1976D2', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
              onPress={() => navigation.navigate('ShiftMenu')}
            >
              <Text style={styles.mainButtonText}>Iniciar Jornada</Text>
              <Ionicons name="rocket" size={20} color="#fff" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.mainButton, { backgroundColor: '#d32f2f', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
              onPress={handleStopShift}
            >
              <Text style={styles.mainButtonText}>Detener Jornada</Text>
              <Ionicons name="stop-circle" size={22} color="#fff" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.mainButton, { backgroundColor: '#4CAF50', marginTop: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
            onPress={() => navigation.navigate('OrderList')}
          >
            <Text style={styles.mainButtonText}>Lista de Pedidos</Text>
            <Ionicons name="list" size={22} color="#fff" style={{ marginLeft: 8 }} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.mainButton, { backgroundColor: '#FF9800', marginTop: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
            onPress={() => navigation.navigate('DriverProfile')}
          >
            <Text style={styles.mainButtonText}>Mi Perfil</Text>
            <Ionicons name="person" size={20} color="#fff" style={{ marginLeft: 8 }} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.mainButton, { backgroundColor: '#f5f5f5', marginTop: 15, borderWidth: 1, borderColor: '#ddd', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
            onPress={() => navigation.replace('Login')}
          >
            <Text style={[styles.mainButtonText, { color: '#d32f2f' }]}>Cerrar Sesión</Text>
            <Ionicons name="log-out-outline" size={22} color="#d32f2f" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}