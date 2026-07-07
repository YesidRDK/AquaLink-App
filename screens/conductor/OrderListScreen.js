// ================================================
// Pantalla: Lista de Pedidos del Conductor
// Muestra los pedidos activos (pendientes) y el
// historial de entregas completadas. Permite
// retomar rutas, verificar pagos y reportar
// clientes desde los pedidos finalizados.
// ================================================

import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, SafeAreaView,
  ActivityIndicator, Modal, TextInput
} from 'react-native';
import Toast from 'react-native-toast-message';
import { styles } from '../../styles';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

// Firebase Firestore
import { auth, db } from '../../firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';

export default function OrderListScreen({ navigation }) {
  // ==============================================
  // ESTADOS
  // ==============================================
  const [activeTab, setActiveTab] = useState('pendientes'); // Pestaña activa
  const [pendientes, setPendientes] = useState([]);
  const [completados, setCompletados] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Control del modal de reporte de cliente
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [clientToReport, setClientToReport] = useState(null);

  // ==============================================
  // EFECTO: Escuchar pedidos en tiempo real
  // ==============================================
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(collection(db, 'pedidos'), where('conductorId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pendientesTemp = [];
      const completadosTemp = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.estado === 'finalizado') {
          completadosTemp.push({ id: doc.id, ...data });
        } else if (['en_camino', 'esperando_pago', 'pago_en_revision'].includes(data.estado)) {
          pendientesTemp.push({ id: doc.id, ...data });
        }
      });

      // Ordenar por fecha
      pendientesTemp.sort((a, b) => new Date(a.fechaAceptado) - new Date(b.fechaAceptado));
      completadosTemp.sort((a, b) => new Date(b.fechaFinalizado) - new Date(a.fechaFinalizado));

      setPendientes(pendientesTemp);
      setCompletados(completadosTemp);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ==============================================
  // Retomar la navegación de un pedido activo
  // ==============================================
  const handleSeguirRuta = (pedido) => {
    navigation.navigate('Conductor', {
      nuevoPedidoAceptado: true,
      isOnline: true,
      destinoCoords: pedido.destinoCoords,
      pedidoIdActivo: pedido.id
    });
  };

  // ==============================================
  // FUNCIONES DE REPORTE DE CLIENTE
  // ==============================================

  // Abrir modal para escribir el motivo del reporte
  const openReportModal = (pedido) => {
    setClientToReport(pedido);
    setReportReason('');
    setReportModalVisible(true);
  };

  // Enviar reporte a la colección "reportes" en Firestore
  const submitReport = async () => {
    if (!reportReason.trim()) {
      Toast.show({ type: 'error', text1: 'Campo vacío', text2: 'Describe el motivo del reporte.' });
      return;
    }
    try {
      const user = auth.currentUser;
      const conductorNombre = clientToReport?.conductorNombre || user.displayName || 'Conductor';

      await addDoc(collection(db, 'reportes'), {
        clienteId: clientToReport.clienteId,
        clienteNombre: clientToReport.clienteNombre,
        conductorId: user.uid,
        conductorNombre: conductorNombre,
        motivo: reportReason,
        tipo: 'conductor_reporta_cliente',
        fecha: serverTimestamp(),
        estado: 'pendiente'
      });

      Toast.show({ type: 'success', text1: 'Reporte Enviado', text2: 'El administrador revisará el caso.' });
      setReportModalVisible(false);
      setClientToReport(null);
    } catch (error) {
      console.error(error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo enviar el reporte.' });
    }
  };

  // ==============================================
  // FUNCIONES AUXILIARES DE ESTILO
  // ==============================================

  // Color según el estado del pedido
  const getStatusColor = (estado) => {
    if (estado === 'en_camino') return '#1976D2';
    if (estado === 'esperando_pago') return '#FF9800';
    if (estado === 'pago_en_revision') return '#9C27B0';
    return '#34C759';
  };

  // Texto descriptivo del estado
  const getStatusText = (estado) => {
    if (estado === 'en_camino') return 'EN RUTA AL DESTINO';
    if (estado === 'esperando_pago') return 'ESPERANDO REPORTE DE PAGO';
    if (estado === 'pago_en_revision') return 'PAGO LISTO PARA REVISIÓN';
    return 'COMPLETADO';
  };

  // Formatear fecha a hora legible
  const formatearFecha = (fechaIso) => {
    if (!fechaIso) return 'Hoy';
    const fecha = new Date(fechaIso);
    return fecha.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
  };

  // ==============================================
  // INTERFAZ DE USUARIO
  // ==============================================
  return (
    <SafeAreaView style={styles.container}>
      {/* Cabecera */}
      <View style={{
        backgroundColor: '#0069B4', height: 90, justifyContent: 'center',
        alignItems: 'center', borderBottomLeftRadius: 35, borderBottomRightRadius: 35,
        elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3, shadowRadius: 5
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 25 }}>
          <Ionicons name="list" size={26} color="#fff" style={{ marginRight: 8 }} />
          <Text style={{
            fontSize: 19, fontWeight: 'bold', color: '#fff',
            letterSpacing: 1.2, textTransform: 'uppercase'
          }}>
            Mis Entregas
          </Text>
        </View>
      </View>

      <View style={{ padding: 20, flex: 1 }}>
        {/* Pestañas: Pendientes / Completados */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'pendientes' && styles.tabButtonActive]}
            onPress={() => setActiveTab('pendientes')}
          >
            <Text style={[styles.tabText, activeTab === 'pendientes' && styles.tabTextActive]}>
              Pendientes ({pendientes.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'completados' && styles.tabButtonActive]}
            onPress={() => setActiveTab('completados')}
          >
            <Text style={[styles.tabText, activeTab === 'completados' && styles.tabTextActive]}>
              Completados ({completados.length})
            </Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#0069B4" />
            <Text style={{ marginTop: 10, color: '#666' }}>Cargando operaciones...</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Pestaña de pendientes */}
            {activeTab === 'pendientes' ? (
              pendientes.length > 0 ? pendientes.map((item) => (
                <View key={item.id} style={styles.pedidoCard}>
                  <View style={styles.pedidoHeader}>
                    <Text style={styles.pedidoName}>{item.clienteNombre}</Text>
                    <View style={styles.badgeLitros}><Text style={styles.badgeText}>{item.litros}L</Text></View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                    <Ionicons name="location-outline" size={16} color="#666" style={{ marginRight: 6 }} />
                    <Text style={styles.pedidoInfo}>{item.destinoTexto}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <Ionicons name="card-outline" size={16} color="#666" style={{ marginRight: 6 }} />
                    <Text style={styles.pedidoInfo}>Pago: {item.metodoPago}</Text>
                  </View>

                  {/* Indicador de estado */}
                  <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{
                      width: 8, height: 8, borderRadius: 4,
                      backgroundColor: getStatusColor(item.estado), marginRight: 6
                    }} />
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: getStatusColor(item.estado) }}>
                      {getStatusText(item.estado)}
                    </Text>
                  </View>

                  {/* Acciones según el estado */}
                  <View style={{ marginTop: 15 }}>
                    {item.estado === 'en_camino' && (
                      <TouchableOpacity
                        style={[styles.mainButton, { backgroundColor: '#1976D2', width: '100%', paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
                        onPress={() => handleSeguirRuta(item)}
                      >
                        <Text style={[styles.mainButtonText, { fontSize: 15 }]}>Seguir esta orden</Text>
                        <Ionicons name="map-outline" size={20} color="#fff" style={{ marginLeft: 8 }} />
                      </TouchableOpacity>
                    )}

                    {(item.estado === 'esperando_pago' || item.estado === 'pago_en_revision') && (
                      <TouchableOpacity
                        style={[styles.mainButton, { backgroundColor: item.estado === 'pago_en_revision' ? '#9C27B0' : '#FF9800', width: '100%', paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
                        onPress={() => navigation.navigate('WaitingPayment', { pedidoId: item.id })}
                      >
                        <Text style={[styles.mainButtonText, { fontSize: 15 }]}>
                          {item.estado === 'pago_en_revision' ? 'Verificar Comprobante' : 'Revisar Estado de Pago'}
                        </Text>
                        <Ionicons
                          name={item.estado === 'pago_en_revision' ? "search-outline" : "hourglass-outline"}
                          size={20} color="#fff" style={{ marginLeft: 8 }}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )) : (
                <View style={{ alignItems: 'center', marginTop: 50 }}>
                  <MaterialCommunityIcons name="clipboard-text-off-outline" size={60} color="#ccc" style={{ marginBottom: 10 }} />
                  <Text style={styles.emptyText}>No tienes pedidos en cola.</Text>
                </View>
              )
            ) : (
              /* Pestaña de completados */
              completados.length > 0 ? completados.map((item) => (
                <View key={item.id} style={[styles.pedidoCard, { opacity: 0.8, backgroundColor: '#f9f9f9' }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[styles.pedidoName, { color: '#34C759' }]}>{item.clienteNombre}</Text>
                      <Ionicons name="checkmark-circle" size={18} color="#34C759" style={{ marginLeft: 6 }} />
                    </View>
                    <Text style={{ color: '#888', fontSize: 12, fontWeight: 'bold' }}>
                      {formatearFecha(item.fechaFinalizado)}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                    <Ionicons name="location-outline" size={14} color="#666" style={{ marginRight: 4 }} />
                    <Text style={styles.pedidoInfo}>{item.destinoTexto}</Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <Ionicons name="water-outline" size={14} color="#0069B4" style={{ marginRight: 2 }} />
                    <Text style={styles.pedidoInfo}>{item.litros}L  •  </Text>
                    <Ionicons name="card-outline" size={14} color="#666" style={{ marginRight: 4 }} />
                    <Text style={styles.pedidoInfo}>{item.metodoPago}</Text>
                  </View>

                  {/* Botón para reportar al cliente */}
                  <TouchableOpacity
                    style={{
                      marginTop: 12, backgroundColor: '#ffebee', padding: 10,
                      borderRadius: 10, flexDirection: 'row', alignItems: 'center',
                      justifyContent: 'center', borderWidth: 1, borderColor: '#ffcdd2'
                    }}
                    onPress={() => openReportModal(item)}
                  >
                    <Ionicons name="warning-outline" size={18} color="#d32f2f" style={{ marginRight: 6 }} />
                    <Text style={{ color: '#d32f2f', fontWeight: 'bold', fontSize: 14 }}>Reportar Cliente</Text>
                  </TouchableOpacity>
                </View>
              )) : (
                <View style={{ alignItems: 'center', marginTop: 50 }}>
                  <Ionicons name="trophy-outline" size={60} color="#ccc" style={{ marginBottom: 10 }} />
                  <Text style={styles.emptyText}>Aún no has completado entregas hoy.</Text>
                </View>
              )
            )}
          </ScrollView>
        )}
      </View>

      {/* Modal para reportar cliente */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={reportModalVisible}
        onRequestClose={() => setReportModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: '85%', backgroundColor: '#fff', borderRadius: 20, padding: 20, elevation: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
              <Ionicons name="warning" size={28} color="#d32f2f" style={{ marginRight: 10 }} />
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#333' }}>Reportar Cliente</Text>
            </View>

            <Text style={{ color: '#666', marginBottom: 15 }}>
              Estás reportando a <Text style={{ fontWeight: 'bold' }}>{clientToReport?.clienteNombre}</Text>.
              Describe el inconveniente presentado:
            </Text>

            <TextInput
              style={{
                borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 15,
                height: 100, textAlignVertical: 'top', backgroundColor: '#f9f9f9', marginBottom: 20
              }}
              placeholder="Ej. Mala recepción, ubicación errónea, cancelación al llegar..."
              multiline={true}
              value={reportReason}
              onChangeText={setReportReason}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity
                style={{ flex: 1, padding: 12, alignItems: 'center', borderRadius: 10, backgroundColor: '#eee', marginRight: 10 }}
                onPress={() => setReportModalVisible(false)}
              >
                <Text style={{ color: '#333', fontWeight: 'bold' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, padding: 12, alignItems: 'center', borderRadius: 10, backgroundColor: '#d32f2f' }}
                onPress={submitReport}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Enviar Reporte</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}