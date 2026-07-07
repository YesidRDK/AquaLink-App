// ================================================
// Pantalla: Menú de Jornada del Conductor
// Ofrece acceso rápido a las funciones previas
// al inicio de la jornada: configurar horario y
// camión, o registrar el llenado del tanque.
// ================================================

import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { styles } from '../../styles';
import { Ionicons } from '@expo/vector-icons';

export default function ShiftMenuScreen({ navigation }) {
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#f5f5f5' }]}>
      {/* Cabecera */}
      <View style={{
        backgroundColor: '#1976D2', height: 100, justifyContent: 'center',
        alignItems: 'center', borderBottomLeftRadius: 30, borderBottomRightRadius: 30
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 20 }}>
          <Ionicons name="briefcase" size={24} color="#fff" style={{ marginRight: 8 }} />
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>OPCIONES DE JORNADA</Text>
        </View>
      </View>

      <View style={{ flex: 1, justifyContent: 'center', padding: 25 }}>
        {/* Configurar jornada: selección de camión y horario */}
        <TouchableOpacity
          style={[styles.mainButton, {
            height: 120, backgroundColor: '#fff', borderWidth: 2,
            borderColor: '#1976D2', marginBottom: 20,
            flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20
          }]}
          onPress={() => navigation.navigate('ConfigureShift')}
        >
          <Ionicons name="settings" size={44} color="#1976D2" style={{ marginRight: 15 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#1976D2', fontWeight: 'bold', fontSize: 18 }}>Configurar Jornada</Text>
            <Text style={{ color: '#666', fontSize: 13, marginTop: 2 }}>Estado de servicio y zona.</Text>
          </View>
        </TouchableOpacity>

        {/* Llenado de camión: registro de litros cargados */}
        <TouchableOpacity
          style={[styles.mainButton, {
            height: 120, backgroundColor: '#fff', borderWidth: 2,
            borderColor: '#34C759', flexDirection: 'row',
            alignItems: 'center', paddingHorizontal: 20
          }]}
          onPress={() => navigation.navigate('FillTruck')}
        >
          <Ionicons name="water" size={44} color="#34C759" style={{ marginRight: 15 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#34C759', fontWeight: 'bold', fontSize: 18 }}>Llenado de Camión</Text>
            <Text style={{ color: '#666', fontSize: 13, marginTop: 2 }}>Cargar litros al tanque.</Text>
          </View>
        </TouchableOpacity>

        {/* Volver al mapa principal */}
        <TouchableOpacity
          style={{ marginTop: 30, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={18} color="#666" style={{ marginRight: 6 }} />
          <Text style={{ textAlign: 'center', color: '#666', fontWeight: 'bold' }}>Volver al Mapa</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}