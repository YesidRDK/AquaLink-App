// ================================================
// Pantalla: Panel de Control del Administrador
// Descripción: Centro de operaciones que permite al administrador
//              monitorear la flota de conductores, clientes, viajes
//              y reportes. Incluye funciones de inhabilitación de cuentas,
//              revisión y eliminación de viajes y reportes, y generación
//              de claves únicas para registrar nuevos conductores.
// ================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { styles } from '../../styles';

// --- CONEXIÓN CON FIREBASE FIRESTORE ---
import { db } from '../../firebase';
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  getDoc,
  deleteDoc,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';

export default function AdminDashboardScreen({ navigation }) {
  // ==============================================
  // ESTADOS PRINCIPALES
  // ==============================================
  const [activeTab, setActiveTab] = useState('flota');
  const [isLoading, setIsLoading] = useState(true);

  const [viajesSubTab, setViajesSubTab] = useState('completados');
  const [reportesSubTab, setReportesSubTab] = useState('clientes');

  const [conductores, setConductores] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [viajesCompletados, setViajesCompletados] = useState([]);
  const [viajesPendientes, setViajesPendientes] = useState([]);
  const [reportesClientes, setReportesClientes] = useState([]);
  const [reportesConductores, setReportesConductores] = useState([]);

  const [selectedItem, setSelectedItem] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('');

  // --- Estados para generar clave de conductor ---
  const [newDriverModalVisible, setNewDriverModalVisible] = useState(false);
  const [nuevaClave, setNuevaClave] = useState('');

  // ==============================================
  // CICLO DE VIDA: recargar datos al cambiar de pestaña
  // ==============================================
  useEffect(() => {
    cargarDatos();
  }, [activeTab]);

  // ==============================================
  // FUNCIÓN PRINCIPAL: Obtener datos según la pestaña activa
  // ==============================================
  const cargarDatos = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'flota') {
        const q = query(collection(db, 'users'), where('role', '==', 'proveedor'));
        const snap = await getDocs(q);
        const lista = [];
        snap.forEach((d) => lista.push({ id: d.id, ...d.data() }));
        setConductores(lista);
      } 
      else if (activeTab === 'clientes') {
        const q = query(collection(db, 'users'), where('role', '==', 'cliente'));
        const snap = await getDocs(q);
        const lista = [];
        snap.forEach((d) => lista.push({ id: d.id, ...d.data() }));
        setClientes(lista);
      } 
      else if (activeTab === 'viajes') {
        const qComp = query(collection(db, 'pedidos'), where('estado', '==', 'finalizado'));
        const snapComp = await getDocs(qComp);
        const listaComp = [];
        snapComp.forEach((d) => listaComp.push({ id: d.id, ...d.data() }));
        listaComp.sort((a, b) => new Date(b.fechaFinalizado) - new Date(a.fechaFinalizado));
        setViajesCompletados(listaComp);

        const qPend = query(
          collection(db, 'pedidos'),
          where('estado', 'in', ['pendiente', 'en_proceso', 'asignado', 'buscando_conductor'])
        );
        const snapPend = await getDocs(qPend);
        const listaPend = [];
        snapPend.forEach((d) => listaPend.push({ id: d.id, ...d.data() }));
        setViajesPendientes(listaPend);
      } 
      else if (activeTab === 'reportes') {
        const qCli = query(
          collection(db, 'reportes'),
          where('tipo', '==', 'cliente_reporta_conductor'),
          where('estado', '==', 'pendiente')
        );
        const snapCli = await getDocs(qCli);
        const listaCli = [];
        snapCli.forEach((d) => listaCli.push({ id: d.id, ...d.data() }));
        setReportesClientes(listaCli);

        const qCond = query(
          collection(db, 'reportes'),
          where('tipo', '==', 'conductor_reporta_cliente'),
          where('estado', '==', 'pendiente')
        );
        const snapCond = await getDocs(qCond);
        const listaCond = [];
        snapCond.forEach((d) => listaCond.push({ id: d.id, ...d.data() }));
        setReportesConductores(listaCond);
      }
    } catch (error) {
      console.error("Error al cargar datos del panel administrativo:", error);
      Alert.alert("Error", "No se pudieron cargar los datos.");
    } finally {
      setIsLoading(false);
    }
  };

  // ==============================================
  // FUNCIONES DE NAVEGACIÓN Y MODALES
  // ==============================================
  const openDetailModal = (item, type) => {
    setSelectedItem(item);
    setModalType(type);
    setModalVisible(true);
  };

  // ==============================================
  // FUNCIONES DE GESTIÓN DE CUENTAS
  // ==============================================
  const inhabilitarDesdeReporte = async (userId, role) => {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        Alert.alert("Error", "El usuario ya no existe.");
        return;
      }
      const userData = userSnap.data();
      const estadoActual = userData.estadoCuenta || 'activa';
      const nuevoEstado = estadoActual === 'inhabilitada' ? 'activa' : 'inhabilitada';
      await updateDoc(userRef, { estadoCuenta: nuevoEstado });
      cargarDatos();
      Alert.alert("Éxito", `Cuenta ${nuevoEstado === 'activa' ? 'habilitada' : 'inhabilitada'} correctamente.`);
    } catch (error) {
      console.error("Error al cambiar estado de cuenta:", error);
      Alert.alert("Error", "No se pudo actualizar el estado de la cuenta.");
    }
  };

  // ==============================================
  // FUNCIONES DE GESTIÓN DE REPORTES
  // ==============================================
  const resolverReporte = async (reporteId) => {
    try {
      await updateDoc(doc(db, 'reportes', reporteId), { estado: 'revisado' });
      cargarDatos();
      Alert.alert("Éxito", "Reporte marcado como revisado.");
    } catch (error) {
      Alert.alert("Error", "No se pudo actualizar el reporte.");
    }
  };

  const eliminarReporte = (reporteId) => {
    Alert.alert(
      "Eliminar Reporte",
      "¿Estás seguro de eliminar este reporte permanentemente?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'reportes', reporteId));
              Alert.alert("Eliminado", "El reporte ha sido eliminado.");
              cargarDatos();
            } catch (error) {
              Alert.alert("Error", "No se pudo eliminar el reporte.");
            }
          }
        }
      ]
    );
  };

  // ==============================================
  // FUNCIONES DE GESTIÓN DE VIAJES
  // ==============================================
  const eliminarViaje = (viajeId) => {
    Alert.alert(
      "Eliminar Viaje",
      "¿Estás seguro de eliminar este viaje permanentemente?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'pedidos', viajeId));
              Alert.alert("Eliminado", "El viaje ha sido eliminado.");
              cargarDatos();
            } catch (error) {
              Alert.alert("Error", "No se pudo eliminar el viaje.");
            }
          }
        }
      ]
    );
  };

  // ==============================================
  // FUNCIÓN AUXILIAR: Formateo de fechas
  // ==============================================
  const formatearFecha = (fecha) => {
    if (!fecha) return 'No disponible';
    try {
      if (fecha.seconds) {
        return new Date(fecha.seconds * 1000).toLocaleString('es-VE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      return new Date(fecha).toLocaleString('es-VE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  // ==============================================
  // FUNCIÓN: Generar clave única para conductor
  // ==============================================
  const generarClaveConductor = () => {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let clave = '';
    for (let i = 0; i < 8; i++) {
      clave += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    setNuevaClave(clave);
    setNewDriverModalVisible(true);
  };

  // ==============================================
  // FUNCIÓN: Guardar clave en Firestore
  // ==============================================
  const guardarClaveEnFirestore = async () => {
    try {
      await addDoc(collection(db, 'codigosAutorizacion'), {
        codigo: nuevaClave,
        estado: 'disponible',
        fechaCreacion: serverTimestamp()
      });
      Alert.alert('Clave generada', `La clave "${nuevaClave}" ha sido guardada y está lista para usarse en el registro de un conductor.`);
      setNewDriverModalVisible(false);
      setNuevaClave('');
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar la clave.');
    }
  };

  // ==============================================
  // FUNCIÓN: Copiar clave al portapapeles
  // ==============================================
  const copiarClaveAlPortapapeles = async () => {
    try {
      await Clipboard.setStringAsync(nuevaClave);
      Alert.alert('Clave copiada', 'La clave ha sido copiada al portapapeles. Puedes pegarla en cualquier lugar para compartirla.');
    } catch (error) {
      Alert.alert('Error', 'No se pudo copiar la clave.');
    }
  };

  // ==============================================
  // RENDERIZADO DE PESTAÑA: FLOTA
  // ==============================================
  const renderFlota = () => {
    const enJornada = conductores.filter(c => c.estado === 'activo' || c.isOnline === true);
    const fueraJornada = conductores.filter(c => c.estado !== 'activo' && !c.isOnline);

    return (
      <View>
        {/* Tarjetas de resumen: En Jornada / Fuera de Jornada */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 }}>
          <View style={{ alignItems: 'center', backgroundColor: '#e8f5e9', padding: 15, borderRadius: 15, width: '45%' }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#2e7d32' }}>{enJornada.length}</Text>
            <Text style={{ color: '#2e7d32', fontWeight: 'bold' }}>En Jornada</Text>
          </View>
          <View style={{ alignItems: 'center', backgroundColor: '#ffebee', padding: 15, borderRadius: 15, width: '45%' }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#c62828' }}>{fueraJornada.length}</Text>
            <Text style={{ color: '#c62828', fontWeight: 'bold' }}>Fuera de Jornada</Text>
          </View>
        </View>

        {/* Botón para generar clave de conductor */}
        <TouchableOpacity
          style={{
            backgroundColor: '#34C759',
            padding: 15,
            borderRadius: 12,
            marginBottom: 20,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onPress={generarClaveConductor}
        >
          <Ionicons name="add-circle-outline" size={22} color="#fff" style={{ marginRight: 8 }} />
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Nuevo Conductor</Text>
        </TouchableOpacity>

        <Text style={[styles.sectionSubtitle, { marginBottom: 10 }]}>Listado de Conductores (toca para ver detalles)</Text>
        
        {conductores.map((c) => {
          const estadoCuenta = c.estadoCuenta || 'activa';
          const inhabilitada = estadoCuenta === 'inhabilitada';
          return (
            <TouchableOpacity
              key={c.id}
              style={[
                styles.recentCard,
                { borderLeftWidth: 5, borderLeftColor: (c.estado === 'activo' || c.isOnline) ? '#4CAF50' : '#F44336' }
              ]}
              onPress={() => openDetailModal(c, 'conductor')}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <View>
                  <Text style={styles.recentName}>{c.username || c.nombre || 'Sin nombre'}</Text>
                  <Text style={styles.recentDetail}>{c.email}</Text>
                  {c.placa && <Text style={styles.recentDetail}>Placa: {c.placa}</Text>}
                  {inhabilitada && (
                    <Text style={{ color: '#d32f2f', fontSize: 11, fontWeight: 'bold', marginTop: 2 }}>⚠️ Inhabilitada</Text>
                  )}
                </View>
                <Ionicons name="ellipse" size={14} color={(c.estado === 'activo' || c.isOnline) ? '#4CAF50' : '#F44336'} />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // ==============================================
  // RENDERIZADO DE PESTAÑA: CLIENTES
  // ==============================================
  const renderClientes = () => (
    <View>
      <Text style={[styles.sectionSubtitle, { marginBottom: 10 }]}>Clientes Registrados (toca para ver detalles)</Text>
      {clientes.map((c) => {
        const estadoCuenta = c.estadoCuenta || 'activa';
        const inhabilitada = estadoCuenta === 'inhabilitada';
        return (
          <TouchableOpacity
            key={c.id}
            style={styles.recentCard}
            onPress={() => openDetailModal(c, 'cliente')}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.recentName}>{c.username || 'Sin nombre'}</Text>
              <Text style={styles.recentDetail}>{c.email}</Text>
              <Text style={styles.recentDetail}>Cédula: {c.cedula || 'No registrada'}</Text>
              {inhabilitada && (
                <Text style={{ color: '#d32f2f', fontSize: 11, fontWeight: 'bold', marginTop: 2 }}>⚠️ Inhabilitada</Text>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // ==============================================
  // RENDERIZADO DE PESTAÑA: VIAJES
  // ==============================================
  const renderViajes = () => (
    <View>
      <View style={{ flexDirection: 'row', marginBottom: 20, backgroundColor: '#f0f0f0', borderRadius: 10, padding: 4 }}>
        <TouchableOpacity
          style={{ flex: 1, padding: 10, borderRadius: 8, backgroundColor: viajesSubTab === 'completados' ? '#fff' : 'transparent', alignItems: 'center' }}
          onPress={() => setViajesSubTab('completados')}
        >
          <Text style={{ fontWeight: 'bold', color: viajesSubTab === 'completados' ? '#0069B4' : '#888' }}>Completados</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 1, padding: 10, borderRadius: 8, backgroundColor: viajesSubTab === 'pendientes' ? '#fff' : 'transparent', alignItems: 'center' }}
          onPress={() => setViajesSubTab('pendientes')}
        >
          <Text style={{ fontWeight: 'bold', color: viajesSubTab === 'pendientes' ? '#0069B4' : '#888' }}>Pendientes</Text>
        </TouchableOpacity>
      </View>

      {viajesSubTab === 'completados' ? (
        viajesCompletados.map((v) => (
          <TouchableOpacity
            key={v.id}
            style={styles.recentCard}
            onPress={() => openDetailModal(v, 'viaje')}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.recentName}>{v.conductorNombre || 'Conductor'} ➔ {v.clienteNombre || 'Cliente'}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <Ionicons name="water" size={14} color="#0069B4" style={{ marginRight: 4 }} />
                <Text style={styles.recentDetail}>{v.litros} Lts   •   </Text>
                <Ionicons name="cash-outline" size={14} color="#4CAF50" style={{ marginRight: 4 }} />
                <Text style={styles.recentDetail}>{v.metodoPago || 'No especificado'}</Text>
                {v.tarifaAplicada && (
                  <Text style={[styles.recentDetail, { color: '#2e7d32', fontWeight: 'bold', marginLeft: 4 }]}>
                    • ${v.tarifaAplicada}
                  </Text>
                )}
              </View>
            </View>
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation(); eliminarViaje(v.id); }}
              style={{ padding: 8 }}
            >
              <Ionicons name="trash-outline" size={20} color="#d32f2f" />
            </TouchableOpacity>
          </TouchableOpacity>
        ))
      ) : (
        viajesPendientes.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 30 }}>
            <Ionicons name="checkmark-circle-outline" size={50} color="#4CAF50" />
            <Text style={{ color: '#666', marginTop: 10 }}>No hay pedidos pendientes.</Text>
          </View>
        ) : (
          viajesPendientes.map((v) => (
            <TouchableOpacity
              key={v.id}
              style={styles.recentCard}
              onPress={() => openDetailModal(v, 'viaje')}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.recentName}>{v.conductorNombre || 'Conductor'} ➔ {v.clienteNombre || 'Cliente'}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <Ionicons name="water" size={14} color="#0069B4" style={{ marginRight: 4 }} />
                  <Text style={styles.recentDetail}>{v.litros} Lts   •   </Text>
                  <Ionicons name="time-outline" size={14} color="#FF9800" style={{ marginRight: 4 }} />
                  <Text style={styles.recentDetail}>{v.estado || 'pendiente'}</Text>
                  {v.tarifaAplicada && (
                    <Text style={[styles.recentDetail, { color: '#2e7d32', fontWeight: 'bold', marginLeft: 4 }]}>
                      • ${v.tarifaAplicada}
                    </Text>
                  )}
                </View>
              </View>
              <TouchableOpacity
                onPress={(e) => { e.stopPropagation(); eliminarViaje(v.id); }}
                style={{ padding: 8 }}
              >
                <Ionicons name="trash-outline" size={20} color="#d32f2f" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )
      )}
    </View>
  );

  // ==============================================
  // RENDERIZADO DE PESTAÑA: REPORTES
  // ==============================================
  const renderReportes = () => (
    <View>
      <View style={{ flexDirection: 'row', marginBottom: 20, backgroundColor: '#f0f0f0', borderRadius: 10, padding: 4 }}>
        <TouchableOpacity
          style={{ flex: 1, padding: 10, borderRadius: 8, backgroundColor: reportesSubTab === 'clientes' ? '#fff' : 'transparent', alignItems: 'center' }}
          onPress={() => setReportesSubTab('clientes')}
        >
          <Text style={{ fontWeight: 'bold', color: reportesSubTab === 'clientes' ? '#d32f2f' : '#888' }}>Clientes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 1, padding: 10, borderRadius: 8, backgroundColor: reportesSubTab === 'conductores' ? '#fff' : 'transparent', alignItems: 'center' }}
          onPress={() => setReportesSubTab('conductores')}
        >
          <Text style={{ fontWeight: 'bold', color: reportesSubTab === 'conductores' ? '#d32f2f' : '#888' }}>Conductores</Text>
        </TouchableOpacity>
      </View>

      {reportesSubTab === 'clientes' ? (
        reportesClientes.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 30 }}>
            <Ionicons name="checkmark-circle-outline" size={50} color="#4CAF50" />
            <Text style={{ color: '#666', marginTop: 10 }}>No hay reportes de clientes.</Text>
          </View>
        ) : (
          reportesClientes.map((r) => (
            <TouchableOpacity
              key={r.id}
              style={[styles.recentCard, { flexDirection: 'column', alignItems: 'flex-start', backgroundColor: '#fff3e0' }]}
              onPress={() => openDetailModal(r, 'reporte')}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, width: '100%' }}>
                <Ionicons name="warning" size={20} color="#d32f2f" style={{ marginRight: 8 }} />
                <Text style={{ fontWeight: 'bold', color: '#d32f2f', fontSize: 16, flex: 1 }}>
                  Conductor: {r.conductorNombre}
                </Text>
                <TouchableOpacity
                  onPress={(e) => { e.stopPropagation(); eliminarReporte(r.id); }}
                  style={{ padding: 4 }}
                >
                  <Ionicons name="trash-outline" size={20} color="#d32f2f" />
                </TouchableOpacity>
              </View>
              <Text style={{ color: '#333', fontStyle: 'italic', marginBottom: 10 }} numberOfLines={2}>
                "{r.motivo}"
              </Text>
              <Text style={{ color: '#666', fontSize: 12, marginBottom: 15 }}>Reportado por: {r.clienteNombre}</Text>

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', width: '100%', gap: 10 }}>
                <TouchableOpacity
                  style={{ backgroundColor: '#0069B4', padding: 10, borderRadius: 8 }}
                  onPress={(e) => { e.stopPropagation(); resolverReporte(r.id); }}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Marcar Revisado</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ backgroundColor: '#d32f2f', padding: 10, borderRadius: 8 }}
                  onPress={(e) => { e.stopPropagation(); inhabilitarDesdeReporte(r.conductorId, 'proveedor'); }}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Inhabilitar Conductor</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )
      ) : (
        reportesConductores.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 30 }}>
            <Ionicons name="checkmark-circle-outline" size={50} color="#4CAF50" />
            <Text style={{ color: '#666', marginTop: 10 }}>No hay reportes de conductores.</Text>
          </View>
        ) : (
          reportesConductores.map((r) => (
            <TouchableOpacity
              key={r.id}
              style={[styles.recentCard, { flexDirection: 'column', alignItems: 'flex-start', backgroundColor: '#e3f2fd' }]}
              onPress={() => openDetailModal(r, 'reporte')}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, width: '100%' }}>
                <Ionicons name="warning" size={20} color="#d32f2f" style={{ marginRight: 8 }} />
                <Text style={{ fontWeight: 'bold', color: '#1565C0', fontSize: 16, flex: 1 }}>
                  Cliente: {r.clienteNombre}
                </Text>
                <TouchableOpacity
                  onPress={(e) => { e.stopPropagation(); eliminarReporte(r.id); }}
                  style={{ padding: 4 }}
                >
                  <Ionicons name="trash-outline" size={20} color="#d32f2f" />
                </TouchableOpacity>
              </View>
              <Text style={{ color: '#333', fontStyle: 'italic', marginBottom: 10 }} numberOfLines={2}>
                "{r.motivo}"
              </Text>
              <Text style={{ color: '#666', fontSize: 12, marginBottom: 15 }}>Reportado por: {r.conductorNombre}</Text>

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', width: '100%', gap: 10 }}>
                <TouchableOpacity
                  style={{ backgroundColor: '#0069B4', padding: 10, borderRadius: 8 }}
                  onPress={(e) => { e.stopPropagation(); resolverReporte(r.id); }}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Marcar Revisado</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ backgroundColor: '#d32f2f', padding: 10, borderRadius: 8 }}
                  onPress={(e) => { e.stopPropagation(); inhabilitarDesdeReporte(r.clienteId, 'cliente'); }}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Inhabilitar Cliente</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )
      )}
    </View>
  );

  // ==============================================
  // CONTENIDO DEL MODAL DE DETALLE DINÁMICO
  // ==============================================
  const renderModalContent = () => {
    if (!selectedItem) return null;

    if (modalType === 'conductor') {
      const c = selectedItem;
      return (
        <ScrollView style={{ maxHeight: 500 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1A237E', marginBottom: 15 }}>Detalles del Conductor</Text>
          <DetailRow icon="person" label="Nombre" value={c.username || c.nombre || 'No registrado'} />
          <DetailRow icon="mail" label="Email" value={c.email} />
          <DetailRow icon="card" label="Cédula" value={c.cedula || 'No registrada'} />
          <DetailRow icon="bus" label="Placa" value={c.placa || c.matriculas || 'No registrada'} />
          <DetailRow icon="car" label="Camiones" value={c.camiones || 'No especificado'} />
          <DetailRow icon="water" label="Capacidad (Lts)" value={c.capacidad || 'No especificada'} />
          <DetailRow icon="information-circle" label="Estado Cuenta" value={c.estadoCuenta || 'activa'} />
          <DetailRow icon="radio" label="En Jornada" value={(c.estado === 'activo' || c.isOnline) ? 'Sí' : 'No'} />
        </ScrollView>
      );
    }

    if (modalType === 'cliente') {
      const c = selectedItem;
      return (
        <ScrollView style={{ maxHeight: 500 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1A237E', marginBottom: 15 }}>Detalles del Cliente</Text>
          <DetailRow icon="person" label="Nombre" value={c.username || 'Sin nombre'} />
          <DetailRow icon="mail" label="Email" value={c.email} />
          <DetailRow icon="card" label="Cédula" value={c.cedula || 'No registrada'} />
          <DetailRow icon="home" label="Residencia" value={c.residencia || 'No registrada'} />
          <DetailRow icon="information-circle" label="Estado Cuenta" value={c.estadoCuenta || 'activa'} />
          {c.coordsResidencia && (
            <DetailRow
              icon="location"
              label="Coordenadas"
              value={`${c.coordsResidencia.lat?.toFixed(4) || c.coordsResidencia.latitude?.toFixed(4)}, ${c.coordsResidencia.lng?.toFixed(4) || c.coordsResidencia.longitude?.toFixed(4)}`}
            />
          )}
        </ScrollView>
      );
    }

    if (modalType === 'viaje') {
      const v = selectedItem;
      return (
        <ScrollView style={{ maxHeight: 500 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1A237E', marginBottom: 15 }}>Detalles del Viaje</Text>
          <DetailRow icon="person" label="Cliente" value={v.clienteNombre || 'No disponible'} />
          <DetailRow icon="bus" label="Conductor" value={v.conductorNombre || 'No disponible'} />
          <DetailRow icon="water" label="Litros" value={`${v.litros} Lts`} />
          <DetailRow icon="cash" label="Método de Pago" value={v.metodoPago || 'No especificado'} />
          <DetailRow icon="pricetag" label="Tarifa" value={v.tarifaAplicada ? `$${v.tarifaAplicada}` : 'No establecida'} />
          <DetailRow icon="location" label="Destino" value={v.destinoTexto || 'No disponible'} />
          <DetailRow icon="flag" label="Estado" value={v.estado || 'No disponible'} />
          <DetailRow icon="calendar" label="Fecha Solicitud" value={formatearFecha(v.fecha)} />
          {v.fechaFinalizado && <DetailRow icon="checkmark-circle" label="Fecha Finalizado" value={formatearFecha(v.fechaFinalizado)} />}
          {v.referenciaFinal && <DetailRow icon="document-text" label="Referencia de Pago" value={v.referenciaFinal} />}

          <TouchableOpacity
            style={{ backgroundColor: '#d32f2f', padding: 12, borderRadius: 10, marginTop: 20, alignItems: 'center' }}
            onPress={() => eliminarViaje(v.id)}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Eliminar Viaje</Text>
          </TouchableOpacity>
        </ScrollView>
      );
    }

    if (modalType === 'reporte') {
      const r = selectedItem;
      return (
        <ScrollView style={{ maxHeight: 500 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1A237E', marginBottom: 15 }}>Detalles del Reporte</Text>
          {r.tipo === 'cliente_reporta_conductor' ? (
            <>
              <DetailRow icon="person" label="Reportado por (Cliente)" value={r.clienteNombre} />
              <DetailRow icon="bus" label="Conductor Reportado" value={r.conductorNombre} />
            </>
          ) : (
            <>
              <DetailRow icon="bus" label="Reportado por (Conductor)" value={r.conductorNombre} />
              <DetailRow icon="person" label="Cliente Reportado" value={r.clienteNombre} />
            </>
          )}
          <View style={{ marginTop: 10 }}>
            <Text style={{ fontWeight: 'bold', color: '#333', marginBottom: 5 }}>Motivo:</Text>
            <Text style={{ color: '#333', fontStyle: 'italic', backgroundColor: '#f9f9f9', padding: 10, borderRadius: 8 }}>
              {r.motivo}
            </Text>
          </View>
          <DetailRow icon="information-circle" label="Estado" value={r.estado || 'pendiente'} />
          {r.fecha && <DetailRow icon="calendar" label="Fecha" value={formatearFecha(r.fecha)} />}

          <TouchableOpacity
            style={{ backgroundColor: '#d32f2f', padding: 12, borderRadius: 10, marginTop: 20, alignItems: 'center' }}
            onPress={() => eliminarReporte(r.id)}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Eliminar Reporte</Text>
          </TouchableOpacity>
        </ScrollView>
      );
    }

    return null;
  };

  // ==============================================
  // INTERFAZ PRINCIPAL DEL ADMINISTRADOR
  // ==============================================
  return (
    <SafeAreaView style={styles.container}>
      <View style={{
        backgroundColor: '#1A237E',
        paddingVertical: 20,
        borderBottomLeftRadius: 25,
        borderBottomRightRadius: 25,
        alignItems: 'center',
        elevation: 5
      }}>
        <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#fff', marginTop: 15 }}>Panel de Control</Text>
        <Text style={{ color: '#c5cae9' }}>Centro de Operaciones</Text>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-evenly', marginTop: 15, borderBottomWidth: 1, borderColor: '#eee' }}>
        <TouchableOpacity
          style={{ padding: 15, borderBottomWidth: activeTab === 'flota' ? 3 : 0, borderColor: '#0069B4', alignItems: 'center' }}
          onPress={() => setActiveTab('flota')}
        >
          <Ionicons name="bus-outline" size={24} color={activeTab === 'flota' ? '#0069B4' : '#888'} />
          <Text style={{ color: activeTab === 'flota' ? '#0069B4' : '#888', fontWeight: 'bold', marginTop: 4 }}>Flota</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ padding: 15, borderBottomWidth: activeTab === 'clientes' ? 3 : 0, borderColor: '#0069B4', alignItems: 'center' }}
          onPress={() => setActiveTab('clientes')}
        >
          <Ionicons name="people-outline" size={24} color={activeTab === 'clientes' ? '#0069B4' : '#888'} />
          <Text style={{ color: activeTab === 'clientes' ? '#0069B4' : '#888', fontWeight: 'bold', marginTop: 4 }}>Clientes</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ padding: 15, borderBottomWidth: activeTab === 'viajes' ? 3 : 0, borderColor: '#0069B4', alignItems: 'center' }}
          onPress={() => setActiveTab('viajes')}
        >
          <Ionicons name="map-outline" size={24} color={activeTab === 'viajes' ? '#0069B4' : '#888'} />
          <Text style={{ color: activeTab === 'viajes' ? '#0069B4' : '#888', fontWeight: 'bold', marginTop: 4 }}>Viajes</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ padding: 15, borderBottomWidth: activeTab === 'reportes' ? 3 : 0, borderColor: '#d32f2f', alignItems: 'center' }}
          onPress={() => setActiveTab('reportes')}
        >
          <Ionicons name="alert-circle-outline" size={24} color={activeTab === 'reportes' ? '#d32f2f' : '#888'} />
          <Text style={{ color: activeTab === 'reportes' ? '#d32f2f' : '#888', fontWeight: 'bold', marginTop: 4 }}>Reportes</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#0069B4" style={{ marginTop: 50 }} />
        ) : (
          <>
            {activeTab === 'flota' && renderFlota()}
            {activeTab === 'clientes' && renderClientes()}
            {activeTab === 'viajes' && renderViajes()}
            {activeTab === 'reportes' && renderReportes()}
          </>
        )}
      </ScrollView>

      {/* Modal para mostrar detalles ampliados */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: '90%', backgroundColor: '#fff', borderRadius: 20, padding: 20, maxHeight: '80%' }}>
            {renderModalContent()}
            <TouchableOpacity
              style={{ backgroundColor: '#eee', padding: 12, borderRadius: 10, marginTop: 15, alignItems: 'center' }}
              onPress={() => setModalVisible(false)}
            >
              <Text style={{ fontWeight: 'bold', color: '#333' }}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: Clave generada para conductor */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={newDriverModalVisible}
        onRequestClose={() => setNewDriverModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: '85%', backgroundColor: '#fff', borderRadius: 20, padding: 25, alignItems: 'center' }}>
            <Ionicons name="key-outline" size={60} color="#34C759" style={{ marginBottom: 15 }} />
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 5 }}>Clave generada</Text>
            <Text style={{ color: '#666', textAlign: 'center', marginBottom: 20 }}>
              Esta clave única debe compartirse con el nuevo conductor para que pueda registrarse. Se borrará automáticamente después de ser utilizada.
            </Text>
            <View style={{
              backgroundColor: '#f0f0f0',
              padding: 20,
              borderRadius: 10,
              marginBottom: 20,
              width: '100%',
              alignItems: 'center'
            }}>
              <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#1A237E', letterSpacing: 4 }}>
                {nuevaClave}
              </Text>
            </View>

            {/* Botón Copiar clave */}
            <TouchableOpacity
              style={{
                backgroundColor: '#1976D2',
                padding: 15,
                borderRadius: 10,
                width: '100%',
                alignItems: 'center',
                marginBottom: 10
              }}
              onPress={copiarClaveAlPortapapeles}
            >
              <Ionicons name="copy-outline" size={22} color="#fff" style={{ marginRight: 8 }} />
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Copiar clave</Text>
            </TouchableOpacity>

            {/* Botón Guardar en Firestore */}
            <TouchableOpacity
              style={{
                backgroundColor: '#34C759',
                padding: 15,
                borderRadius: 10,
                width: '100%',
                alignItems: 'center',
                marginBottom: 10
              }}
              onPress={guardarClaveEnFirestore}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Guardar clave y notificar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ padding: 10 }}
              onPress={() => {
                setNewDriverModalVisible(false);
                setNuevaClave('');
              }}
            >
              <Text style={{ color: '#d32f2f', fontWeight: 'bold' }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ==============================================
// COMPONENTE AUXILIAR: Fila de detalle con ícono
// ==============================================
const DetailRow = ({ icon, label, value }) => (
  <View style={{
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 8
  }}>
    <Ionicons name={icon} size={20} color="#0069B4" style={{ marginRight: 10 }} />
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 12, color: '#888' }}>{label}</Text>
      <Text style={{ fontSize: 15, color: '#333', fontWeight: '500' }}>{value}</Text>
    </View>
  </View>
);