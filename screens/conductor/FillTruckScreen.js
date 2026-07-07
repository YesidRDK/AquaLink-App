// ================================================
// Pantalla: Llenado de Tanque del Conductor
// Permite al conductor registrar la cantidad de
// agua cargada en el camión antes de iniciar
// o durante la jornada. Actualiza Firestore.
// ================================================

import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  SafeAreaView, ActivityIndicator
} from 'react-native';
import { auth, db } from '../../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { styles } from '../../styles';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function FillTruckScreen({ navigation }) {
  // ==============================================
  // ESTADOS
  // ==============================================
  const [litros, setLitros] = useState('');           // Cantidad ingresada manualmente
  const [perfilLiters, setPerfilLiters] = useState('0'); // Capacidad del perfil
  const [isLoading, setIsLoading] = useState(true);

  // ==============================================
  // Cargar capacidad registrada en el perfil
  // ==============================================
  useEffect(() => {
    const loadCapacity = async () => {
      const user = auth.currentUser;
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const cap = userDoc.data().capacidadTanque || '10000';
        setPerfilLiters(cap);
        setLitros(cap); // Sugerir la capacidad máxima por defecto
      }
      setIsLoading(false);
    };
    loadCapacity();
  }, []);

  // ==============================================
  // Confirmar llenado y actualizar Firestore
  // ==============================================
  const handleConfirmFill = async () => {
    if (!litros || isNaN(litros)) {
      alert("Ingresa un número válido de litros.");
      return;
    }
    try {
      const user = auth.currentUser;
      await updateDoc(doc(db, 'users', user.uid), {
        litrosActuales: parseInt(litros),
        ultimaCarga: new Date().toISOString()
      });
      alert(`✅ Tanque cargado con ${litros} Lts.`);
      navigation.navigate('Conductor');
    } catch (error) {
      alert("Error al registrar llenado.");
    }
  };

  // Indicador de carga
  if (isLoading) return <ActivityIndicator size="large" color="#1976D2" style={{ flex: 1 }} />;

  // ==============================================
  // INTERFAZ DE USUARIO
  // ==============================================
  return (
    <SafeAreaView style={styles.container}>
      <View style={{ padding: 25, flex: 1, justifyContent: 'center' }}>
        {/* Título */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 10 }}>
          <Ionicons name="water" size={32} color="#1976D2" style={{ marginRight: 8 }} />
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#1976D2' }}>Llenado de Tanque</Text>
        </View>

        <Text style={{ textAlign: 'center', color: '#666', marginBottom: 30 }}>
          Indica cuánta agua llevas disponible para esta jornada.
        </Text>

        {/* Capacidad del perfil */}
        <View style={{ backgroundColor: '#E3F2FD', padding: 20, borderRadius: 15, marginBottom: 25 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
            <MaterialCommunityIcons name="truck-cargo-container" size={20} color="#1976D2" style={{ marginRight: 6 }} />
            <Text style={{ color: '#1976D2', fontWeight: 'bold' }}>Capacidad de tu perfil:</Text>
          </View>
          <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#333' }}>{perfilLiters} Litros</Text>

          <TouchableOpacity onPress={() => setLitros(perfilLiters)} style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="refresh-circle" size={18} color="#1976D2" style={{ marginRight: 4 }} />
            <Text style={{ color: '#1976D2', textDecorationLine: 'underline' }}>Usar capacidad máxima</Text>
          </TouchableOpacity>
        </View>

        {/* Ingreso manual de litros */}
        <Text style={{ fontWeight: 'bold', marginBottom: 10, color: '#333' }}>Ingreso Manual (Lts):</Text>
        <TextInput
          style={[styles.input, { fontSize: 20, textAlign: 'center', height: 60 }]}
          placeholder="Ej: 5000"
          keyboardType="numeric"
          value={litros.toString()}
          onChangeText={setLitros}
        />

        {/* Botón confirmar llenado */}
        <TouchableOpacity
          style={[styles.mainButton, { backgroundColor: '#34C759', marginTop: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
          onPress={handleConfirmFill}
        >
          <Text style={styles.mainButtonText}>Confirmar Llenado</Text>
          <Ionicons name="checkmark-circle-outline" size={22} color="#fff" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}