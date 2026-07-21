// ================================================
// Pantalla: Perfil del Conductor
// Permite al conductor visualizar y editar sus
// datos personales, del vehículo, bancarios
// y cambiar su contraseña (requiere la actual).
// Los cambios se guardan en Firestore y Firebase Auth.
// ================================================

import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  SafeAreaView, ActivityIndicator, Modal, Alert
} from 'react-native';
import Toast from 'react-native-toast-message';
import { styles } from '../../styles';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

// Firebase Firestore y Auth
import { auth, db } from '../../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';

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

  // --- Estados para cambio de contraseña ---
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

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

  // ==============================================
  // Cambiar contraseña en Firebase Auth (con verificación de contraseña actual)
  // ==============================================
  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Campos vacíos', 'Por favor, completa todos los campos de contraseña.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Contraseña débil', 'La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('No coinciden', 'Las nuevas contraseñas no coinciden. Verifica e intenta de nuevo.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const user = auth.currentUser;
      // Reautenticar con la contraseña actual
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      // Si es correcta, actualizar la contraseña
      await updatePassword(user, newPassword);
      Alert.alert('¡Contraseña actualizada!', 'Tu contraseña se cambió correctamente.');
      setPasswordModalVisible(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error(error);
      if (error.code === 'auth/wrong-password') {
        Alert.alert('Contraseña incorrecta', 'La contraseña actual no es válida.');
      } else {
        Alert.alert('Error', 'No se pudo cambiar la contraseña. Intenta de nuevo más tarde.');
      }
    } finally {
      setIsChangingPassword(false);
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

        {/* Botón para cambiar contraseña */}
        <TouchableOpacity
          style={[styles.mainButton, {
            marginTop: 20, backgroundColor: '#FF9800',
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center'
          }]}
          onPress={() => setPasswordModalVisible(true)}
        >
          <Ionicons name="lock-closed-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.mainButtonText}>Cambiar Contraseña</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Modal para cambio de contraseña */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={passwordModalVisible}
        onRequestClose={() => setPasswordModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: '85%', backgroundColor: '#fff', borderRadius: 20, padding: 25 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 5 }}>Cambiar Contraseña</Text>
            <Text style={{ color: '#666', marginBottom: 20 }}>Ingresa tu contraseña actual y la nueva.</Text>

            <Text style={styles.label}>Contraseña actual</Text>
            <TextInput
              style={[styles.input, { marginBottom: 15 }]}
              placeholder="Contraseña actual"
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />

            <Text style={styles.label}>Nueva contraseña</Text>
            <TextInput
              style={[styles.input, { marginBottom: 15 }]}
              placeholder="Mínimo 6 caracteres"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />

            <Text style={styles.label}>Confirmar nueva contraseña</Text>
            <TextInput
              style={[styles.input, { marginBottom: 20 }]}
              placeholder="Repite la nueva contraseña"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <TouchableOpacity
              style={[styles.mainButton, { backgroundColor: '#FF9800', flexDirection: 'row', justifyContent: 'center' }]}
              onPress={handleChangePassword}
              disabled={isChangingPassword}
            >
              {isChangingPassword ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.mainButtonText}>Actualizar Contraseña</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={{ marginTop: 15, alignItems: 'center' }}
              onPress={() => {
                setPasswordModalVisible(false);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
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