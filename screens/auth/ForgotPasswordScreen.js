import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { styles } from '../../styles';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

// IMPORTACIONES DE FIREBASE
import { auth } from '../../firebase'; // Asegúrate de que la ruta sea correcta
import { sendPasswordResetEmail } from 'firebase/auth';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!email) {
      Toast.show({ type: 'error', text1: 'Correo requerido', text2: 'Por favor, ingresa tu dirección de correo.' });
      return;
    }

    // Validación básica de formato de correo
    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(email)) {
      Toast.show({ type: 'error', text1: 'Formato inválido', text2: 'Ingresa un correo electrónico válido.' });
      return;
    }

    setIsLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setIsLoading(false);
      
      Alert.alert(
        "¡Correo Enviado!",
        "Revisa tu bandeja de entrada o la carpeta de spam para restablecer tu contraseña.",
        [{ text: "Entendido", onPress: () => navigation.goBack() }]
      );
      
    } catch (error) {
      setIsLoading(false);
      let errorMsg = "Ocurrió un error al intentar enviar el correo.";
      
      if (error.code === 'auth/user-not-found') {
        errorMsg = "No hay ningún usuario registrado con este correo.";
      } else if (error.code === 'auth/invalid-email') {
        errorMsg = "El correo electrónico no es válido.";
      }

      Toast.show({ type: 'error', text1: 'Error', text2: errorMsg });
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#fff' }]}>
      
      {/* BOTÓN DE VOLVER */}
      <TouchableOpacity 
        style={{ position: 'absolute', top: 50, left: 20, zIndex: 10, flexDirection: 'row', alignItems: 'center' }} 
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color="#0069B4" />
      </TouchableOpacity>

      <View style={{ flex: 1, justifyContent: 'center', padding: 25 }}>
        
        {/* ICONO Y TÍTULO */}
        <View style={{ alignItems: 'center', marginBottom: 30 }}>
          <View style={{ backgroundColor: '#e3f2fd', padding: 20, borderRadius: 50, marginBottom: 15 }}>
            <Ionicons name="lock-closed-outline" size={60} color="#0069B4" />
          </View>
          <Text style={{ fontSize: 26, fontWeight: 'bold', color: '#333', textAlign: 'center' }}>
            Recuperar Contraseña
          </Text>
          <Text style={{ fontSize: 15, color: '#666', textAlign: 'center', marginTop: 10, paddingHorizontal: 10 }}>
            Ingresa el correo electrónico asociado a tu cuenta y te enviaremos las instrucciones para recuperarla.
          </Text>
        </View>

        {/* INPUT DE CORREO */}
        <View style={{ marginBottom: 25 }}>
          <Text style={{ fontWeight: 'bold', color: '#333', marginBottom: 8, marginLeft: 5 }}>Correo Electrónico</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ccc', borderRadius: 10, paddingHorizontal: 15, backgroundColor: '#f9f9f9' }}>
            <Ionicons name="mail-outline" size={20} color="#666" style={{ marginRight: 10 }} />
            <TextInput
              style={{ flex: 1, height: 50, fontSize: 16, color: '#333' }}
              placeholder="ejemplo@correo.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>
        </View>

        {/* BOTÓN DE ENVÍO */}
        <TouchableOpacity 
          style={[styles.mainButton, { backgroundColor: '#0069B4', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]} 
          onPress={handleResetPassword}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.mainButtonText}>Enviar Instrucciones</Text>
              <Ionicons name="send" size={18} color="#fff" style={{ marginLeft: 8 }} />
            </>
          )}
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}