// ================================================
// Pantalla: Llenado de Tanque del Conductor
// Permite seleccionar el camión a llenar y registrar
// la cantidad de agua cargada. Actualiza Firestore
// y deja el camión seleccionado como activo.
// ================================================

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  SafeAreaView, ActivityIndicator, Alert
} from 'react-native';
import { auth, db } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { styles } from '../../styles';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function FillTruckScreen({ navigation }) {
  // ==============================================
  // ESTADOS
  // ==============================================
  const [litros, setLitros] = useState('');           // Cantidad ingresada manualmente
  const [isLoading, setIsLoading] = useState(false);  // Indicador de carga al guardar

  // Lista de camiones (misma que en ConfigureShiftScreen)
  const misCamiones = [
    { id: '1', placa: 'A12B34C', capacidad: '10000' },
    { id: '2', placa: 'X98Y76Z', capacidad: '5000' },
  ];

  const [camionSeleccionado, setCamionSeleccionado] = useState(misCamiones[0].id);
  const camionInfo = misCamiones.find(c => c.id === camionSeleccionado);

  // ==============================================
  // Confirmar llenado y actualizar Firestore
  // ==============================================
  const handleConfirmFill = async () => {
    if (!litros || isNaN(litros)) {
      Alert.alert('Error', 'Ingresa un número válido de litros.');
      return;
    }
    setIsLoading(true);
    try {
      const user = auth.currentUser;
      // Guardar litros actuales y también dejar como camión activo el seleccionado
      await updateDoc(doc(db, 'users', user.uid), {
        litrosActuales: parseInt(litros),
        ultimaCarga: new Date().toISOString(),
        camionActivo: {
          placa: camionInfo.placa,
          capacidad: camionInfo.capacidad,
          id: camionInfo.id
        }
      });
      Alert.alert('✅ Llenado registrado', `Camión ${camionInfo.placa} cargado con ${litros} Lts.`);
      navigation.navigate('Conductor');
    } catch (error) {
      Alert.alert('Error', 'No se pudo registrar el llenado.');
    } finally {
      setIsLoading(false);
    }
  };

  // ==============================================
  // INTERFAZ DE USUARIO
  // ==============================================
  return (
    <SafeAreaView style={styles.container}>
      <View style={{ padding: 25, flex: 1, justifyContent: 'center' }}>
        {/* Título */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
          <Ionicons name="water" size={32} color="#1976D2" style={{ marginRight: 8 }} />
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#1976D2' }}>Llenado de Tanque</Text>
        </View>

        {/* Selección de camión */}
        <Text style={[styles.sectionTitle, { marginBottom: 15 }]}>Selecciona el camión a llenar</Text>
        {misCamiones.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.optionButton,
              {
                marginBottom: 10, paddingVertical: 15,
                flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
              },
              camionSeleccionado === item.id && styles.optionButtonActive
            ]}
            onPress={() => {
              setCamionSeleccionado(item.id);
              setLitros(''); // Limpiar litros al cambiar de camión
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons
                name="truck" size={22}
                color={camionSeleccionado === item.id ? '#0069B4' : '#666'}
                style={{ marginRight: 8 }}
              />
              <Text style={[styles.optionText, camionSeleccionado === item.id && styles.optionTextActive]}>
                Placa: {item.placa}
              </Text>
            </View>
            <Text style={[
              styles.optionText,
              camionSeleccionado === item.id && styles.optionTextActive,
              { fontWeight: 'bold' }
            ]}>
              {item.capacidad} Lts
            </Text>
          </TouchableOpacity>
        ))}

        {/* Capacidad del camión seleccionado */}
        <View style={{ backgroundColor: '#E3F2FD', padding: 15, borderRadius: 15, marginVertical: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
            <MaterialCommunityIcons name="truck-cargo-container" size={20} color="#1976D2" style={{ marginRight: 6 }} />
            <Text style={{ color: '#1976D2', fontWeight: 'bold' }}>
              Capacidad de {camionInfo.placa}:
            </Text>
          </View>
          <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#333' }}>
            {camionInfo.capacidad} Litros
          </Text>

          <TouchableOpacity
            onPress={() => setLitros(camionInfo.capacidad)}
            style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center' }}
          >
            <Ionicons name="refresh-circle" size={18} color="#1976D2" style={{ marginRight: 4 }} />
            <Text style={{ color: '#1976D2', textDecorationLine: 'underline' }}>Usar capacidad máxima</Text>
          </TouchableOpacity>
        </View>

        {/* Ingreso manual de litros */}
        <Text style={{ fontWeight: 'bold', marginBottom: 10, color: '#333' }}>Litros a cargar (Manual):</Text>
        <TextInput
          style={[styles.input, { fontSize: 20, textAlign: 'center', height: 60 }]}
          placeholder="Ej: 5000"
          keyboardType="numeric"
          value={litros}
          onChangeText={setLitros}
        />

        {/* Botón confirmar llenado */}
        <TouchableOpacity
          style={[styles.mainButton, {
            backgroundColor: '#34C759',
            marginTop: 30,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center'
          }]}
          onPress={handleConfirmFill}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.mainButtonText}>Confirmar Llenado</Text>
              <Ionicons name="checkmark-circle-outline" size={22} color="#fff" style={{ marginLeft: 8 }} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}