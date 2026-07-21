// ================================================
// Pantalla: Login y Registro
// Gestiona el acceso de clientes, proveedores y
// administrador mediante Firebase Auth y Firestore.
// Incluye verificación de cuentas inhabilitadas y
// validación de códigos de autorización para
// conductores desde Firestore.
// ================================================

import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Alert,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import Toast from 'react-native-toast-message';
import { styles } from '../../styles';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'react-native';

// Firebase Authentication y Firestore
import { auth, db } from '../../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';

export default function LoginScreen({ navigation, route }) {
  // ==============================================
  // ESTADOS
  // ==============================================
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [role, setRole] = useState('cliente');

  // Datos del formulario
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [cedula, setCedula] = useState('');
  const [residencia, setResidencia] = useState('');
  const [coordsResidencia, setCoordsResidencia] = useState(null);
  const [camiones, setCamiones] = useState('');
  const [matriculas, setMatriculas] = useState('');
  const [capacidad, setCapacidad] = useState('');
  const [authCode, setAuthCode] = useState('');

  // ==============================================
  // EFECTO: Recuperar datos al regresar del mapa
  // ==============================================
  useEffect(() => {
    if (route.params?.ubicacionSeleccionada) {
      setCoordsResidencia(route.params.ubicacionSeleccionada);
      if (route.params.username) setUsername(route.params.username);
      if (route.params.email) setEmail(route.params.email);
      if (route.params.password) setPassword(route.params.password);
      if (route.params.cedula) setCedula(route.params.cedula);
      if (route.params.residencia) setResidencia(route.params.residencia);
      if (route.params.role) setRole(route.params.role);
      setIsRegistering(true);
    }
  }, [route.params]);

  // ==============================================
  // FUNCIÓN PRINCIPAL: Login o Registro
  // ==============================================
  const handleAction = async () => {
    if (!email || !password) {
      Toast.show({ type: 'error', text1: 'Campos vacíos', text2: 'Por favor, ingresa tu correo y contraseña.' });
      return;
    }
    setIsLoading(true);

    // --- FLUJO DE REGISTRO ---
    if (isRegistering) {
      if (role === 'cliente' && !coordsResidencia) {
        Toast.show({ type: 'error', text1: 'Falta Ubicación', text2: 'Selecciona tu ubicación exacta en el mapa.' });
        setIsLoading(false);
        return;
      }

      // Validar código de autorización para proveedores desde Firestore
      if (role === 'proveedor') {
        if (!authCode) {
          Toast.show({ type: 'error', text1: 'Código requerido', text2: 'Debes ingresar un código de autorización.' });
          setIsLoading(false);
          return;
        }
        try {
          const q = query(
            collection(db, 'codigosAutorizacion'),
            where('codigo', '==', authCode),
            where('estado', '==', 'disponible')
          );
          const snap = await getDocs(q);
          if (snap.empty) {
            Toast.show({ type: 'error', text1: 'Código Inválido', text2: 'El código de autorización es incorrecto o ya fue utilizado.' });
            setIsLoading(false);
            return;
          }
          // El código es válido: eliminarlo para que no se reutilice
          snap.forEach(async (document) => {
            await deleteDoc(doc(db, 'codigosAutorizacion', document.id));
          });
        } catch (error) {
          console.error('Error validando código:', error);
          Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo verificar el código. Intenta de nuevo.' });
          setIsLoading(false);
          return;
        }
      }

      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const userData = {
          uid: user.uid,
          role: role,
          email: email,
          username: username,
          cedula: cedula,
          fechaRegistro: new Date().toISOString(),
          estadoCuenta: 'activa'
        };

        if (role === 'cliente') {
          userData.residencia = residencia;
          userData.coordsResidencia = coordsResidencia;
        } else {
          userData.camiones = camiones;
          userData.matriculas = matriculas;
          userData.capacidad = capacidad;
        }

        await setDoc(doc(db, 'users', user.uid), userData);
        Toast.show({ type: 'success', text1: '¡Registro Exitoso! ✅', text2: 'Bienvenido al sistema.' });
        setIsLoading(false);
        navigation.replace(role === 'proveedor' ? 'Conductor' : 'Home');
      } catch (error) {
        setIsLoading(false);
        let errorMsg = 'Ocurrió un error al registrar.';
        if (error.code === 'auth/email-already-in-use') errorMsg = 'Este correo ya está registrado.';
        if (error.code === 'auth/weak-password') errorMsg = 'La contraseña debe tener al menos 6 caracteres.';
        Toast.show({ type: 'error', text1: 'Error de Registro', text2: errorMsg });
      }
    }
    // --- FLUJO DE INICIO DE SESIÓN ---
    else {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const userDoc = await getDoc(doc(db, 'users', user.uid));

        if (userDoc.exists()) {
          const userData = userDoc.data();

          // Bloquear acceso si la cuenta está inhabilitada
          if (userData.estadoCuenta === 'inhabilitada') {
            await signOut(auth);
            setIsLoading(false);
            Toast.show({
              type: 'error',
              text1: 'Cuenta Inhabilitada 🚫',
              text2: 'Tu cuenta ha sido suspendida temporalmente. Contacta al administrador.',
              visibilityTime: 4000
            });
            return;
          }

          Toast.show({ type: 'success', text1: '¡Bienvenido de vuelta! 👋' });
          setIsLoading(false);

          // Redirigir según el rol del usuario
          if (userData.role === 'administrador') {
            navigation.replace('AdminDashboard');
          } else if (userData.role === 'proveedor') {
            navigation.replace('Conductor');
          } else {
            navigation.replace('Home');
          }
        } else {
          setIsLoading(false);
          Toast.show({ type: 'error', text1: 'Error', text2: 'No se encontraron los datos del usuario.' });
        }
      } catch (error) {
        setIsLoading(false);
        let errorMsg = 'Ocurrió un error al ingresar.';
        if (error.code === 'auth/invalid-credential') errorMsg = 'Correo o contraseña incorrectos.';
        Toast.show({ type: 'error', text1: 'Acceso Denegado 🔒', text2: errorMsg });
      }
    }
  };

  // ==============================================
  // INTERFAZ DE USUARIO
  // ==============================================
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.formContainer}>

            {/* Logo y título */}
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <Image source={require('../../assets/logo-azul.png')} style={{ width: 100, height: 100, marginBottom: 10, }} />
              <Text style={styles.title}>AquaLink</Text>
              <Text style={styles.subtitle}>{isRegistering ? 'Crea tu cuenta' : 'Ingresa a tu cuenta'}</Text>
            </View>

            {/* Selector de rol (solo en registro) */}
            {isRegistering && (
              <View style={styles.roleContainer}>
                <TouchableOpacity style={[styles.roleButton, role === 'cliente' && styles.roleActive]} onPress={() => setRole('cliente')}>
                  <Text style={[styles.roleText, role === 'cliente' && styles.roleTextActive]}>Cliente</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.roleButton, role === 'proveedor' && styles.roleActive]} onPress={() => setRole('proveedor')}>
                  <Text style={[styles.roleText, role === 'proveedor' && styles.roleTextActive]}>Proveedor</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Campos comunes */}
            {isRegistering && <InputLabel label="Nombre de Usuario" value={username} onChange={setUsername} />}
            <InputLabel label="Correo Electrónico" value={email} onChange={setEmail} keyboard="email-address" />
            <InputLabel label="Contraseña" value={password} onChange={setPassword} isPassword />

            {/* Campos adicionales durante el registro */}
            {isRegistering && (
              <>
                <InputLabel label="Cédula de Identidad" value={cedula} onChange={setCedula} keyboard="numeric" />

                {role === 'cliente' ? (
                  <>
                    <InputLabel label="Residencia (Calle/Casa)" value={residencia} onChange={setResidencia} />
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 5 }}>
                      <Ionicons name="location-outline" size={18} color="#333" style={{ marginRight: 5 }} />
                      <Text style={styles.label}>Ubicación exacta en mapa</Text>
                    </View>

                    {/* ✅ CORRECCIÓN: Se agregó 'origen: Login' para que MapPicker sepa a dónde regresar */}
                    <TouchableOpacity
                      style={[styles.btnMapaRegistro, coordsResidencia && { borderColor: '#34C759', flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }]}
                      onPress={() => navigation.navigate('MapPicker', {
                        origen: 'Login',
                        datosTemporales: { username, email, password, cedula, residencia, role }
                      })}
                    >
                      <Text style={[styles.btnMapaRegistroText, coordsResidencia && { color: '#34C759' }]}>
                        {coordsResidencia ? "Ubicación Marcada" : "Seleccionar en el Mapa"}
                      </Text>
                      <Ionicons name={coordsResidencia ? "checkmark-circle" : "map"} size={20} color={coordsResidencia ? "#34C759" : "#0069B4"} style={{ marginLeft: 8 }} />
                    </TouchableOpacity>

                    {coordsResidencia && (
                      <Text style={{ fontSize: 10, color: '#666', textAlign: 'center', marginBottom: 15 }}>
                        Lat: {(coordsResidencia.lat || coordsResidencia.latitude || 0).toFixed(4)},
                        Lng: {(coordsResidencia.lng || coordsResidencia.longitude || 0).toFixed(4)}
                      </Text>
                    )}
                  </>
                ) : (
                  <>
                    <InputLabel label="Número de Camiones" value={camiones} onChange={setCamiones} keyboard="numeric" />
                    <InputLabel label="Matrículas" value={matriculas} onChange={setMatriculas} />
                    <InputLabel label="Capacidad (Litros)" value={capacidad} onChange={setCapacidad} keyboard="numeric" />
                    <View style={styles.warningBox}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 5 }}>
                        <Ionicons name="warning" size={20} color="#856404" style={{ marginRight: 6 }} />
                        <Text style={styles.warningText}>Registro Restringido</Text>
                      </View>
                      <Text style={{ fontSize: 12, color: '#666', marginBottom: 10, textAlign: 'center' }}>
                        Necesitas autorización de la central para operar.
                      </Text>
                      <InputLabel label="Código de Autorización" value={authCode} onChange={setAuthCode} isPassword={true} />
                    </View>
                  </>
                )}
              </>
            )}

            {/* Botón de acción principal */}
            <TouchableOpacity
              style={[styles.mainButton, isLoading && { backgroundColor: '#888' }]}
              onPress={handleAction}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.mainButtonText}>{isRegistering ? 'Finalizar Registro' : 'Iniciar Sesión'}</Text>
              )}
            </TouchableOpacity>

            {/* Enlace para recuperar contraseña */}
            {!isRegistering && (
              <TouchableOpacity
                style={{ marginTop: 15, paddingVertical: 5 }}
                onPress={() => navigation.navigate('ForgotPassword')}
              >
                <Text style={{ textAlign: 'center', color: '#0069B4', fontWeight: 'bold' }}>
                  ¿Olvidaste tu contraseña?
                </Text>
              </TouchableOpacity>
            )}

            {/* Alternar entre login y registro */}
            <TouchableOpacity style={styles.switchLink} onPress={() => { setIsRegistering(!isRegistering); setIsLoading(false); }}>
              <Text style={styles.switchText}>
                {isRegistering ? '¿Ya tienes cuenta? Inicia Sesión' : '¿No tienes cuenta? Regístrate aquí'}
              </Text>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ==============================================
// Componente auxiliar: Campo de entrada con etiqueta
// ==============================================
const InputLabel = ({ label, value, onChange, isPassword, keyboard }) => (
  <View style={styles.inputGroup}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChange}
      secureTextEntry={isPassword}
      keyboardType={keyboard || 'default'}
      autoCapitalize="none"
    />
  </View>
);