// screens/conductor/WaitingPaymentScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, ActivityIndicator, TouchableOpacity, ScrollView, Image, Alert } from 'react-native';
import { styles } from '../../styles';
import { auth, db } from '../../firebase'; // Importamos auth para saber quién es el conductor
import { doc, onSnapshot, updateDoc, getDoc } from 'firebase/firestore'; // Agregamos getDoc

// --- IMPORTACIÓN DE ICONOS VECTORIALES ---
import { Ionicons } from '@expo/vector-icons';

export default function WaitingPaymentScreen({ navigation, route }) {
  const { pedidoId } = route.params || {};
  const [pedido, setPedido] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // 1. Escuchar el pedido en tiempo real
  useEffect(() => {
    if (!pedidoId) return;

    const unsubscribe = onSnapshot(doc(db, 'pedidos', pedidoId), (docSnapshot) => {
      if (docSnapshot.exists()) {
        setPedido(docSnapshot.data());
      }
    });

    return () => unsubscribe();
  }, [pedidoId]);

  // 2. Función para decidir si el pago es válido o no (AHORA CON RESTA DE LITROS)
  const responderPago = async (esCorrecto) => {
    setIsProcessing(true);
    try {
      const user = auth.currentUser;
      const pedidoRef = doc(db, 'pedidos', pedidoId);
      
      if (esCorrecto) {
        // --- INICIO DE LA LÓGICA DE RESTA DE AGUA ---
        // 1. Extraer los litros de este pedido
        const litrosEntregados = parseInt(pedido.litros || 0);
        
        // 2. Consultar el tanque actual del conductor
        const driverRef = doc(db, 'users', user.uid);
        const driverSnap = await getDoc(driverRef);
        const litrosEnTanque = driverSnap.data()?.litrosActuales || 0;
        
        // 3. Restar matemáticamente (evitando que dé números negativos por error)
        const nuevosLitros = Math.max(0, litrosEnTanque - litrosEntregados);

        // 4. Guardar los nuevos litros en el perfil del conductor
        await updateDoc(driverRef, {
          litrosActuales: nuevosLitros
        });
        // --- FIN DE LA LÓGICA DE RESTA DE AGUA ---

        // Si el pago es correcto, finalizamos el pedido
        await updateDoc(pedidoRef, {
          estado: 'finalizado',
          fechaFinalizado: new Date().toISOString()
        });
        
        Alert.alert("¡Éxito!", `Pedido completado. Te quedan ${nuevosLitros} Lts en el tanque.`);
        
        // --- CORRECCIÓN AQUÍ: Volvemos manteniendo la jornada activa ---
        navigation.replace('Conductor', { 
          isOnline: true, 
          pedidoCompletado: true 
        }); 
      } else {
        // Si es incorrecto, lo devolvemos a la pantalla de pago al cliente
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

  if (!pedido) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#1976D2" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20 }}>
        
        {/* --- CABECERA CON ICONOS VECTORIALES --- */}
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
          /* VISTA 1: ESPERANDO */
          <View style={{ alignItems: 'center', backgroundColor: '#fff', padding: 25, borderRadius: 20, elevation: 3 }}>
            <ActivityIndicator size="large" color="#34C759" style={{ marginBottom: 20 }} />
            <Text style={{ textAlign: 'center', color: '#666', fontSize: 16 }}>
              El cliente está procesando el pago de los <Text style={{fontWeight:'bold'}}>{pedido.litros} Litros</Text>.
            </Text>
            <Text style={{ textAlign: 'center', color: '#666', marginTop: 10 }}>
              Esta pantalla cambiará sola cuando el cliente envíe el reporte.
            </Text>
          </View>
        ) : (
          /* VISTA 2: REVISANDO PAGO REAL */
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

            {pedido.comprobanteUrl && (
                <View style={{ marginTop: 15 }}>
                  <Text style={{ color: '#888', fontSize: 12, marginBottom: 5 }}>CAPTURA DE PANTALLA (INTERNET)</Text>
                  <Image 
                    source={{ uri: pedido.comprobanteUrl }}
                    style={{ width: '100%', height: 350, borderRadius: 10, resizeMode: 'contain', backgroundColor: '#f0f0f0' }} 
                    onLoadStart={() => <ActivityIndicator size="small" color="#1976D2" />}
                  />
                </View>
              )}
            </View>

            {/* BOTONES DE DECISIÓN ESTILIZADOS */}
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