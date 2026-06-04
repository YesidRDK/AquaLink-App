// screens/conductor/OrderListScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator } from 'react-native';
import { styles } from '../../styles';

// --- IMPORTACIÓN DE ICONOS VECTORIALES ---
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

// IMPORTACIONES DE FIREBASE
import { auth, db } from '../../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export default function OrderListScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('pendientes');
  
  const [pendientes, setPendientes] = useState([]);
  const [completados, setCompletados] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // 1. ESCUCHAR LOS PEDIDOS REALES DEL CONDUCTOR EN FIREBASE
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, 'pedidos'),
      where('conductorId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pendientesTemp = [];
      const completadosTemp = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        
        // Clasificamos según el estado real de la base de datos
        if (data.estado === 'finalizado') {
          completadosTemp.push({ id: doc.id, ...data });
        } else if (['en_camino', 'esperando_pago', 'pago_en_revision'].includes(data.estado)) {
          pendientesTemp.push({ id: doc.id, ...data });
        }
      });

      // Ordenamos: Pendientes (el más antiguo primero), Completados (el más reciente primero)
      pendientesTemp.sort((a, b) => new Date(a.fechaAceptado) - new Date(b.fechaAceptado));
      completadosTemp.sort((a, b) => new Date(b.fechaFinalizado) - new Date(a.fechaFinalizado));

      setPendientes(pendientesTemp);
      setCompletados(completadosTemp);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. FUNCIÓN PARA RETOMAR UNA RUTA ESPECÍFICA
  const handleSeguirRuta = (pedido) => {
    navigation.navigate('Conductor', { 
      nuevoPedidoAceptado: true, 
      isOnline: true,
      destinoCoords: pedido.destinoCoords,
      pedidoIdActivo: pedido.id
    });
  };

  // Ayudantes visuales
  const getStatusColor = (estado) => {
    if (estado === 'en_camino') return '#1976D2'; // Azul
    if (estado === 'esperando_pago') return '#FF9800'; // Naranja
    if (estado === 'pago_en_revision') return '#9C27B0'; // Morado
    return '#34C759'; // Verde por defecto
  };

  const getStatusText = (estado) => {
    if (estado === 'en_camino') return 'EN RUTA AL DESTINO';
    if (estado === 'esperando_pago') return 'ESPERANDO REPORTE DE PAGO';
    if (estado === 'pago_en_revision') return 'PAGO LISTO PARA REVISIÓN';
    return 'COMPLETADO';
  };

  const formatearFecha = (fechaIso) => {
    if (!fechaIso) return 'Hoy';
    const fecha = new Date(fechaIso);
    return fecha.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* CABECERA */}
      <View style={{
        backgroundColor: '#0069B4',
        height: 90, 
        justifyContent: 'center',
        alignItems: 'center',
        borderBottomLeftRadius: 35,
        borderBottomRightRadius: 35,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 25 }}>
          <Ionicons name="list" size={26} color="#fff" style={{ marginRight: 8 }} />
          <Text style={{ fontSize: 19, fontWeight: 'bold', color: '#fff', letterSpacing: 1.2, textTransform: 'uppercase' }}>
            Mis Entregas
          </Text>
        </View>
      </View>

      <View style={{padding: 20, flex: 1}}>
        
        {/* Pestañas (SIN LÍMITE DE COLA) */}
        <View style={styles.tabContainer}>
          <TouchableOpacity style={[styles.tabButton, activeTab === 'pendientes' && styles.tabButtonActive]} onPress={() => setActiveTab('pendientes')}>
            <Text style={[styles.tabText, activeTab === 'pendientes' && styles.tabTextActive]}>Pendientes ({pendientes.length})</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabButton, activeTab === 'completados' && styles.tabButtonActive]} onPress={() => setActiveTab('completados')}>
            <Text style={[styles.tabText, activeTab === 'completados' && styles.tabTextActive]}>Completados ({completados.length})</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#0069B4" />
            <Text style={{ marginTop: 10, color: '#666' }}>Cargando operaciones...</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {activeTab === 'pendientes' ? (
              pendientes.length > 0 ? pendientes.map((item) => (
                <View key={item.id} style={styles.pedidoCard}>
                  <View style={styles.pedidoHeader}>
                    <Text style={styles.pedidoName}>{item.clienteNombre}</Text>
                    <View style={styles.badgeLitros}><Text style={styles.badgeText}>{item.litros}L</Text></View>
                  </View>
                  
                  {/* Filas de información con iconos vectoriales */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                    <Ionicons name="location-outline" size={16} color="#666" style={{ marginRight: 6 }} />
                    <Text style={styles.pedidoInfo}>{item.destinoTexto}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <Ionicons name="card-outline" size={16} color="#666" style={{ marginRight: 6 }} />
                    <Text style={styles.pedidoInfo}>Pago: {item.metodoPago}</Text>
                  </View>

                  {/* ETIQUETA DE ESTADO DINÁMICA */}
                  <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: getStatusColor(item.estado), marginRight: 6 }} />
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: getStatusColor(item.estado) }}>
                      {getStatusText(item.estado)}
                    </Text>
                  </View>

                  {/* BOTONES INTELIGENTES SEGÚN EL ESTADO */}
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
                          size={20} 
                          color="#fff" 
                          style={{ marginLeft: 8 }} 
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
              /* PESTAÑA DE COMPLETADOS REALES */
              completados.length > 0 ? completados.map((item) => (
                <View key={item.id} style={[styles.pedidoCard, { opacity: 0.8, backgroundColor: '#f9f9f9' }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[styles.pedidoName, { color: '#34C759' }]}>{item.clienteNombre}</Text>
                      <Ionicons name="checkmark-circle" size={18} color="#34C759" style={{ marginLeft: 6 }} />
                    </View>
                    <Text style={{ color: '#888', fontSize: 12, fontWeight: 'bold' }}>{formatearFecha(item.fechaFinalizado)}</Text>
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
    </SafeAreaView>
  );
}