// screens/cliente/TrackingScreen.js
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ActivityIndicator, ScrollView, Alert, TextInput, Image } from 'react-native';
import Toast from 'react-native-toast-message';
import * as ImagePicker from 'expo-image-picker';
import { WebView } from 'react-native-webview'; 
import { styles } from '../../styles';

// --- IMPORTACIÓN DE ICONOS VECTORIALES ---
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

// IMPORTACIONES DE FIREBASE
import { db } from '../../firebase'; 
import { doc, onSnapshot, deleteDoc, updateDoc } from 'firebase/firestore';

export default function TrackingScreen({ navigation, route }) {
  const [pedido, setPedido] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  
  const [referenciaPago, setReferenciaPago] = useState('');
  const [comprobanteUri, setComprobanteUri] = useState(null);

  const pedidoId = route.params?.pedidoId;
  const webviewRef = useRef(null);

  useEffect(() => {
    if (!pedidoId) return;

    const unsubscribe = onSnapshot(doc(db, 'pedidos', pedidoId), (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        setPedido(data);
        if (data.estado === 'finalizado') {
            Toast.show({ type: 'success', text1: '¡Entrega Exitosa!', text2: 'Gracias por usar nuestro servicio.' });
        }
      } else {
        navigation.replace('Home');
      }
    });

    return () => unsubscribe();
  }, [pedidoId]);

  // --- CREACIÓN DEL MAPA ESTÁTICO INICIAL ---
  const mapHtml = useMemo(() => {
    if (!pedido || !pedido.destinoCoords) return '';
    
    const startLat = pedido.conductorCoords?.lat || 8.7562;
    const startLng = pedido.conductorCoords?.lng || -70.4074;
    const destLat = pedido.destinoCoords.lat;
    const destLng = pedido.destinoCoords.lng;

    return `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <style> 
            body { margin: 0; padding: 0; } 
            #map { height: 100vh; width: 100vw; }
            .truck-icon { font-size: 35px; text-align: center; }
            .dest-icon { font-size: 35px; text-align: center; }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            var map = L.map('map').setView([${startLat}, ${startLng}], 15);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

            var truckIcon = L.divIcon({html: '🚛', className: 'truck-icon', iconSize: [40, 40]});
            var destIcon = L.divIcon({html: '📍', className: 'dest-icon', iconSize: [40, 40]});

            var truckMarker = L.marker([${startLat}, ${startLng}], {icon: truckIcon}).addTo(map);
            var destMarker = L.marker([${destLat}, ${destLng}], {icon: destIcon}).addTo(map);

            var group = new L.featureGroup([truckMarker, destMarker]);
            map.fitBounds(group.getBounds(), {padding: [30, 30]});
          </script>
        </body>
      </html>
    `;
  }, [pedidoId, pedido?.destinoCoords]);

  // --- INYECCIÓN DE COORDENADAS EN VIVO ---
  useEffect(() => {
    if (webviewRef.current && pedido?.conductorCoords && pedido?.estado === 'en_camino') {
      const script = `
        if (typeof truckMarker !== 'undefined') {
          truckMarker.setLatLng([${pedido.conductorCoords.lat}, ${pedido.conductorCoords.lng}]);
        }
        true;
      `;
      webviewRef.current.injectJavaScript(script);
    }
  }, [pedido?.conductorCoords]);

  const handleCancel = () => {
    Alert.alert(
      "Cancelar Solicitud",
      "¿Estás seguro de que deseas cancelar esta orden?",
      [
        { text: "No", style: "cancel" },
        { 
          text: "Sí, cancelar", 
          style: "destructive", 
          onPress: async () => {
            setIsCancelling(true);
            try {
              await deleteDoc(doc(db, 'pedidos', pedidoId));
              navigation.replace('Home');
            } catch (error) {
              setIsCancelling(false);
              Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo cancelar.' });
            }
          }
        }
      ]
    );
  };

  const seleccionarComprobante = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.3, 
      base64: true, 
    });

    if (!result.canceled) {
      setComprobanteUri(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const confirmarPago = async () => {
    if (pedido.metodoPago !== 'Efectivo' && !referenciaPago && !comprobanteUri) {
      Toast.show({ type: 'error', text1: 'Faltan datos', text2: 'Ingresa referencia o sube comprobante.' });
      return;
    }

    setIsPaying(true);

    try {
      await updateDoc(doc(db, 'pedidos', pedidoId), {
        estado: 'pago_en_revision',
        referenciaFinal: referenciaPago || 'Efectivo/Sin texto',
        comprobanteUrl: comprobanteUri || null, 
        fechaPago: new Date().toISOString()
      });
      Toast.show({ type: 'success', text1: 'Pago Enviado ✅' });
    } catch (error) {
      console.error(error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'No pudimos enviar el pago.' });
    } finally {
      setIsPaying(false);
    }
  };

  if (!pedido) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#0069B4" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      
      <View style={{
        backgroundColor: pedido.estado === 'finalizado' ? '#34C759' : '#0069B4',
        height: 100, justifyContent: 'center', alignItems: 'center', borderBottomLeftRadius: 35, borderBottomRightRadius: 35
      }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#fff', marginTop: 15, textTransform: 'uppercase' }}>
          {pedido.estado === 'esperando_pago' ? '¡El Camión Llegó!' : 
           pedido.estado === 'pago_en_revision' ? 'Pago en Revisión' :
           pedido.estado === 'finalizado' ? 'Pedido Completado' : 'Rastreo'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20, alignItems: 'center' }} showsVerticalScrollIndicator={false}>
        
        {pedido.estado === 'buscando_conductor' && (
          <View style={{ alignItems: 'center', marginTop: 30 }}>
            <ActivityIndicator size="large" color="#0069B4" />
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginTop: 15 }}>Buscando camión...</Text>
            
            <TouchableOpacity style={{ marginTop: 20, padding: 10, flexDirection: 'row', alignItems: 'center' }} onPress={handleCancel}>
              <Ionicons name="close-circle" size={18} color="#FF3B30" style={{ marginRight: 5 }} />
              <Text style={{ color: '#FF3B30', fontWeight: 'bold' }}>Cancelar Solicitud</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* --- VISTA DE MAPA EN VIVO --- */}
        {pedido.estado === 'en_camino' && (
          <View style={{ width: '100%', alignItems: 'center' }}>
            <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#0069B4', marginBottom: 5 }}>¡El camión está en camino!</Text>
            <Text style={{ color: '#666', marginBottom: 20, fontWeight: 'bold' }}>Conductor: {pedido.conductorNombre}</Text>
            
            <View style={{ height: 350, width: '100%', borderRadius: 20, overflow: 'hidden', borderWidth: 3, borderColor: '#0069B4', elevation: 5 }}>
               <WebView 
                 ref={webviewRef}
                 originWhitelist={['*']} 
                 source={{ html: mapHtml }} 
                 style={{ flex: 1 }} 
                 scrollEnabled={false}
               />
            </View>

            <TouchableOpacity style={{ marginTop: 20, padding: 10, flexDirection: 'row', alignItems: 'center' }} onPress={handleCancel}>
              <Ionicons name="close-circle" size={18} color="#FF3B30" style={{ marginRight: 5 }} />
              <Text style={{ color: '#FF3B30', fontWeight: 'bold' }}>Cancelar Pedido</Text>
            </TouchableOpacity>
          </View>
        )}

        {pedido.estado === 'esperando_pago' && (
          <View style={{ width: '100%', alignItems: 'center' }}>
            <Ionicons name="cash-outline" size={60} color="#34C759" />
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginVertical: 10 }}>Procede al pago:</Text>
            
            <TextInput style={[styles.input, {width: '100%'}]} placeholder="N° de Referencia" value={referenciaPago} onChangeText={setReferenciaPago} keyboardType="numeric" />
            
            <TouchableOpacity style={{ backgroundColor: '#eee', padding: 15, borderRadius: 10, width: '100%', marginVertical: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }} onPress={seleccionarComprobante}>
              <Ionicons name={comprobanteUri ? "checkmark-circle" : "camera-outline"} size={20} color={comprobanteUri ? "#34C759" : "#666"} style={{ marginRight: 8 }} />
              <Text>{comprobanteUri ? 'Imagen cargada' : 'Subir Comprobante'}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.mainButton, { backgroundColor: '#34C759', width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]} onPress={confirmarPago} disabled={isPaying}>
              <Text style={styles.mainButtonText}>Reportar Pago</Text>
              <Ionicons name="send" size={18} color="#fff" style={{ marginLeft: 8 }} />
            </TouchableOpacity>

            <TouchableOpacity style={{ marginTop: 25, flexDirection: 'row', alignItems: 'center' }} onPress={handleCancel}>
              <Ionicons name="close-circle" size={18} color="#FF3B30" style={{ marginRight: 5 }} />
              <Text style={{ color: '#FF3B30', fontWeight: 'bold' }}>Cancelar Orden</Text>
            </TouchableOpacity>
          </View>
        )}

        {pedido.estado === 'pago_en_revision' && (
          <View style={{ alignItems: 'center', marginTop: 30 }}>
            <ActivityIndicator size="large" color="#FF9800" />
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#FF9800', marginTop: 15 }}>Verificando pago...</Text>
            <Text style={{ textAlign: 'center', color: '#666' }}>El conductor está validando tu reporte.</Text>

            <TouchableOpacity style={{ marginTop: 30, flexDirection: 'row', alignItems: 'center' }} onPress={handleCancel}>
              <Ionicons name="close-circle" size={18} color="#FF3B30" style={{ marginRight: 5 }} />
              <Text style={{ color: '#FF3B30', fontWeight: 'bold' }}>Cancelar Orden</Text>
            </TouchableOpacity>
          </View>
        )}

        {pedido.estado === 'finalizado' && (
          <View style={{ alignItems: 'center', marginTop: 30 }}>
            <MaterialCommunityIcons name="party-popper" size={80} color="#34C759" />
            <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#34C759', marginTop: 10 }}>¡Agua entregada!</Text>
            
            <TouchableOpacity style={[styles.mainButton, { marginTop: 30, width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]} onPress={() => navigation.replace('Home')}>
              <Text style={styles.mainButtonText}>Volver al Inicio</Text>
              <Ionicons name="home-outline" size={20} color="#fff" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          </View>
        )}

        {pedido.estado !== 'finalizado' && (
          <View style={[styles.infoCard, { borderLeftWidth: 5, borderLeftColor: '#0069B4', width: '100%', marginTop: 30 }]}>
            <Text style={{ fontWeight: 'bold', color: '#0069B4', marginBottom: 5 }}>Resumen:</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
               <Ionicons name="water" size={16} color="#666" style={{ marginRight: 5 }} />
               <Text>{pedido.litros} Lts</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
               <Ionicons name="location" size={16} color="#666" style={{ marginRight: 5 }} />
               <Text>{pedido.destinoTexto}</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}