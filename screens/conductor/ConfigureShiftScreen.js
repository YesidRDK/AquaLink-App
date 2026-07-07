// ================================================
// Pantalla: Configuración de Jornada del Conductor
// Permite al conductor seleccionar el camión con
// el que trabajará y establecer el horario de
// disponibilidad antes de iniciar la jornada.
// ================================================

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, SafeAreaView
} from 'react-native';
import { styles } from '../../styles';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function ConfigureShiftScreen({ navigation }) {
  // ==============================================
  // ESTADOS
  // ==============================================
  const [horaInicio, setHoraInicio] = useState('08:00 AM');
  const [horaFin, setHoraFin] = useState('06:00 PM');

  // Lista de camiones registrados por el conductor
  const misCamiones = [
    { id: '1', placa: 'A12B34C', capacidad: '10.000 Lts' },
    { id: '2', placa: 'X98Y76Z', capacidad: '5.000 Lts' },
  ];

  const [camionSeleccionado, setCamionSeleccionado] = useState(misCamiones[0].id);

  // ==============================================
  // Iniciar jornada con la configuración elegida
  // ==============================================
  const handleIniciar = () => {
    const camion = misCamiones.find(c => c.id === camionSeleccionado);
    alert(`¡Jornada Iniciada! 🚀\nOperando camión ${camion.placa} (${camion.capacidad})\nHorario: ${horaInicio} - ${horaFin}`);
    navigation.navigate('Conductor', { isOnline: true });
  };

  // ==============================================
  // INTERFAZ DE USUARIO
  // ==============================================
  return (
    <SafeAreaView style={styles.container}>
      {/* Cabecera */}
      <View style={{
        backgroundColor: '#1976D2', height: 90, justifyContent: 'center',
        alignItems: 'center', paddingTop: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#fff' }}>Configurar Jornada</Text>
          <MaterialCommunityIcons name="truck-fast" size={28} color="#fff" style={{ marginLeft: 10 }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 25 }}>
        {/* Selección de camión */}
        <Text style={[styles.sectionTitle, { marginBottom: 15 }]}>1. Selecciona el camión a usar</Text>
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
            onPress={() => setCamionSeleccionado(item.id)}
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
              {item.capacidad}
            </Text>
          </TouchableOpacity>
        ))}

        {/* Selección de horario */}
        <Text style={[styles.sectionTitle, { marginTop: 25, marginBottom: 15 }]}>2. Horario de disponibilidad</Text>
        <View style={{ flexDirection: 'row', gap: 15 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoLabel}>Hora Inicio</Text>
            <TextInput style={styles.input} value={horaInicio} onChangeText={setHoraInicio} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoLabel}>Hora Cierre</Text>
            <TextInput style={styles.input} value={horaFin} onChangeText={setHoraFin} />
          </View>
        </View>

        {/* Botón iniciar jornada */}
        <TouchableOpacity
          style={[styles.mainButton, {
            backgroundColor: '#34C759', marginTop: 40,
            flexDirection: 'row', justifyContent: 'center', alignItems: 'center'
          }]}
          onPress={handleIniciar}
        >
          <Text style={styles.mainButtonText}>Iniciar Jornada</Text>
          <Ionicons name="rocket" size={20} color="#fff" style={{ marginLeft: 8 }} />
        </TouchableOpacity>

        {/* Cancelar y volver */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
          <Text style={{ textAlign: 'center', color: '#d32f2f', fontWeight: 'bold' }}>Cancelar</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}