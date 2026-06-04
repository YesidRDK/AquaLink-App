// screens/cliente/RequestScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import Toast from 'react-native-toast-message';
import { styles } from '../../styles';

// --- IMPORTACIÓN DE ICONOS VECTORIALES ---
import { Ionicons } from '@expo/vector-icons';

// IMPORTACIONES DE FIREBASE
import { auth, db } from '../../firebase';
import { collection, addDoc, doc, getDoc, serverTimestamp, query, where, onSnapshot, deleteDoc } from 'firebase/firestore';

export default function RequestScreen({ navigation, route }) {
  // Estados para los Litros
  const [liters, setLiters] = useState('5000');
  const [modoLitros, setModoLitros] = useState('predeterminado');
  const [showDropdown, setShowDropdown] = useState(false); // Controla el menú desplegable

  const [payment, setPayment] = useState('Pago Móvil');
  const [modoUbicacion, setModoUbicacion] = useState('predeterminada');
  const [manualCoords, setManualCoords] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [referencia, setReferencia] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [userData, setUserData] = useState(null);
  const [pedidoActivo, setPedidoActivo] = useState(null);
  const [isCheckingOrder, setIsCheckingOrder] = useState(true);

  // 1. Radar mejorado: Solo toma la orden activa más reciente
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setIsCheckingOrder(false);
      return;
    }

    const q = query(
      collection(db, 'pedidos'),
      where('clienteId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let activeOrders = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.estado !== 'finalizado') {
          activeOrders.push({ id: docSnap.id, ...data });
        }
      });

      if (activeOrders.length > 0) {
        // Ordenar por fecha descendente
        activeOrders.sort((a, b) => {
          const dA = a.fecha?.toMillis ? a.fecha.toMillis() : 0;
          const dB = b.fecha?.toMillis ? b.fecha.toMillis() : 0;
          return dB - dA;
        });
        setPedidoActivo(activeOrders[0]);
      } else {
        setPedidoActivo(null);
      }
      setIsCheckingOrder(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          let pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        } else {
          setCurrentLocation({ lat: 8.7562, lng: -70.4074 });
        }
      } catch (error) {
        setCurrentLocation({ lat: 8.7562, lng: -70.4074 });
      }

      try {
        const user = auth.currentUser;
        if (user) {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) setUserData(userDoc.data());
        }
      } catch (error) { console.log(error); }
    })();
  }, []);

  useEffect(() => {
    if (route.params?.ubicacionSeleccionada) {
      setManualCoords(route.params.ubicacionSeleccionada);
      setModoUbicacion('manual');
    }
  }, [route.params?.ubicacionSeleccionada]);

  const handleCancelOrder = () => {
    if (!pedidoActivo) return;
    Alert.alert(
      "Cancelar Orden",
      "¿Estás seguro de que deseas cancelar tu pedido actual?",
      [
        { text: "No, mantener", style: "cancel" },
        { 
          text: "Sí, cancelar", 
          style: "destructive", 
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'pedidos', pedidoActivo.id));
              Toast.show({ type: 'info', text1: 'Orden cancelada' });
            } catch (error) {
              Alert.alert("Error", "No se pudo cancelar la orden.");
            }
          }
        }
      ]
    );
  };

  const handleOrder = async () => {
    if (pedidoActivo) {
      Toast.show({ type: 'error', text1: 'Orden en curso', text2: 'Ya tienes un pedido activo.' });
      return;
    }

    setIsLoading(true);

    // --- VALIDACIÓN DE LITROS ---
    if (!liters || isNaN(liters) || parseInt(liters) <= 0) {
      Toast.show({ type: 'error', text1: 'Error en Litros', text2: 'Por favor ingresa una cantidad válida.' });
      setIsLoading(false);
      return;
    }

    try {
      const user = auth.currentUser;
      let destinoCoords = null;
      let destinoTexto = '';

      if (modoUbicacion === 'predeterminada') {
        if (!userData || !userData.coordsResidencia) {
          Toast.show({ type: 'error', text1: 'Error', text2: 'No tienes dirección GPS.' });
          setIsLoading(false); return;
        }
        destinoCoords = userData.coordsResidencia;
        destinoTexto = userData.residencia || 'Dirección de perfil';
      } else {
        if (!manualCoords) {
          Toast.show({ type: 'error', text1: 'Error', text2: 'Selecciona un punto en el mapa.' });
          setIsLoading(false); return;
        }
        destinoCoords = manualCoords;
        destinoTexto = 'Ubicación marcada manualmente';
      }

      const nuevoPedido = {
        clienteId: user.uid,
        clienteNombre: userData?.username || 'Cliente',
        litros: liters, 
        metodoPago: payment,
        referencia: referencia || '',
        destinoCoords: destinoCoords,
        destinoTexto: destinoTexto,
        estado: 'buscando_conductor', 
        fecha: serverTimestamp(), 
      };

      const docRef = await addDoc(collection(db, 'pedidos'), nuevoPedido);
      Toast.show({ type: 'success', text1: '¡Pedido Confirmado!' });
      setIsLoading(false);
      navigation.replace('Tracking', { pedidoId: docRef.id });
    } catch (error) {
      setIsLoading(false);
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo enviar tu solicitud.' });
    }
  };

  if (isCheckingOrder) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0069B4" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={{
        backgroundColor: '#0069B4', height: 90, justifyContent: 'center', alignItems: 'center',
        borderBottomLeftRadius: 35, borderBottomRightRadius: 35, elevation: 10
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 15 }}>
          <Ionicons name={pedidoActivo ? "time-outline" : "water-outline"} size={24} color="#fff" style={{ marginRight: 8 }} />
          <Text style={{ fontSize: 19, fontWeight: 'bold', color: '#fff', textTransform: 'uppercase' }}>
            {pedidoActivo ? 'Orden en Curso' : 'Solicitar Camión'}
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, padding: 20 }}>
        
        {pedidoActivo ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 }}>
            <Ionicons name="hourglass-outline" size={80} color="#0069B4" style={{ marginBottom: 20 }} />
            <Text style={{ fontSize: 22, fontWeight: 'bold', textAlign: 'center', color: '#333' }}>
              Ya tienes una solicitud activa
            </Text>
            <Text style={{ textAlign: 'center', color: '#666', marginTop: 10, marginBottom: 30 }}>
              Termina o cancela tu pedido de {pedidoActivo.litros} Lts antes de hacer uno nuevo.
            </Text>

            <TouchableOpacity 
              style={[styles.mainButton, { width: '100%', backgroundColor: '#0069B4', marginBottom: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
              onPress={() => navigation.navigate('Tracking', { pedidoId: pedidoActivo.id })}
            >
              <Text style={styles.mainButtonText}>Ver Seguimiento</Text>
              <Ionicons name="map-outline" size={20} color="#fff" style={{ marginLeft: 8 }} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.mainButton, { width: '100%', backgroundColor: '#fff', borderWidth: 2, borderColor: '#FF3B30', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
              onPress={handleCancelOrder}
            >
              <Text style={[styles.mainButtonText, { color: '#FF3B30' }]}>Cancelar Orden</Text>
              <Ionicons name="close-circle-outline" size={20} color="#FF3B30" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <Text style={styles.sectionTitle}>1. ¿A dónde enviamos el agua?</Text>
            <View style={styles.tabContainer}>
                <TouchableOpacity 
                  style={[styles.tabButton, modoUbicacion === 'predeterminada' && styles.tabButtonActive, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]} 
                  onPress={() => setModoUbicacion('predeterminada')}
                >
                  <Ionicons name="home" size={16} color={modoUbicacion === 'predeterminada' ? '#fff' : '#0069B4'} style={{ marginRight: 6 }} />
                  <Text style={[styles.tabText, modoUbicacion === 'predeterminada' && styles.tabTextActive]}>Mi Casa</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.tabButton, modoUbicacion === 'manual' && styles.tabButtonActive, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]} 
                  onPress={() => navigation.navigate('MapPicker', { origen: 'Request' })}
                >
                  <Ionicons name="map" size={16} color={modoUbicacion === 'manual' ? '#fff' : '#0069B4'} style={{ marginRight: 6 }} />
                  <Text style={[styles.tabText, modoUbicacion === 'manual' && styles.tabTextActive]}>Mapa</Text>
                </TouchableOpacity>
            </View>

            {modoUbicacion === 'predeterminada' ? (
              <View style={styles.infoBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="location" size={20} color="#0069B4" style={{ marginRight: 8 }} />
                  <Text style={[styles.direccionDato, { flex: 1 }]}>{userData ? userData.residencia : "Cargando..."}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.miniMapaContainer}>
                {currentLocation && <WebView originWhitelist={['*']} source={{ html: `<html><body><div id="map" style="height:100vh"></div><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" /><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>var map = L.map('map').setView([${manualCoords?.lat || currentLocation.lat}, ${manualCoords?.lng || currentLocation.lng}], 16); L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map); L.marker([${manualCoords?.lat || currentLocation.lat}, ${manualCoords?.lng || currentLocation.lng}]).addTo(map);</script></body></html>`}} style={{ flex: 1 }} />}
              </View>
            )}

            <Text style={[styles.sectionTitle, {marginTop: 20}]}>Punto de Referencia (Opcional)</Text>
            <TextInput style={styles.input} placeholder="Ej: Casa azul..." value={referencia} onChangeText={setReferencia} />

            {/* --- SECCIÓN DE LITROS --- */}
            <Text style={[styles.sectionTitle, {marginTop: 20}]}>2. ¿Cuántos Litros necesitas?</Text>
            <View style={styles.tabContainer}>
                <TouchableOpacity 
                  style={[styles.tabButton, modoLitros === 'predeterminado' && styles.tabButtonActive]} 
                  onPress={() => { setModoLitros('predeterminado'); setLiters('5000'); setShowDropdown(false); }}
                >
                  <Text style={[styles.tabText, modoLitros === 'predeterminado' && styles.tabTextActive]}>Predeterminado</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.tabButton, modoLitros === 'manual' && styles.tabButtonActive]} 
                  onPress={() => { setModoLitros('manual'); setLiters(''); setShowDropdown(false); }}
                >
                  <Text style={[styles.tabText, modoLitros === 'manual' && styles.tabTextActive]}>Ingresar manual</Text>
                </TouchableOpacity>
            </View>

            {modoLitros === 'predeterminado' ? (
              <View style={{ marginTop: 10, position: 'relative', zIndex: 10 }}>
                 <TouchableOpacity
                   style={[styles.input, { justifyContent: 'center', backgroundColor: '#fff' }]}
                   onPress={() => setShowDropdown(!showDropdown)}
                 >
                   <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                     <Text style={{ fontSize: 16, color: '#333', marginRight: 5 }}>{liters} Lts</Text>
                     <Ionicons name={showDropdown ? "chevron-up" : "chevron-down"} size={18} color="#333" />
                   </View>
                 </TouchableOpacity>

                 {/* Menú Desplegable */}
                 {showDropdown && (
                   <View style={{ backgroundColor: '#fff', borderRadius: 10, elevation: 4, marginTop: 5, overflow: 'hidden', borderWidth: 1, borderColor: '#eee' }}>
                     {['1000', '5000', '10000'].map((val) => (
                       <TouchableOpacity
                         key={val}
                         style={{ padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee', backgroundColor: liters === val ? '#e3f2fd' : '#fff' }}
                         onPress={() => {
                           setLiters(val);
                           setShowDropdown(false);
                         }}
                       >
                         <Text style={{ fontSize: 16, color: liters === val ? '#0069B4' : '#333', fontWeight: liters === val ? 'bold' : 'normal', textAlign: 'center' }}>
                           {val} Litros
                         </Text>
                       </TouchableOpacity>
                     ))}
                   </View>
                 )}
              </View>
            ) : (
              <View style={{ marginTop: 10 }}>
                <TextInput
                  style={styles.input}
                  placeholder="Ej. 2500"
                  keyboardType="numeric"
                  value={liters}
                  onChangeText={setLiters}
                />
              </View>
            )}

            <Text style={[styles.sectionTitle, {marginTop: 20}]}>3. Método de Pago</Text>
            <View style={styles.optionsGrid}>
              {['Pago Móvil', 'Efectivo', 'Transferencia'].map((item) => (
                <TouchableOpacity key={item} style={[styles.optionButton, { flex: 1, minWidth: '40%', marginBottom: 10 }, payment === item && styles.optionButtonActive]} onPress={() => setPayment(item)}>
                  <Text style={[styles.optionText, payment === item && styles.optionTextActive]}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity 
              style={[styles.mainButton, { marginTop: 30, marginBottom: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }, isLoading && { backgroundColor: '#888' }]} 
              onPress={handleOrder} 
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.mainButtonText}>Confirmar Pedido</Text>
                  <Ionicons name="rocket-outline" size={20} color="#fff" style={{ marginLeft: 8 }} />
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}