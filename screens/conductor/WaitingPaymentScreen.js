// ================================================
// Pantalla: Verificación de Pago (Conductor)
// Permite al conductor revisar el comprobante de
// pago enviado por el cliente. Puede aprobar o
// rechazar el pago. Al aprobar, descuenta los
// litros entregados del tanque y finaliza el pedido.
// ================================================

import React, { useState, useEffect } from 'react';
import {
  View, Text, SafeAreaView, ActivityIndicator,
  TouchableOpacity, ScrollView, Image, Alert
} from 'react-native';
import { styles } from '../../styles';
import { auth, db } from '../../firebase';
import { doc, onSnapshot, updateDoc, getDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

export default function WaitingPaymentScreen({ navigation, route }) {
  const { pedidoId } = route.params || {};
  const [pedido, setPedido] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // ==============================================
  // Escuchar cambios del pedido en tiempo real
  // ==============================================
  useEffect(() => {
    if (!pedidoId) return;
    const unsubscribe = onSnapshot(doc(db, 'pedidos', pedidoId), (docSnapshot) => {
      if (docSnapshot.exists()) setPedido(docSnapshot.data());
    });
    return () => unsubscribe();
  }, [pedidoId]);

  // ==============================================
  // Aprobar o rechazar el pago del cliente
  // Si es aprobado, descuenta litros del tanque
  // y finaliza el pedido.
  // ==============================================
  const responderPago = async (esCorrecto) => {
    setIsProcessing(true);
    try {
      const user = auth.currentUser;
      const pedidoRef = doc(db, 'pedidos', pedidoId);

      if (esCorrecto) {
        // Restar litros entregados del tanque del conductor
        const litrosEntregados = parseInt(pedido.litros || 0);
        const driverRef = doc(db, 'users', user.uid);
        const driverSnap = await getDoc(driverRef);
        const litrosEnTanque = driverSnap.data()?.litrosActuales || 0;
        const nuevosLitros = Math.max(0, litrosEnTanque - litrosEntregados);

        await updateDoc(driverRef, { litrosActuales: nuevosLitros });

        // Finalizar el pedido
        await updateDoc(pedidoRef, {
          estado: 'finalizado',
          fechaFinalizado: new Date().toISOString()
        });

        Alert.alert("¡Éxito!", `Pedido completado. Te quedan ${nuevosLitros} Lts en el tanque.`);
        navigation.replace('Conductor', { isOnline: true, pedidoCompletado: true });
      } else {
        // Rechazar el pago y devolver al cliente a la pantalla de pago
        await updateDoc(pedidoRef, {
          estado: 'esperando_pago',
          notaError: 'El conductor rechazó el comprobante. Verifícalo e intenta de nuevo.'
        });
        Alert.alert("Rechazado", "Se le ha notificado al cliente que el pago no es válido.");
      }
    } catch (error) {
      console.error(error);
      alert("Error al procesar la respuesta.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Indicador de carga
  if (!pedido) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#1976D2" />
      </SafeAreaView>
    );
  }

  // ==============================================
  // INTERFAZ DE USUARIO
  // ==============================================
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20, paddingBottom: 60 }}>
        {/* Cabecera con icono según estado */}
        <View style={{ alignItems: 'center', marginVertical: 20 }}>
          {pedido.estado === 'pago_en_revision' ? (
            <Ionicons name="search-circle" size={80} color="#1976D2" />
          ) : (
            <Ionicons name="hourglass-outline" size={70} color="#1976D2" />
          )}
          <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#1976D2', textAlign: 'center', marginTop: 10 }}>
            {pedido.estado === 'pago_en_revision' ? 'Verificar Pago' : 'Esperando al Cliente'}
          </Text>
        </View>

        {pedido.estado === 'esperando_pago' ? (
          /* Estado: Esperando que el cliente reporte el pago */
          <View style={{ alignItems: 'center', backgroundColor: '#fff', padding: 25, borderRadius: 20, elevation: 3 }}>
            <ActivityIndicator size="large" color="#34C759" style={{ marginBottom: 20 }} />
            <Text style={{ textAlign: 'center', color: '#666', fontSize: 16 }}>
              El cliente está procesando el pago de los <Text style={{ fontWeight: 'bold' }}>{pedido.litros} Litros</Text>.
            </Text>
            <Text style={{ textAlign: 'center', color: '#666', marginTop: 10 }}>
              Esta pantalla cambiará sola cuando el cliente envíe el reporte.
            </Text>
          </View>
        ) : (
          /* Estado: Revisando comprobante de pago */
          <View>
            <View style={{ backgroundColor: '#fff', padding: 20, borderRadius: 20, elevation: 3, marginBottom: 20 }}>
              <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#333', marginBottom: 15 }}>
                Información enviada por el cliente:
              </Text>

              <View style={{ marginBottom: 15 }}>
                <Text style={{ color: '#888', fontSize: 12 }}>MÉTODO DE PAGO</Text>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1976D2' }}>{pedido.metodoPago}</Text>
              </View>

              <View style={{ marginBottom: 15 }}>
                <Text style={{ color: '#888', fontSize: 12 }}>NÚMERO DE REFERENCIA</Text>
                <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{pedido.referenciaFinal || 'No indicada'}</Text>
              </View>

              {/* Imagen del comprobante (si fue enviada) */}
              {pedido.comprobanteUrl && (
                <View style={{ marginTop: 15 }}>
                  <Text style={{ color: '#888', fontSize: 12, marginBottom: 5 }}>CAPTURA DE PANTALLA</Text>
                  <Image
                    source={{ uri: pedido.comprobanteUrl }}
                    style={{ width: '100%', height: 350, borderRadius: 10, resizeMode: 'contain', backgroundColor: '#f0f0f0' }}
                    onLoadStart={() => <ActivityIndicator size="small" color="#1976D2" />}
                  />
                </View>
              )}
            </View>

            {/* Botones de decisión: Correcto / Incorrecto */}
            <View style={{ flexDirection: 'row', gap: 15 }}>
              <TouchableOpacity
                style={[styles.mainButton, { flex: 1, backgroundColor: '#FF3B30', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
                onPress={() => responderPago(false)}
                disabled={isProcessing}
              >
                <Ionicons name="close-circle-outline" size={20} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.mainButtonText}>Incorrecto</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.mainButton, { flex: 1, backgroundColor: '#34C759', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
                onPress={() => responderPago(true)}
                disabled={isProcessing}
              >
                <Text style={styles.mainButtonText}>Correcto</Text>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}