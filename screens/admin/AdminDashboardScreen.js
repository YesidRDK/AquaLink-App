// screens/admin/AdminDashboardScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../../styles'; // Asegúrate de ajustar la ruta si es necesario

// IMPORTACIONES DE FIREBASE
import { db } from '../../firebase';
import { collection, query, where, getDocs, updateDoc, doc, orderBy } from 'firebase/firestore';

export default function AdminDashboardScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('flota'); // 'flota', 'viajes', 'reportes'
  const [isLoading, setIsLoading] = useState(true);

  // Estados de datos
  const [conductores, setConductores] = useState([]);
  const [viajes, setViajes] = useState([]);
  const [reportes, setReportes] = useState([]);

  useEffect(() => {
    cargarDatos();
  }, [activeTab]);

  const cargarDatos = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'flota') {
        const q = query(collection(db, 'users'), where('rol', '==', 'conductor'));
        const querySnapshot = await getDocs(q);
        const lista = [];
        querySnapshot.forEach((doc) => lista.push({ id: doc.id, ...doc.data() }));
        setConductores(lista);
      } 
      else if (activeTab === 'viajes') {
        const q = query(collection(db, 'pedidos'), where('estado', '==', 'finalizado'));
        const querySnapshot = await getDocs(q);
        const lista = [];
        querySnapshot.forEach((doc) => lista.push({ id: doc.id, ...doc.data() }));
        lista.sort((a, b) => new Date(b.fechaFinalizado) - new Date(a.fechaFinalizado));
        setViajes(lista);
      } 
      else if (activeTab === 'reportes') {
        const q = query(collection(db, 'reportes'), where('estado', '==', 'pendiente'));
        const querySnapshot = await getDocs(q);
        const lista = [];
        querySnapshot.forEach((doc) => lista.push({ id: doc.id, ...doc.data() }));
        setReportes(lista);
      }
    } catch (error) {
      console.error("Error cargando datos de admin:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const resolverReporte = async (reporteId) => {
    try {
      await updateDoc(doc(db, 'reportes', reporteId), { estado: 'revisado' });
      setReportes(reportes.filter(r => r.id !== reporteId));
      Alert.alert("Éxito", "Reporte marcado como revisado.");
    } catch (error) {
      Alert.alert("Error", "No se pudo actualizar el reporte.");
    }
  };

  // --- RENDERIZADO DE PESTAÑAS ---
  
  const renderFlota = () => {
    const activos = conductores.filter(c => c.estado === 'activo' || c.isOnline === true);
    const inactivos = conductores.filter(c => c.estado !== 'activo' && !c.isOnline);

    return (
      <View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 }}>
          <View style={{ alignItems: 'center', backgroundColor: '#e8f5e9', padding: 15, borderRadius: 15, width: '45%' }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#2e7d32' }}>{activos.length}</Text>
            <Text style={{ color: '#2e7d32', fontWeight: 'bold' }}>En Servicio</Text>
          </View>
          <View style={{ alignItems: 'center', backgroundColor: '#ffebee', padding: 15, borderRadius: 15, width: '45%' }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#c62828' }}>{inactivos.length}</Text>
            <Text style={{ color: '#c62828', fontWeight: 'bold' }}>Fuera de Servicio</Text>
          </View>
        </View>

        <Text style={[styles.sectionSubtitle, { marginBottom: 10 }]}>Listado de Camioneros</Text>
        {conductores.map((c) => (
          <View key={c.id} style={[styles.recentCard, { borderLeftWidth: 5, borderLeftColor: (c.estado === 'activo' || c.isOnline) ? '#4CAF50' : '#F44336' }]}>
            <View>
              <Text style={styles.recentName}>{c.nombre} {c.apellido}</Text>
              <Text style={styles.recentDetail}>{c.placa || 'Placa no registrada'}</Text>
            </View>
            <Ionicons name="ellipse" size={14} color={(c.estado === 'activo' || c.isOnline) ? '#4CAF50' : '#F44336'} />
          </View>
        ))}
      </View>
    );
  };

  const renderViajes = () => (
    <View>
      <Text style={[styles.sectionSubtitle, { marginBottom: 10 }]}>Historial de Entregas</Text>
      {viajes.map((v) => (
        <View key={v.id} style={styles.recentCard}>
          <View>
            <Text style={styles.recentName}>{v.conductorNombre} ➔ {v.clienteNombre}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <Ionicons name="water" size={14} color="#0069B4" style={{ marginRight: 4 }} />
              <Text style={styles.recentDetail}>{v.litros} Lts   •   </Text>
              <Ionicons name="cash-outline" size={14} color="#4CAF50" style={{ marginRight: 4 }} />
              <Text style={styles.recentDetail}>{v.metodoPago}</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  const renderReportes = () => (
    <View>
      <Text style={[styles.sectionSubtitle, { marginBottom: 10 }]}>Alertas Pendientes</Text>
      {reportes.length === 0 ? (
        <View style={{ alignItems: 'center', marginTop: 30 }}>
          <Ionicons name="checkmark-circle-outline" size={50} color="#4CAF50" />
          <Text style={{ color: '#666', marginTop: 10 }}>No hay reportes pendientes.</Text>
        </View>
      ) : (
        reportes.map((r) => (
          <View key={r.id} style={[styles.recentCard, { flexDirection: 'column', alignItems: 'flex-start', backgroundColor: '#fff3e0' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="warning" size={20} color="#d32f2f" style={{ marginRight: 8 }} />
              <Text style={{ fontWeight: 'bold', color: '#d32f2f', fontSize: 16 }}>Conductor: {r.conductorNombre}</Text>
            </View>
            <Text style={{ color: '#333', fontStyle: 'italic', marginBottom: 10 }}>"{r.motivo}"</Text>
            <Text style={{ color: '#666', fontSize: 12, marginBottom: 15 }}>Reportado por: {r.clienteNombre}</Text>
            
            <TouchableOpacity 
              style={{ backgroundColor: '#0069B4', padding: 10, borderRadius: 8, alignSelf: 'flex-end' }}
              onPress={() => resolverReporte(r.id)}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Marcar como Revisado</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* CABECERA ADMINISTRATIVA */}
      <View style={{ backgroundColor: '#1A237E', paddingVertical: 20, borderBottomLeftRadius: 25, borderBottomRightRadius: 25, alignItems: 'center', elevation: 5 }}>
        <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#fff', marginTop: 15 }}>Panel de Control</Text>
        <Text style={{ color: '#c5cae9' }}>Centro de Operaciones</Text>
      </View>

      {/* MENÚ DE NAVEGACIÓN (TABS) */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-evenly', marginTop: 15, borderBottomWidth: 1, borderColor: '#eee' }}>
        <TouchableOpacity style={{ padding: 15, borderBottomWidth: activeTab === 'flota' ? 3 : 0, borderColor: '#0069B4', alignItems: 'center' }} onPress={() => setActiveTab('flota')}>
          <Ionicons name="bus-outline" size={24} color={activeTab === 'flota' ? '#0069B4' : '#888'} />
          <Text style={{ color: activeTab === 'flota' ? '#0069B4' : '#888', fontWeight: 'bold', marginTop: 4 }}>Flota</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={{ padding: 15, borderBottomWidth: activeTab === 'viajes' ? 3 : 0, borderColor: '#0069B4', alignItems: 'center' }} onPress={() => setActiveTab('viajes')}>
          <Ionicons name="map-outline" size={24} color={activeTab === 'viajes' ? '#0069B4' : '#888'} />
          <Text style={{ color: activeTab === 'viajes' ? '#0069B4' : '#888', fontWeight: 'bold', marginTop: 4 }}>Viajes</Text>
        </TouchableOpacity>

        <TouchableOpacity style={{ padding: 15, borderBottomWidth: activeTab === 'reportes' ? 3 : 0, borderColor: '#d32f2f', alignItems: 'center' }} onPress={() => setActiveTab('reportes')}>
          <Ionicons name="alert-circle-outline" size={24} color={activeTab === 'reportes' ? '#d32f2f' : '#888'} />
          <Text style={{ color: activeTab === 'reportes' ? '#d32f2f' : '#888', fontWeight: 'bold', marginTop: 4 }}>Reportes</Text>
        </TouchableOpacity>
      </View>

      {/* CONTENIDO PRINCIPAL */}
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#0069B4" style={{ marginTop: 50 }} />
        ) : (
          <>
            {activeTab === 'flota' && renderFlota()}
            {activeTab === 'viajes' && renderViajes()}
            {activeTab === 'reportes' && renderReportes()}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}