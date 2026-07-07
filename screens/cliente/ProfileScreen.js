// ================================================
// Pantalla: Perfil del Cliente
// Permite al cliente visualizar y editar sus
// datos personales (nombre, cédula, residencia).
// Los cambios se guardan en Firestore.
// ================================================

import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  SafeAreaView, ActivityIndicator
} from 'react-native';
import Toast from 'react-native-toast-message';
import { styles } from '../../styles';
import { Ionicons } from '@expo/vector-icons';

// Firebase Firestore
import { auth, db } from '../../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export default function ProfileScreen({ navigation }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [userProfile, setUserProfile] = useState({
    username: '',
    email: '',
    cedula: '',
    residencia: '',
  });

  // ==============================================
  // Cargar datos del usuario desde Firestore
  // ==============================================
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) setUserProfile(userDoc.data());
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
        username: userProfile.username,
        cedula: userProfile.cedula,
        residencia: userProfile.residencia,
      });
      setIsEditing(false);
      setIsSaving(false);
      Toast.show({ type: 'success', text1: '¡Perfil actualizado! ✅', text2: 'Tus cambios se guardaron en la nube.' });
    } catch (error) {
      setIsSaving(false);
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudieron guardar los cambios.' });
    }
  };

  // Indicador de carga
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0069B4" />
        <Text style={{ marginTop: 10, color: '#666' }}>Cargando tu información...</Text>
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
            fontSize: 19, fontWeight: 'bold', color: '#fff',
            letterSpacing: 1.2, textTransform: 'uppercase'
          }}>
            Mi Perfil
          </Text>
          <Ionicons name="person-circle-outline" size={26} color="#fff" style={{ marginLeft: 8 }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContainer, { paddingTop: 20, paddingBottom: 80 }]} showsVerticalScrollIndicator={false}>
        {/* Avatar e inicial */}
        <View style={styles.profileHeader}>
          <View style={[styles.avatarCircle, { backgroundColor: '#0069B4' }]}>
            <Text style={styles.avatarText}>
              {userProfile.username ? userProfile.username.charAt(0).toUpperCase() : '?'}
            </Text>
          </View>
          <Text style={[styles.profileName, { color: '#333' }]}>@{userProfile.username || 'usuario'}</Text>
          <Text style={styles.profileRole}>CLIENTE REGISTRADO</Text>
        </View>

        {/* Datos de cuenta */}
        <View style={[styles.infoCard, { borderColor: '#59B5E7', borderLeftWidth: 5 }]}>
          <Text style={[styles.sectionTitle, { color: '#0069B4', marginBottom: 15 }]}>Datos de Cuenta</Text>

          {isEditing ? (
            <>
              <EditRow label="Nombre de Usuario" value={userProfile.username}
                onChange={(t) => handleChange('username', t)}
                icon={<Ionicons name="person-outline" size={24} color="#0069B4" />} />
              <EditRow label="Cédula" value={userProfile.cedula}
                onChange={(t) => handleChange('cedula', t)}
                icon={<Ionicons name="card-outline" size={24} color="#0069B4" />} keyboardType="numeric" />
              <EditRow label="Residencia" value={userProfile.residencia}
                onChange={(t) => handleChange('residencia', t)}
                icon={<Ionicons name="home-outline" size={24} color="#0069B4" />} />
            </>
          ) : (
            <>
              <InfoRow label="Correo" value={userProfile.email}
                icon={<Ionicons name="mail-outline" size={24} color="#0069B4" />} />
              <InfoRow label="Cédula" value={userProfile.cedula}
                icon={<Ionicons name="card-outline" size={24} color="#0069B4" />} />
              <InfoRow label="Dirección Guardada" value={userProfile.residencia}
                icon={<Ionicons name="home-outline" size={24} color="#0069B4" />} />
            </>
          )}
        </View>

        {/* Botón de editar / guardar */}
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

        {/* Cancelar edición */}
        {isEditing && !isSaving && (
          <TouchableOpacity
            style={{ marginTop: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
            onPress={() => setIsEditing(false)}
          >
            <Ionicons name="close" size={18} color="#d32f2f" style={{ marginRight: 4 }} />
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
      <Text style={[styles.infoValue, { color: '#333' }]}>{value || 'No definido'}</Text>
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