// ================================================
// Pantalla: Perfil del Conductor
// Permite al conductor visualizar y editar sus
// datos personales, del vehículo y bancarios.
// Los cambios se guardan en Firestore.
// ================================================

import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  SafeAreaView, ActivityIndicator
} from 'react-native';
import Toast from 'react-native-toast-message';
import { styles } from '../../styles';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

// Firebase Firestore
import { auth, db } from '../../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export default function DriverProfileScreen({ navigation }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Datos del perfil del conductor
  const [userProfile, setUserProfile] = useState({
    username: '',
    email: '',
    cedula: '',
    role: 'conductor',
    matriculas: '',
    capacidadTanque: '10000',
    banco: '',
    telefonoPago: '',
    cuentaBancaria: ''
  });

  // ==============================================
  // Cargar datos del conductor desde Firestore
  // ==============================================
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserProfile({
              ...userProfile,
              ...data,
              capacidadTanque: data.capacidadTanque || data.capacidad || '10000'
            });
          }
        }
        setIsLoading(false);
      } catch (error) {
        console.error("Error al cargar perfil:", error);
        Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudieron cargar tus datos.' });
        setIsLoading(false);
      }
    };
    fetchUserData();
  }, []);

  // Actualizar estado local al editar campos
  const handleChange = (campo, valor) => {
    setUserProfile(prevState => ({ ...prevState, [campo]: valor }));
  };

  // ==============================================
  // Guardar cambios en Firestore
  // ==============================================
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const user = auth.currentUser;
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        matriculas: userProfile.matriculas || '',
        capacidadTanque: userProfile.capacidadTanque || '10000',
        banco: userProfile.banco || '',
        telefonoPago: userProfile.telefonoPago || '',
        cedula: userProfile.cedula || '',
        cuentaBancaria: userProfile.cuentaBancaria || ''
      });
      setIsEditing(false);
      Toast.show({
        type: 'success',
        text1: '¡Perfil actualizado! ✅',
        text2: 'Tus datos de pago y capacidad fueron guardados.'
      });
    } catch (error) {
      console.error(error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudieron guardar los cambios.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Indicador de carga
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0069B4" />
        <Text style={{ marginTop: 10, color: '#666' }}>Cargando información del conductor...</Text>
      </View>
    );
  }

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
          <Text style={{
            fontSize: 20, fontWeight: 'bold', color: '#fff',
            letterSpacing: 1.2, textTransform: 'uppercase'
          }}>
            Configuración de Perfil
          </Text>
          <Ionicons name="person-circle-outline" size={28} color="#fff" style={{ marginLeft: 8 }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContainer, { paddingTop: 20, paddingBottom: 80 }]} showsVerticalScrollIndicator={false}>
        {/* Sección: Información General */}
        <View style={styles.infoCard}>
          <Text style={[styles.sectionTitle, { color: '#0069B4', marginBottom: 10 }]}>Información General</Text>
          {isEditing ? (
            <>
              <EditRow label="Matrículas" value={userProfile.matriculas} onChange={(t) => handleChange('matriculas', t)}
                icon={<Ionicons name="car-outline" size={24} color="#0069B4" />} />
              <EditRow label="Capacidad (Lts)" value={userProfile.capacidadTanque} onChange={(t) => handleChange('capacidadTanque', t)}
                icon={<Ionicons name="water-outline" size={24} color="#0069B4" />} keyboardType="numeric" />
            </>
          ) : (
            <>
              <InfoRow label="Correo Electrónico" value={userProfile.email}
                icon={<Ionicons name="mail-outline" size={24} color="#0069B4" />} />
              <InfoRow label="Matrículas" value={userProfile.matriculas || 'No definidas'}
                icon={<Ionicons name="car-outline" size={24} color="#0069B4" />} />
              <InfoRow label="Capacidad Total" value={`${userProfile.capacidadTanque} Lts`}
                icon={<Ionicons name="water-outline" size={24} color="#0069B4" />} />
            </>
          )}
        </View>

        {/* Sección: Datos para recibir pagos */}
        <View style={[styles.infoCard, { marginTop: 20, borderColor: '#35FC51', borderLeftWidth: 5 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <MaterialCommunityIcons name="cash-fast" size={24} color="#34C759" style={{ marginRight: 8 }} />
            <Text style={[styles.sectionTitle, { color: '#34C759', marginBottom: 0 }]}>Datos para Recibir Pagos</Text>
          </View>
          <Text style={{ fontSize: 12, color: '#666', marginBottom: 10, fontStyle: 'italic' }}>
            Esta información se mostrará al cliente cuando aceptes un servicio.
          </Text>

          {isEditing ? (
            <>
              <EditRow label="Banco" value={userProfile.banco} onChange={(t) => handleChange('banco', t)}
                icon={<MaterialCommunityIcons name="bank-outline" size={24} color="#34C759" />} />
              <EditRow label="Teléfono (Pago Móvil)" value={userProfile.telefonoPago} onChange={(t) => handleChange('telefonoPago', t)}
                icon={<Ionicons name="phone-portrait-outline" size={24} color="#34C759" />} keyboardType="phone-pad" />
              <EditRow label="Cédula / RIF" value={userProfile.cedula} onChange={(t) => handleChange('cedula', t)}
                icon={<MaterialCommunityIcons name="card-account-details-outline" size={24} color="#34C759" />} />
              <EditRow label="Número de Cuenta" value={userProfile.cuentaBancaria} onChange={(t) => handleChange('cuentaBancaria', t)}
                icon={<MaterialCommunityIcons name="bank-transfer" size={28} color="#34C759" />} keyboardType="numeric" />
            </>
          ) : (
            <>
              <InfoRow label="Banco" value={userProfile.banco || 'No definido'}
                icon={<MaterialCommunityIcons name="bank-outline" size={24} color="#34C759" />} />
              <InfoRow label="Teléfono" value={userProfile.telefonoPago || 'No definido'}
                icon={<Ionicons name="phone-portrait-outline" size={24} color="#34C759" />} />
              <InfoRow label="Cédula / RIF" value={userProfile.cedula || 'No definido'}
                icon={<MaterialCommunityIcons name="card-account-details-outline" size={24} color="#34C759" />} />
              <InfoRow label="Cuenta" value={userProfile.cuentaBancaria || 'No definida'}
                icon={<MaterialCommunityIcons name="bank-transfer" size={28} color="#34C759" />} />
            </>
          )}
        </View>

        {/* Botones de acción */}
        <TouchableOpacity
          style={[styles.mainButton, {
            marginTop: 30, backgroundColor: isEditing ? '#34C759' : '#0069B4',
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center'
          }]}
          onPress={isEditing ? handleSave : () => setIsEditing(true)}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.mainButtonText}>
                {isEditing ? 'Guardar Cambios' : 'Editar Información'}
              </Text>
              <Ionicons name={isEditing ? "save-outline" : "pencil"}
                size={20} color="#fff" style={{ marginLeft: 8 }} />
            </>
          )}
        </TouchableOpacity>

        {isEditing && !isSaving && (
          <TouchableOpacity style={{ marginTop: 15 }} onPress={() => setIsEditing(false)}>
            <Text style={{ textAlign: 'center', color: '#d32f2f', fontWeight: 'bold' }}>Cancelar</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ==============================================
// Componente: Fila de información (solo lectura)
// ==============================================
const InfoRow = ({ label, value, icon }) => (
  <View style={[styles.infoRow, { borderBottomColor: '#eee', alignItems: 'center' }]}>
    <View style={{ width: 40, alignItems: 'center', justifyContent: 'center' }}>{icon}</View>
    <View style={{ flex: 1 }}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, { color: '#333' }]}>{value}</Text>
    </View>
  </View>
);

// ==============================================
// Componente: Fila de edición (campo modificable)
// ==============================================
const EditRow = ({ label, value, onChange, icon, keyboardType = "default" }) => (
  <View style={[styles.infoRow, { borderBottomColor: '#ddd', alignItems: 'center' }]}>
    <View style={{ width: 40, alignItems: 'center', justifyContent: 'center' }}>{icon}</View>
    <View style={{ flex: 1 }}>
      <Text style={styles.infoLabel}>{label}</Text>
      <TextInput
        style={{ fontSize: 16, color: '#0069B4', fontWeight: 'bold', paddingVertical: 5 }}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
      />
    </View>
  </View>
);