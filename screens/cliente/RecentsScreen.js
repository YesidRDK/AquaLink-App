// screens/cliente/RecentsScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { styles } from '../../styles';

// --- IMPORTACIÓN DE ICONOS VECTORIALES ---
import { Ionicons } from '@expo/vector-icons';

// IMPORTACIONES DE FIREBASE
import { auth, db } from '../../firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';

export default function RecentsScreen({ navigation }) {
  const [recents, setRecents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOrdering, setIsOrdering] = useState(false);
  
  // --- ESTADOS PARA EL MODAL DE REPORTE ---
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [driverToReport, setDriverToReport] = useState(null);
  
  const isFocused = useIsFocused();

  // CARGAR HISTORIAL REAL DESDE FIREBASE
  useEffect(() => {
    const fetchRecents = async () => {
      if (!isFocused) return;
      setIsLoading(true);

      try {
        const user = auth.currentUser;
        if (!user) return;

        const q = query(
          collection(db, 'pedidos'),
          where('clienteId', '==', user.uid)
        );

        const querySnapshot = await getDocs(q);
        const history = [];

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.estado === 'finalizado') {
            history.push({ id: doc.id, ...data });
          }
        });

        history.sort((a, b) => new Date(b.fechaFinalizado) - new Date(a.fechaFinalizado));

        const uniqueProviders = [];
        const providerIds = new Set();

        history.forEach(order => {
          if (!providerIds.has(order.conductorId) && order.conductorId) {
            providerIds.add(order.conductorId);
            uniqueProviders.push(order);
          }
        });

        setRecents(uniqueProviders);
      } catch (error) {
        console.error("Error al cargar recientes:", error);
        Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo cargar el historial.' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecents();
  }, [isFocused]);

  // FUNCIÓN PARA EL PEDIDO RÁPIDO
  const handleQuickOrder = (item) => {
    Alert.alert(
      "⚡ Pedido Rápido",
      `¿Deseas solicitar nuevamente ${item.litros} Litros a tu destino en ${item.destinoTexto}?`,
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Sí, pedir ahora", 
          onPress: async () => {
            setIsOrdering(true);
            try {
              const nuevoPedido = {
                clienteId: auth.currentUser.uid,
                clienteNombre: item.clienteNombre,
                litros: item.litros,
                metodoPago: item.metodoPago, 
                referencia: '',
                destinoCoords: item.destinoCoords,
                destinoTexto: item.destinoTexto,
                conductorPreferenciaId: item.conductorId, 
                estado: 'buscando_conductor', 
                fecha: serverTimestamp(),
              };

              const docRef = await addDoc(collection(db, 'pedidos'), nuevoPedido);
              Toast.show({ type: 'success', text1: '¡Pedido Procesado! 🚀' });
              navigation.replace('Tracking', { pedidoId: docRef.id });
            } catch (error) {
              console.error(error);
              Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo procesar el pedido.' });
            } finally {
              setIsOrdering(false);
            }
          } 
        }
      ]
    );
  };

  // --- FUNCIONES PARA EL REPORTE ---
  const openReportModal = (driver) => {
    setDriverToReport(driver);
    setReportReason('');
    setReportModalVisible(true);
  };

  const submitReport = async () => {
    if (!reportReason.trim()) {
      Toast.show({ type: 'error', text1: 'Campo vacío', text2: 'Por favor, detalla el motivo del reporte.' });
      return;
    }

    try {
      // Guardamos el reporte en la colección "reportes"
      await addDoc(collection(db, 'reportes'), {
        clienteId: auth.currentUser.uid,
        clienteNombre: driverToReport.clienteNombre,
        conductorId: driverToReport.conductorId,
        conductorNombre: driverToReport.conductorNombre,
        motivo: reportReason,
        tipo: 'cliente_reporta_conductor', // ✅ NUEVO: Identifica el tipo de reporte
        fecha: serverTimestamp(),
        estado: 'pendiente'
      });

      Toast.show({ type: 'success', text1: 'Reporte Enviado', text2: 'Evaluaremos el caso a la brevedad.' });
      setReportModalVisible(false);
      setDriverToReport(null);
    } catch (error) {
      console.error(error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo enviar el reporte.' });
    }
  };

  const formatearFecha = (fechaIso) => {
    if (!fechaIso) return 'Reciente';
    const fecha = new Date(fechaIso);
    return fecha.toLocaleDateString('es-VE', { day: '2-digit', month: 'short' });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={{
        backgroundColor: '#0069B4', height: 90, justifyContent: 'center', alignItems: 'center',
        borderBottomLeftRadius: 35, borderBottomRightRadius: 35, elevation: 10,
        shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 5,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 25 }}>
          <Ionicons name="time" size={24} color="#fff" style={{ marginRight: 8 }} />
          <Text style={{ fontSize: 19, fontWeight: 'bold', color: '#fff', letterSpacing: 1.2, textTransform: 'uppercase' }}>
            Contactos Recientes
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionSubtitle}>Repite tu último pedido con un solo toque</Text>
        
        {isLoading ? (
          <View style={{ alignItems: 'center', marginTop: 50 }}>
            <ActivityIndicator size="large" color="#0069B4" />
            <Text style={{ color: '#888', marginTop: 10 }}>Buscando historial...</Text>
          </View>
        ) : recents.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 50 }}>
            <Ionicons name="folder-open-outline" size={60} color="#ccc" />
            <Text style={{ color: '#888', marginTop: 15, fontSize: 16 }}>Aún no tienes pedidos completados.</Text>
          </View>
        ) : (
          recents.map((item) => (
            <View key={item.id} style={styles.recentCard}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Ionicons name="car-outline" size={18} color="#333" style={{ marginRight: 6 }} />
                  <Text style={styles.recentName}>{item.conductorNombre || 'Conductor'}</Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                  <Ionicons name="water-outline" size={16} color="#0069B4" style={{ marginRight: 4 }} />
                  <Text style={styles.recentDetail}>{item.litros} Lts  •  </Text>
                  <Ionicons name="card-outline" size={16} color="#666" style={{ marginRight: 4 }} />
                  <Text style={styles.recentDetail}>{item.metodoPago}</Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                  <Ionicons name="calendar-outline" size={14} color="#4CAF50" style={{ marginRight: 4 }} />
                  <Text style={[styles.recentDetail, {color: '#4CAF50', fontWeight: 'bold'}]}>
                    Último servicio: {formatearFecha(item.fechaFinalizado)}
                  </Text>
                </View>
              </View>
              
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                
                {/* BOTÓN: REPORTAR CONDUCTOR */}
                <TouchableOpacity 
                  style={[styles.contactIcon, { backgroundColor: '#ffebee', marginRight: 8, justifyContent: 'center', alignItems: 'center' }]} 
                  onPress={() => openReportModal(item)}
                >
                  <Ionicons name="warning-outline" size={20} color="#d32f2f" />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.contactIcon, { backgroundColor: '#FFD600', marginRight: 8, opacity: isOrdering ? 0.5 : 1, justifyContent: 'center', alignItems: 'center' }]} 
                  onPress={() => handleQuickOrder(item)}
                  disabled={isOrdering}
                >
                  {isOrdering ? <ActivityIndicator size="small" color="#000" /> : <Ionicons name="flash" size={20} color="#000" />}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.contactIcon, { backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center' }]} 
                  onPress={() => navigation.navigate('Request', { 
                    directProviderId: item.conductorId, 
                    directProviderName: item.conductorNombre,
                    fixedLiters: item.litros 
                  })}
                >
                  <Ionicons name="clipboard-outline" size={20} color="#0069B4" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* --- MODAL PARA REPORTAR --- */}
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
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#333' }}>Reportar Conductor</Text>
            </View>

            <Text style={{ color: '#666', marginBottom: 15 }}>
              Estás reportando a <Text style={{ fontWeight: 'bold' }}>{driverToReport?.conductorNombre}</Text>. Por favor, describe brevemente la irregularidad:
            </Text>

            <TextInput
              style={{
                borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 15,
                height: 100, textAlignVertical: 'top', backgroundColor: '#f9f9f9', marginBottom: 20
              }}
              placeholder="Ej. Conducción imprudente, cobro indebido, daños..."
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