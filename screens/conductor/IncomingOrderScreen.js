// ================================================
// Pantalla: Recepción de Nuevo Pedido (Conductor)
// Flujo en tres pasos para aceptar un pedido:
// 1. Revisar resumen del pedido
// 2. Seleccionar rango horario de entrega
// 3. Establecer la tarifa del servicio
// Al confirmar, se actualiza el pedido en Firestore
// y se inicia la navegación hacia el destino.
// ================================================

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, SafeAreaView, ScrollView,
  TextInput, KeyboardAvoidingView, Platform
} from 'react-native';
import { styles } from '../../styles';
import { auth, db } from '../../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

export default function IncomingOrderScreen({ navigation, route }) {
  // ==============================================
  // ESTADOS
  // ==============================================
  const [paso, setPaso] = useState(1);                   // Control del flujo: 1, 2 o 3
  const [rangoSeleccionado, setRangoSeleccionado] = useState(null); // Horario estimado
  const [tarifaPropuesta, setTarifaPropuesta] = useState('');       // Monto a cobrar

  // Datos del pedido recibidos desde la notificación
  const pedidoData = route.params?.pedidoData || {};
  const pedidoId = route.params?.pedidoId || "";

  // Información resumida del pedido para mostrar en pantalla
  const pedidoReal = {
    cliente: pedidoData?.clienteNombre || "Cliente",
    litros: pedidoData?.litros || "---",
    pago: pedidoData?.metodoPago || "---",
    ubicacion: pedidoData?.destinoTexto || "Ubicación no disponible",
    tipoUbicacion: pedidoData?.referencia ? "Con Referencia" : "GPS"
  };

  // Opciones de rangos horarios disponibles
  const rangosHorarios = [
    "Entre 8:00 AM - 12:00 PM",
    "Entre 12:00 PM - 4:00 PM",
    "Entre 4:00 PM - 8:00 PM",
    "Lo antes posible (30-60 min)"
  ];

  // ==============================================
  // Confirmar pedido: guarda horario, tarifa y
  // actualiza el estado del pedido en Firestore
  // ==============================================
  const handleConfirmarPedidoCompleto = async () => {
    if (!tarifaPropuesta.trim()) {
      alert("Por favor, ingresa la tarifa a cobrar.");
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
        tarifaAplicada: tarifaPropuesta,
        fechaAceptado: new Date().toISOString()
      });

      alert(`¡Pedido Confirmado! ✅\nEl cliente ha sido notificado del horario y la tarifa.`);

      // Redirigir al mapa con los datos del pedido activo
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

  // ==============================================
  // INTERFAZ DE USUARIO
  // ==============================================
  return (
    <SafeAreaView style={styles.container}>
      {/* Cabecera dinámica según el paso actual */}
      <View style={{
        backgroundColor: paso === 1 ? '#1976D2' : paso === 2 ? '#FF9800' : '#34C759',
        height: 90, justifyContent: 'center', alignItems: 'center', paddingTop: 30,
        borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 5
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {paso === 1 && <Ionicons name="notifications-circle" size={32} color="#fff" style={{ marginRight: 8 }} />}
          {paso === 2 && <Ionicons name="time-outline" size={30} color="#fff" style={{ marginRight: 8 }} />}
          {paso === 3 && <Ionicons name="cash-outline" size={30} color="#fff" style={{ marginRight: 8 }} />}

          <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#fff', textAlign: 'center' }}>
            {paso === 1 ? "¡NUEVO PEDIDO!" : paso === 2 ? "¿Hora de llegada?" : "Establecer Tarifa"}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 25 }}>

          {/* Paso 1: Resumen del pedido */}
          {paso === 1 && (
            <View>
              <View style={[styles.pedidoCard, { paddingVertical: 25 }]}>
                <Text style={[styles.sectionTitle, { color: '#1976D2', textAlign: 'center', marginBottom: 20 }]}>
                  Resumen de Solicitud
                </Text>

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
                    <Ionicons name="card-outline" size={24} color="#1976D2" />
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

              {/* Botones: Rechazar o Aceptar */}
              <View style={{ flexDirection: 'row', gap: 15, marginTop: 30 }}>
                <TouchableOpacity
                  style={[styles.mainButton, { flex: 1, backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#ddd', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
                  onPress={() => navigation.navigate('Conductor', { pedidoRechazado: pedidoId })}
                >
                  <Ionicons name="close" size={20} color="#d32f2f" style={{ marginRight: 5 }} />
                  <Text style={[styles.mainButtonText, { color: '#d32f2f' }]}>Rechazar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.mainButton, { flex: 1, backgroundColor: '#FF9800', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
                  onPress={() => setPaso(2)}
                >
                  <Text style={styles.mainButtonText}>Aceptar</Text>
                  <Ionicons name="arrow-forward-outline" size={20} color="#fff" style={{ marginLeft: 5 }} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Paso 2: Selección de rango horario */}
          {paso === 2 && (
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
                    rangoSeleccionado === rango && { borderColor: '#FF9800', backgroundColor: '#FFF3E0' }
                  ]}
                  onPress={() => setRangoSeleccionado(rango)}
                >
                  <Ionicons
                    name={rangoSeleccionado === rango ? "radio-button-on" : "radio-button-off"}
                    size={24}
                    color={rangoSeleccionado === rango ? "#FF9800" : "#999"}
                    style={{ marginRight: 10 }}
                  />
                  <Text style={[
                    styles.optionText,
                    rangoSeleccionado === rango && { color: '#FF9800', fontWeight: 'bold' },
                    { fontSize: 16, flex: 1 }
                  ]}>
                    {rango}
                  </Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={[styles.mainButton, { marginTop: 25, backgroundColor: '#34C759', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
                onPress={() => {
                  if (!rangoSeleccionado) {
                    alert("Selecciona un horario antes de continuar.");
                    return;
                  }
                  setPaso(3);
                }}
              >
                <Text style={styles.mainButtonText}>Continuar a Tarifa</Text>
                <Ionicons name="arrow-forward-outline" size={20} color="#fff" style={{ marginLeft: 8 }} />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setPaso(1)} style={{ marginTop: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="arrow-back" size={18} color="#666" style={{ marginRight: 5 }} />
                <Text style={{ textAlign: 'center', color: '#666', fontWeight: 'bold' }}>Volver a detalles</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Paso 3: Establecer tarifa */}
          {paso === 3 && (
            <View>
              <View style={{ alignItems: 'center', marginBottom: 30 }}>
                <Ionicons name="wallet-outline" size={80} color="#34C759" style={{ marginBottom: 15 }} />
                <Text style={[styles.sectionSubtitle, { textAlign: 'center', fontSize: 18 }]}>
                  ¿Cuál será el costo por entregar {pedidoReal.litros} Litros?
                </Text>
                <Text style={{ textAlign: 'center', color: '#666', marginTop: 5 }}>
                  El cliente pagará mediante: <Text style={{ fontWeight: 'bold' }}>{pedidoReal.pago}</Text>
                </Text>
              </View>

              <View style={{
                flexDirection: 'row', alignItems: 'center', borderWidth: 2,
                borderColor: '#34C759', borderRadius: 15, paddingHorizontal: 20,
                backgroundColor: '#f9fff9', marginBottom: 30
              }}>
                <Text style={{ fontSize: 30, fontWeight: 'bold', color: '#333', marginRight: 10 }}>$</Text>
                <TextInput
                  style={{ flex: 1, fontSize: 30, fontWeight: 'bold', color: '#333', paddingVertical: 15 }}
                  placeholder="0.00"
                  placeholderTextColor="#ccc"
                  keyboardType="numeric"
                  value={tarifaPropuesta}
                  onChangeText={setTarifaPropuesta}
                />
              </View>

              <TouchableOpacity
                style={[styles.mainButton, { backgroundColor: '#34C759', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18 }]}
                onPress={handleConfirmarPedidoCompleto}
              >
                <Text style={[styles.mainButtonText, { fontSize: 18 }]}>Confirmar y Notificar</Text>
                <Ionicons name="paper-plane-outline" size={22} color="#fff" style={{ marginLeft: 8 }} />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setPaso(2)} style={{ marginTop: 25, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="arrow-back" size={18} color="#666" style={{ marginRight: 5 }} />
                <Text style={{ textAlign: 'center', color: '#666', fontWeight: 'bold' }}>Atrás</Text>
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}