// screens/auth/LoginScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, Alert, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import Toast from 'react-native-toast-message';
import { styles } from '../../styles';
import { SafeAreaView } from 'react-native-safe-area-context';

// --- IMPORTACIÓN DE ICONOS VECTORIALES ---
import { Ionicons } from '@expo/vector-icons';

// IMPORTACIONES DEL BACKEND
import { auth, db } from '../../firebase'; 
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export default function LoginScreen({ navigation, route }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [role, setRole] = useState('cliente'); 
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
  
  // ESTADOS PARA EL ACCESO ADMINISTRATIVO
  const [adminModalVisible, setAdminModalVisible] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  
  // (Opcional: Si validCodes no está global, asegúrate de definirlo para los proveedores)
  const [validCodes, setValidCodes] = useState(['PROV123', 'AGUA2026']); 

  // ESTE EFECTO ESCUCHA CUANDO EL MAPA NOS DEVUELVE LAS COORDENADAS
  useEffect(() => {
    if (route.params?.ubicacionSeleccionada) {
      // 1. Recuperamos la ubicación
      setCoordsResidencia(route.params.ubicacionSeleccionada);
      
      // 2. RECUPERAMOS LOS DATOS BORRADOS (Si existen en los parámetros)
      if (route.params.username) setUsername(route.params.username);
      if (route.params.email) setEmail(route.params.email);
      if (route.params.password) setPassword(route.params.password);
      if (route.params.cedula) setCedula(route.params.cedula);
      if (route.params.residencia) setResidencia(route.params.residencia);
      if (route.params.role) setRole(route.params.role);

      setIsRegistering(true); 
    }
  }, [route.params]);

  const handleAction = async () => {
    if (!email || !password) {
      Toast.show({ type: 'error', text1: 'Campos vacíos', text2: 'Por favor, ingresa tu correo y contraseña.' });
      return;
    }

    setIsLoading(true);

    if (isRegistering) {
      if (role === 'cliente' && !coordsResidencia) {
        Toast.show({ type: 'error', text1: 'Falta Ubicación', text2: 'Selecciona tu ubicación exacta en el mapa.' });
        setIsLoading(false);
        return;
      }
      if (role === 'proveedor') {
        if (!validCodes.includes(authCode)) {
          Toast.show({ type: 'error', text1: 'Código Inválido', text2: 'El código de autorización es incorrecto.' });
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
          fechaRegistro: new Date().toISOString()
        };

        if (role === 'cliente') {
          userData.residencia = residencia;
          userData.coordsResidencia = coordsResidencia;
        } else {
          userData.camiones = camiones;
          userData.matriculas = matriculas;
          userData.capacidad = capacidad;
          setValidCodes(validCodes.filter(code => code !== authCode)); 
        }

        await setDoc(doc(db, 'users', user.uid), userData);

        Toast.show({ type: 'success', text1: '¡Registro Exitoso! ✅', text2: 'Bienvenido al sistema.' });
        
        setIsLoading(false);
        if (role === 'proveedor') {
          navigation.replace('Conductor');
        } else {
          navigation.replace('Home');
        }

      } catch (error) {
        setIsLoading(false);
        let errorMsg = 'Ocurrió un error al registrar.';
        if (error.code === 'auth/email-already-in-use') errorMsg = 'Este correo ya está registrado.';
        if (error.code === 'auth/weak-password') errorMsg = 'La contraseña debe tener al menos 6 caracteres.';
        Toast.show({ type: 'error', text1: 'Error de Registro', text2: errorMsg });
      }

    } else {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          Toast.show({ type: 'success', text1: '¡Bienvenido de vuelta! 👋' });
          
          setIsLoading(false);
          if (userData.role === 'proveedor') {
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

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.formContainer}>
            
            {/* Título y subtítulo */}
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <Ionicons name="water" size={60} color="#0069B4" style={{ marginBottom: 10 }} />
              <Text style={styles.title}>AquaLink</Text> 
              <Text style={styles.subtitle}>{isRegistering ? 'Crea tu cuenta' : 'Ingresa a tu cuenta'}</Text>
            </View>

            <View style={styles.roleContainer}>
              <TouchableOpacity style={[styles.roleButton, role === 'cliente' && styles.roleActive]} onPress={() => setRole('cliente')}>
                <Text style={[styles.roleText, role === 'cliente' && styles.roleTextActive]}>Cliente</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.roleButton, role === 'proveedor' && styles.roleActive]} onPress={() => setRole('proveedor')}>
                <Text style={[styles.roleText, role === 'proveedor' && styles.roleTextActive]}>Proveedor</Text>
              </TouchableOpacity>
            </View>

            {isRegistering && <InputLabel label="Nombre de Usuario" value={username} onChange={setUsername} />}
            <InputLabel label="Correo Electrónico" value={email} onChange={setEmail} keyboard="email-address" />
            <InputLabel label="Contraseña" value={password} onChange={setPassword} isPassword />

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
                    
                    <TouchableOpacity 
                      style={[styles.btnMapaRegistro, coordsResidencia && {borderColor: '#34C759', flexDirection: 'row', justifyContent: 'center', alignItems: 'center'}]} 
                      onPress={() => navigation.navigate('MapPicker', { 
                       datosTemporales: { username, email, password, cedula, residencia, role } 
                     })}
                    >
                      <Text style={[styles.btnMapaRegistroText, coordsResidencia && {color: '#34C759'}]}>
                        {coordsResidencia ? "Ubicación Marcada" : "Seleccionar en el Mapa"}
                      </Text>
                      <Ionicons name={coordsResidencia ? "checkmark-circle" : "map"} size={20} color={coordsResidencia ? "#34C759" : "#0069B4"} style={{ marginLeft: 8 }} />
                    </TouchableOpacity>
                    
                    {coordsResidencia && (
                      <Text style={{fontSize: 10, color: '#666', textAlign: 'center', marginBottom: 15}}>
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
                      <Text style={{fontSize: 12, color: '#666', marginBottom: 10, textAlign: 'center'}}>
                        Necesitas autorización de la central para operar.
                      </Text>
                      <InputLabel label="Código de Autorización" value={authCode} onChange={setAuthCode} isPassword={true} />
                    </View>
                  </>
                )}
              </>
            )}
            
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

            <TouchableOpacity style={styles.switchLink} onPress={() => { setIsRegistering(!isRegistering); setIsLoading(false); }}>
              <Text style={styles.switchText}>{isRegistering ? '¿Ya tienes cuenta? Inicia Sesión' : '¿No tienes cuenta? Regístrate aquí'}</Text>
            </TouchableOpacity>

            {/* --- INICIO DE BOTÓN SECRETO (PUERTA TRASERA ADMINISTRADOR) --- */}
            <TouchableOpacity 
              activeOpacity={1} 
              onLongPress={() => {
                setAdminPassword(''); 
                setAdminModalVisible(true); 
              }}
              delayLongPress={3000} 
            >
              <Text style={{ color: '#ccc', textAlign: 'center', marginTop: 40, marginBottom: 10, fontSize: 12 }}>
                AquaLink v1.0.0
              </Text>
            </TouchableOpacity>
            {/* --- FIN DE BOTÓN SECRETO --- */}

          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* --- MODAL ADMINISTRATIVO FLOTANTE --- */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={adminModalVisible}
        onRequestClose={() => setAdminModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: '80%', backgroundColor: '#fff', borderRadius: 15, padding: 20, elevation: 10 }}>
            
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1A237E', marginBottom: 10, textAlign: 'center' }}>
              Acceso Restringido
            </Text>
            
            <Text style={{ color: '#666', marginBottom: 15, textAlign: 'center', fontSize: 13 }}>
              Ingrese la clave de operaciones del sistema.
            </Text>

            <TextInput
              style={{
                borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12,
                backgroundColor: '#f9f9f9', marginBottom: 20, textAlign: 'center', fontSize: 16, letterSpacing: 2
              }}
              placeholder="Contraseña"
              secureTextEntry={true}
              value={adminPassword}
              onChangeText={setAdminPassword}
              autoCapitalize="none"
            />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity 
                style={{ flex: 1, padding: 12, alignItems: 'center', borderRadius: 8, backgroundColor: '#eee', marginRight: 10 }}
                onPress={() => setAdminModalVisible(false)}
              >
                <Text style={{ color: '#333', fontWeight: 'bold' }}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={{ flex: 1, padding: 12, alignItems: 'center', borderRadius: 8, backgroundColor: '#1A237E' }}
                onPress={() => {
                  if (adminPassword === "a-dQ`@897#9") {
                    setAdminModalVisible(false);
                    navigation.navigate('AdminDashboard');
                  } else {
                    Alert.alert("Acceso Denegado", "La clave ingresada es incorrecta.");
                    setAdminPassword('');
                  }
                }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Entrar</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>
      {/* --- FIN DEL MODAL --- */}

    </SafeAreaView>
  );
}

const InputLabel = ({ label, value, onChange, isPassword, keyboard }) => (
  <View style={styles.inputGroup}>
    <Text style={styles.label}>{label}</Text>
    <TextInput style={styles.input} value={value} onChangeText={onChange} secureTextEntry={isPassword} keyboardType={keyboard || 'default'} autoCapitalize="none" />
  </View>
);