// ================================================
// Pantalla: Seguimiento del Pedido (Cliente)
// Muestra el estado actual del pedido en tiempo real.
// Incluye mapa de rastreo, pago con comprobante,
// datos bancarios del conductor para transferir,
// y manejo de los distintos estados del pedido.
// Si el método de pago es "Efectivo", se omite
// la interfaz de pago y se espera la confirmación
// directa del conductor.
// ================================================

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, SafeAreaView, ActivityIndicator,
  ScrollView, Alert, TextInput, Clipboard
} from 'react-native';
import Toast from 'react-native-toast-message';
import * as ImagePicker from 'expo-image-picker';
import { WebView } from 'react-native-webview';
import { styles } from '../../styles';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

// Firebase Firestore
import { db } from '../../firebase';
import { doc, onSnapshot, deleteDoc, updateDoc, getDoc } from 'firebase/firestore';

export default function TrackingScreen({ navigation, route }) {
  // ==============================================
  // ESTADOS
  // ==============================================
  const [pedido, setPedido] = useState(null);
  const [datosPagoConductor, setDatosPagoConductor] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [referenciaPago, setReferenciaPago] = useState('');
  const [comprobanteUri, setComprobanteUri] = useState(null);

  const pedidoId = route.params?.pedidoId;
  const webviewRef = useRef(null);

  // ==============================================
  // EFECTO: Escuchar cambios del pedido en Firestore
  // ==============================================
  useEffect(() => {
    if (!pedidoId) return;

    const unsubscribe = onSnapshot(doc(db, 'pedidos', pedidoId), (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        setPedido(data);
        if (data.estado === 'finalizado') {
          Toast.show({ type: 'success', text1: '¡Entrega Exitosa!', text2: 'Gracias por usar nuestro servicio.' });
        }
        if (data.conductorId && (data.estado === 'en_camino' || data.estado === 'esperando_pago')) {
          obtenerDatosPagoConductor(data.conductorId);
        }
      } else {
        navigation.replace('Home');
      }
    });

    return () => unsubscribe();
  }, [pedidoId]);

  // ==============================================
  // Obtener datos bancarios del conductor
  // ==============================================
  const obtenerDatosPagoConductor = async (conductorId) => {
    try {
      const conductorSnap = await getDoc(doc(db, 'users', conductorId));
      if (conductorSnap.exists()) {
        const data = conductorSnap.data();
        setDatosPagoConductor({
          banco: data.banco || 'No especificado',
          telefono: data.telefonoPago || 'No especificado',
          cedula: data.cedula || 'No especificada',
          cuenta: data.cuentaBancaria || 'No especificada'
        });
      }
    } catch (error) {
      console.log('Error obteniendo datos del conductor:', error);
    }
  };

  // ==============================================
  // Copiar datos bancarios al portapapeles
  // ==============================================
  const copiarDatosBancarios = () => {
    if (!datosPagoConductor) return;
    const texto = `Banco: ${datosPagoConductor.banco}\nTeléfono: ${datosPagoConductor.telefono}\nCédula/RIF: ${datosPagoConductor.cedula}\nCuenta: ${datosPagoConductor.cuenta}`;
    Clipboard.setString(texto);
    Toast.show({ type: 'success', text1: 'Datos copiados', text2: 'Pégalos en tu aplicación bancaria.' });
  };

  // ==============================================
  // MAPA HTML CON LEAFLET E ICONOS SVG
  // ==============================================
  const mapHtml = useMemo(() => {
    if (!pedido || !pedido.destinoCoords) return '';

    const startLat = pedido.conductorCoords?.lat || 8.7562;
    const startLng = pedido.conductorCoords?.lng || -70.4074;
    const destLat = pedido.destinoCoords.lat;
    const destLng = pedido.destinoCoords.lng;

    const truckSvg = `<svg viewBox="0 0 640 512" style="width:100%; height:100%;"><path fill="#0069B4" d="M624 352h-16V243.9c0-12.7-5.1-24.9-14.1-33.9L494 110.1c-9-9-21.2-14.1-33.9-14.1H416V48c0-26.5-21.5-48-48-48H48C21.5 0 0 21.5 0 48v320c0 26.5 21.5 48 48 48h16c0 53 43 96 96 96s96-43 96-96h128c0 53 43 96 96 96s96-43 96-96h48c8.8 0 16-7.2 16-16v-32c0-8.8-7.2-16-16-16zM160 464c-26.5 0-48-21.5-48-48s21.5-48 48-48 48 21.5 48 48-21.5 48-48 48zm320 0c-26.5 0-48-21.5-48-48s21.5-48 48-48 48 21.5 48 48-21.5 48-48 48zm80-208H416V144h44.1l99.9 99.9V256z"/></svg>`;
    const pinSvg = `<svg viewBox="0 0 384 512" style="width:100%; height:100%;"><path fill="#FF3B30" d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67-9.535 13.774-29.93 13.773-39.464 0zM192 272c44.183 0 80-35.817 80-80s-35.817-80-80-80-80 35.817-80 80 35.817 80 80 80z"/></svg>`;

    return `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <style> body { margin: 0; padding: 0; } #map { height: 100vh; width: 100vw; } </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            var map = L.map('map').setView([${startLat}, ${startLng}], 15);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
            var truckIcon = L.divIcon({ html: '${truckSvg}', className: 'vector-icon-container', iconSize: [40, 40], iconAnchor: [20, 20] });
            var destIcon = L.divIcon({ html: '${pinSvg}', className: 'vector-icon-container', iconSize: [30, 40], iconAnchor: [15, 40] });
            var truckMarker = L.marker([${startLat}, ${startLng}], {icon: truckIcon}).addTo(map);
            var destMarker = L.marker([${destLat}, ${destLng}], {icon: destIcon}).addTo(map);
            var group = new L.featureGroup([truckMarker, destMarker]);
            map.fitBounds(group.getBounds(), {padding: [30, 30]});
          </script>
        </body>
      </html>
    `;
  }, [pedidoId, pedido?.destinoCoords]);

  // ==============================================
  // Actualizar marcador del camión en tiempo real
  // ==============================================
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

  // ==============================================
  // Cancelar el pedido actual
  // ==============================================
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

  // ==============================================
  // Seleccionar comprobante de pago desde galería
  // ==============================================
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

  // ==============================================
  // Confirmar y enviar reporte de pago
  // ==============================================
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

  // Indicador de carga mientras se obtiene el pedido
  if (!pedido) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#0069B4" />
      </SafeAreaView>
    );
  }

  // ==============================================
  // INTERFAZ PRINCIPAL
  // ==============================================
  return (
    <SafeAreaView style={styles.container}>
      {/* Cabecera con estado actual */}
      <View style={{
        backgroundColor: pedido.estado === 'finalizado' ? '#34C759' : '#0069B4',
        height: 90, justifyContent: 'center', alignItems: 'center',
        borderBottomLeftRadius: 35, borderBottomRightRadius: 35
      }}>
        <Text style={{
          fontSize: 18, fontWeight: 'bold', color: '#fff',
          marginTop: 15, textTransform: 'uppercase'
        }}>
          {pedido.estado === 'esperando_pago' ? '¡El Camión Llegó!' :
           pedido.estado === 'pago_en_revision' ? 'Pago en Revisión' :
           pedido.estado === 'finalizado' ? 'Pedido Completado' : 'Rastreo'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20, paddingBottom: 50, alignItems: 'center' }} showsVerticalScrollIndicator={false}>
        {/* Estado: Buscando conductor */}
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

        {/* Estado: Camión en camino (mapa en vivo) */}
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

        {/* Estado: Esperando pago */}
        {pedido.estado === 'esperando_pago' && (
          <View style={{ width: '100%', alignItems: 'center' }}>
            <Ionicons name="cash-outline" size={60} color="#34C759" />
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginVertical: 10 }}>Procede al pago:</Text>

            {/* Si es efectivo, ocultar interfaz de pago y solo esperar */}
            {pedido.metodoPago === 'Efectivo' ? (
              <View style={{ alignItems: 'center', marginTop: 20 }}>
                <ActivityIndicator size="large" color="#34C759" />
                <Text style={{ marginTop: 15, color: '#333', textAlign: 'center' }}>
                  El conductor te entregará el agua y recibirás el pago en efectivo.
                </Text>
                <Text style={{ marginTop: 10, color: '#666', textAlign: 'center' }}>
                  Espera al conductor para completar la entrega.
                </Text>
              </View>
            ) : (
              <>
                {/* Monto exacto a pagar */}
                {pedido.tarifaAplicada && (
                  <View style={{ backgroundColor: '#e8f5e9', padding: 15, borderRadius: 10, marginBottom: 20, alignItems: 'center', borderWidth: 1, borderColor: '#c8e6c9', width: '100%' }}>
                    <Text style={{ color: '#2e7d32', fontSize: 14, fontWeight: 'bold' }}>Monto exacto a transferir</Text>
                    <Text style={{ color: '#2e7d32', fontSize: 32, fontWeight: 'bold', marginTop: 5 }}>
                      ${pedido.tarifaAplicada}
                    </Text>
                    <Text style={{ color: '#4CAF50', fontSize: 12, marginTop: 5 }}>
                      Método acordado: {pedido.metodoPago}
                    </Text>
                  </View>
                )}

                {/* Datos bancarios del conductor */}
                {datosPagoConductor && (
                  <View style={{ backgroundColor: '#E3F2FD', padding: 15, borderRadius: 10, marginBottom: 20, width: '100%', borderWidth: 1, borderColor: '#90CAF9' }}>
                    <Text style={{ fontWeight: 'bold', color: '#1565C0', marginBottom: 10 }}>Datos para la transferencia:</Text>
                    <Text style={{ color: '#333', marginBottom: 4 }}>Banco: {datosPagoConductor.banco}</Text>
                    <Text style={{ color: '#333', marginBottom: 4 }}>Teléfono: {datosPagoConductor.telefono}</Text>
                    <Text style={{ color: '#333', marginBottom: 4 }}>Cédula/RIF: {datosPagoConductor.cedula}</Text>
                    <Text style={{ color: '#333', marginBottom: 10 }}>Cuenta: {datosPagoConductor.cuenta}</Text>
                    <TouchableOpacity
                      style={{ backgroundColor: '#1565C0', padding: 10, borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}
                      onPress={copiarDatosBancarios}
                    >
                      <Ionicons name="copy-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                      <Text style={{ color: '#fff', fontWeight: 'bold' }}>Copiar datos</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <TextInput style={[styles.input, { width: '100%' }]} placeholder="N° de Referencia" value={referenciaPago} onChangeText={setReferenciaPago} keyboardType="numeric" />

                <TouchableOpacity style={{ backgroundColor: '#eee', padding: 15, borderRadius: 10, width: '100%', marginVertical: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }} onPress={seleccionarComprobante}>
                  <Ionicons name={comprobanteUri ? "checkmark-circle" : "camera-outline"} size={20} color={comprobanteUri ? "#34C759" : "#666"} style={{ marginRight: 8 }} />
                  <Text>{comprobanteUri ? 'Imagen cargada' : 'Subir Comprobante'}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.mainButton, { backgroundColor: '#34C759', width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]} onPress={confirmarPago} disabled={isPaying}>
                  <Text style={styles.mainButtonText}>Reportar Pago</Text>
                  <Ionicons name="send" size={18} color="#fff" style={{ marginLeft: 8 }} />
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity style={{ marginTop: 25, flexDirection: 'row', alignItems: 'center' }} onPress={handleCancel}>
              <Ionicons name="close-circle" size={18} color="#FF3B30" style={{ marginRight: 5 }} />
              <Text style={{ color: '#FF3B30', fontWeight: 'bold' }}>Cancelar Orden</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Estado: Pago en revisión */}
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

        {/* Estado: Pedido finalizado */}
        {pedido.estado === 'finalizado' && (
          <View style={{ alignItems: 'center', marginTop: 30 }}>
            <MaterialCommunityIcons name="party-popper" size={80} color="#34C759" />
            <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#34C759', marginTop: 10 }}>¡Agua entregada!</Text>
            <TouchableOpacity style={[styles.mainButton, { marginTop: 30, width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]} onPress={() => navigation.replace('Home')}>
              <Text style={[styles.mainButtonText, { textAlign: 'center' }]}>Volver al Inicio</Text>
              <Ionicons name="home-outline" size={20} color="#fff" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          </View>
        )}

        {/* Resumen del pedido (si no ha finalizado) */}
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

            {/* Tarifa visible al inicio del pedido */}
            {pedido.tarifaAplicada && (pedido.estado === 'en_camino' || pedido.estado === 'recibido') && (
              <View style={[styles.infoCard, { borderLeftWidth: 5, borderLeftColor: '#34C759', backgroundColor: '#E8F5E9', width: '100%', marginTop: 15 }]}>
                <Text style={{ fontWeight: 'bold', color: '#1B5E20', marginBottom: 5 }}>Monto Total a Pagar:</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="cash-outline" size={22} color="#1B5E20" style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#1B5E20' }}>{pedido.tarifaAplicada} $</Text>
                </View>
                <Text style={{ fontSize: 12, color: '#2E7D32', marginTop: 4 }}>
                  Por favor, prepare su método de pago seleccionado.
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}