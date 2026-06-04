// screens/conductor/IncomingOrderScreen.js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { styles } from '../../styles';
import { auth, db } from '../../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

// --- IMPORTACIÓN DE ICONOS VECTORIALES ---
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function IncomingOrderScreen({ navigation, route }) {
  const [paso, setPaso] = useState(1); 
  const [rangoSeleccionado, setRangoSeleccionado] = useState(null);
  
  const pedidoData = route.params?.pedidoData || {};
  const pedidoId = route.params?.pedidoId || "";

  const pedidoReal = {
    cliente: pedidoData?.clienteNombre || "Cliente",
    litros: pedidoData?.litros || "---",
    pago: pedidoData?.metodoPago || "---",
    ubicacion: pedidoData?.destinoTexto || "Ubicación no disponible",
    tipoUbicacion: pedidoData?.referencia ? "Con Referencia" : "GPS"
  };

  const rangosHorarios = [
    "Entre 8:00 AM - 12:00 PM",
    "Entre 12:00 PM - 4:00 PM",
    "Entre 4:00 PM - 8:00 PM",
    "Lo antes posible (30-60 min)"
  ];

  const handleConfirmarHorario = async () => {
    if (!rangoSeleccionado) {
      alert("Por favor, selecciona un rango de tiempo.");
      return;
    }
    
    try {
      const user = auth.currentUser;
      if (!user) return;

      const driverDoc = await getDoc(doc(db, 'users', user.uid));
      const driverData = driverDoc.data();

      const pedidoRef = doc(db, 'pedidos', pedidoId);
      await updateDoc(pedidoRef, {
        estado: 'en_camino',
        conductorId: user.uid,
        conductorNombre: driverData.username || 'Conductor asignado',
        conductorPlaca: driverData.matriculas || 'Particular', 
        rangoLlegada: rangoSeleccionado,
        fechaAceptado: new Date().toISOString()
      });

      alert(`¡Pedido Confirmado! ✅\nEl cliente será notificado que llegarás ${rangoSeleccionado}.`);
      
      // Enviamos la señal de aceptado y las coordenadas del destino al mapa
      navigation.replace('Conductor', { 
        nuevoPedidoAceptado: true, 
        isOnline: true,
        destinoCoords: pedidoData?.destinoCoords,
        pedidoIdActivo: pedidoId
      });
      
    } catch (error) {
      console.error("Error al aceptar pedido:", error);
      alert("Hubo un error al procesar el pedido.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* CABECERA CON ICONOS VECTORIALES */}
      <View style={{
        backgroundColor: paso === 1 ? '#1976D2' : '#34C759',
        height: 90,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 30,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        elevation: 5
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {paso === 1 ? (
            <Ionicons name="notifications-circle" size={32} color="#fff" style={{ marginRight: 8 }} />
          ) : (
            <Ionicons name="time-outline" size={30} color="#fff" style={{ marginRight: 8 }} />
          )}
          <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#fff', textAlign: 'center' }}>
            {paso === 1 ? "¡NUEVO PEDIDO!" : "¿A qué hora llegarás?"}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 25 }}>
        {paso === 1 ? (
          <View>
            <View style={[styles.pedidoCard, { paddingVertical: 25 }]}>
              <Text style={[styles.sectionTitle, { color: '#1976D2', textAlign: 'center', marginBottom: 20 }]}>
                Resumen de Solicitud
              </Text>
              
              {/* FILAS DE INFORMACIÓN ACTUALIZADAS */}
              <View style={styles.infoRow}>
                <View style={{ width: 40, alignItems: 'center' }}>
                  <Ionicons name="person-outline" size={24} color="#1976D2" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Cliente</Text>
                  <Text style={styles.infoValue}>{pedidoReal.cliente}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={{ width: 40, alignItems: 'center' }}>
                  <Ionicons name="water-outline" size={24} color="#1976D2" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Cantidad</Text>
                  <Text style={styles.infoValue}>{pedidoReal.litros} Litros</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={{ width: 40, alignItems: 'center' }}>
                  <Ionicons name="cash-outline" size={24} color="#1976D2" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Método de Pago</Text>
                  <Text style={styles.infoValue}>{pedidoReal.pago}</Text>
                </View>
              </View>

              <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                <View style={{ width: 40, alignItems: 'center' }}>
                  <Ionicons name="location-outline" size={24} color="#1976D2" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Dirección ({pedidoReal.tipoUbicacion})</Text>
                  <Text style={styles.infoValue}>{pedidoReal.ubicacion}</Text>
                </View>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 15, marginTop: 30 }}>
              <TouchableOpacity 
                style={[styles.mainButton, { flex: 1, backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#ddd', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]} 
                onPress={() => navigation.navigate('Conductor', { pedidoRechazado: pedidoId })}
              >
                <Ionicons name="close" size={20} color="#d32f2f" style={{ marginRight: 5 }} />
                <Text style={[styles.mainButtonText, { color: '#d32f2f' }]}>Rechazar</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.mainButton, { flex: 1, backgroundColor: '#34C759', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]} 
                onPress={() => setPaso(2)}
              >
                <Text style={styles.mainButtonText}>Aceptar</Text>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" style={{ marginLeft: 5 }} />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View>
            <Text style={[styles.sectionSubtitle, { textAlign: 'center', fontSize: 16, marginBottom: 25 }]}>
              Selecciona el rango de tiempo estimado de entrega:
            </Text>
            
            {rangosHorarios.map((rango, index) => (
              <TouchableOpacity 
                key={index} 
                style={[
                  styles.optionButton, 
                  { marginBottom: 15, paddingVertical: 20, borderRadius: 15, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15 },
                  rangoSeleccionado === rango && styles.optionButtonActive
                ]}
                onPress={() => setRangoSeleccionado(rango)}
              >
                <Ionicons 
                  name={rangoSeleccionado === rango ? "radio-button-on" : "radio-button-off"} 
                  size={24} 
                  color={rangoSeleccionado === rango ? "#1976D2" : "#999"} 
                  style={{ marginRight: 10 }}
                />
                <Text style={[
                  styles.optionText, 
                  rangoSeleccionado === rango && styles.optionTextActive,
                  { fontSize: 16, flex: 1 }
                ]}>
                  {rango}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity 
              style={[styles.mainButton, { marginTop: 25, backgroundColor: '#1976D2', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]} 
              onPress={handleConfirmarHorario}
            >
              <Text style={styles.mainButtonText}>Confirmar y Notificar</Text>
              <Ionicons name="paper-plane-outline" size={20} color="#fff" style={{ marginLeft: 8 }} />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setPaso(1)} 
              style={{ marginTop: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}
            >
              <Ionicons name="arrow-back" size={18} color="#666" style={{ marginRight: 5 }} />
              <Text style={{ textAlign: 'center', color: '#666', fontWeight: 'bold' }}>Volver a detalles</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}