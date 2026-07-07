// ================================================
// Hoja de estilos global de AquaLink
// Contiene los estilos comunes utilizados por
// las pantallas de la aplicación.
// ================================================

import { StyleSheet, Platform, StatusBar } from 'react-native';

export const styles = StyleSheet.create({

  // ==============================================
  // CONTENEDORES PRINCIPALES
  // ==============================================
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0
  },
  scrollContainer: {
    flexGrow: 1,
    paddingVertical: 30,
    paddingHorizontal: 20,
    justifyContent: 'center'
  },
  formContainer: { paddingHorizontal: 30 },

  // ==============================================
  // TÍTULOS Y TEXTOS
  // ==============================================
  title: { fontSize: 32, fontWeight: 'bold', color: '#1976D2', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 25 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  sectionSubtitle: { fontSize: 14, color: '#888', marginBottom: 20 },
  titleHome: { fontSize: 24, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 5 },
  subtitleHome: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 },
  emptyText: { fontSize: 16, color: '#888', textAlign: 'center', marginTop: 20 },

  // ==============================================
  // SELECTOR DE ROL (LOGIN / REGISTRO)
  // ==============================================
  roleContainer: {
    flexDirection: 'row', backgroundColor: '#f0f0f0',
    borderRadius: 12, padding: 5, marginBottom: 25
  },
  roleButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  roleActive: { backgroundColor: '#ffffff', elevation: 3 },
  roleText: { color: '#888', fontWeight: '600' },
  roleTextActive: { color: '#1976D2', fontWeight: 'bold' },

  // ==============================================
  // CAMPOS DE ENTRADA Y BOTONES
  // ==============================================
  inputGroup: { marginBottom: 15 },
  label: { fontSize: 14, color: '#444', marginBottom: 5, fontWeight: '600' },
  input: {
    backgroundColor: '#fdfdfd', borderWidth: 1, borderColor: '#eee',
    borderRadius: 10, padding: 12, fontSize: 16
  },
  mainButton: {
    backgroundColor: '#2196F3', padding: 15, borderRadius: 15,
    alignItems: 'center', marginTop: 10
  },
  mainButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  switchLink: { marginTop: 25, alignItems: 'center' },
  switchText: { color: '#1976D2', fontSize: 15, fontWeight: '600' },

  // ==============================================
  // PANEL INFERIOR (HOME Y CONDUCTOR)
  // ==============================================
  bottomPanel: {
    flex: 1, backgroundColor: '#ffffff', paddingHorizontal: 30,
    paddingTop: 35, paddingBottom: 40, borderTopLeftRadius: 30,
    borderTopRightRadius: 30, marginTop: -30, elevation: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1, shadowRadius: 5
  },

  // ==============================================
  // SELECCIÓN DE LITROS (PEDIDO)
  // ==============================================
  litrosContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  litroOption: {
    flex: 1, padding: 15, borderWidth: 1, borderColor: '#ddd',
    borderRadius: 10, alignItems: 'center', marginHorizontal: 5, backgroundColor: '#fff'
  },
  litroOptionActive: { borderColor: '#2196F3', backgroundColor: '#e3f2fd' },
  litroText: { color: '#666', fontWeight: 'bold' },
  litroTextActive: { color: '#2196F3' },

  // ==============================================
  // OPCIONES SELECCIONABLES (CONFIGURACIÓN)
  // ==============================================
  optionButton: {
    backgroundColor: '#f5f5f5', paddingVertical: 12, paddingHorizontal: 15,
    borderRadius: 10, borderWidth: 1, borderColor: '#ddd', alignItems: 'center'
  },
  optionButtonActive: { backgroundColor: '#e3f2fd', borderColor: '#2196F3' },
  optionText: { color: '#666', fontWeight: '600' },
  optionTextActive: { color: '#2196F3', fontWeight: 'bold' },

  // ==============================================
  // TARJETAS DE CONTACTO Y LISTAS
  // ==============================================
  recentCard: {
    flexDirection: 'row', backgroundColor: '#fff', padding: 15,
    borderRadius: 12, marginBottom: 12, alignItems: 'center',
    borderWidth: 1, borderColor: '#eee', elevation: 2
  },
  recentName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  recentDetail: { fontSize: 13, color: '#666', marginTop: 2 },
  contactIcon: {
    backgroundColor: '#E8F5E9', width: 45, height: 45,
    borderRadius: 22, justifyContent: 'center', alignItems: 'center'
  },

  // ==============================================
  // AVISOS DE ADVERTENCIA
  // ==============================================
  warningBox: {
    backgroundColor: '#ffebee', padding: 15, borderRadius: 10,
    marginTop: 15, borderWidth: 1, borderColor: '#ffcdd2'
  },
  warningText: { color: '#c62828', fontWeight: 'bold', fontSize: 16, textAlign: 'center' },

  // ==============================================
  // MAPA
  // ==============================================
  mapContainer: {
    flex: 1, width: '100%', backgroundColor: '#e0e0e0',
    borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
    overflow: 'hidden', elevation: 5
  },
  map: { flex: 1 },

  // ==============================================
  // PERFIL DE USUARIO
  // ==============================================
  profileHeader: { alignItems: 'center', marginBottom: 25, marginTop: 20 },
  avatarCircle: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: '#2196F3',
    justifyContent: 'center', alignItems: 'center', marginBottom: 15,
    elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 5
  },
  avatarText: { fontSize: 45, fontWeight: 'bold', color: '#fff' },
  profileName: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 5 },
  profileRole: {
    fontSize: 14, color: '#FF9800', fontWeight: 'bold',
    letterSpacing: 2, textTransform: 'uppercase'
  },
  infoCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: '#e0e0e0', elevation: 5, marginTop: 10
  },
  infoRow: {
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: '#eee', paddingVertical: 15
  },
  infoLabel: { fontSize: 12, color: '#888', fontWeight: '600', marginBottom: 2 },
  infoValue: { fontSize: 16, color: '#333', fontWeight: '500' },

  // ==============================================
  // PESTAÑAS Y SUBPESTAÑAS
  // ==============================================
  tabContainer: {
    flexDirection: 'row', backgroundColor: '#F0F2F5',
    borderRadius: 12, padding: 5, marginBottom: 20
  },
  tabButton: { flex: 1, padding: 12, alignItems: 'center', borderRadius: 10 },
  tabButtonActive: {
    backgroundColor: '#fff', elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1
  },
  tabText: { fontSize: 13, color: '#666', fontWeight: 'bold' },
  tabTextActive: { color: '#1976D2' },

  // ==============================================
  // BOTONES DE MAPA Y REGISTRO
  // ==============================================
  btnMapaRegistro: {
    borderWidth: 1, borderColor: '#1976D2', borderRadius: 10, padding: 12,
    alignItems: 'center', marginBottom: 15, backgroundColor: '#f0f7ff'
  },
  btnMapaRegistroText: { color: '#1976D2', fontWeight: 'bold' },

  // ==============================================
  // TARJETAS DE PEDIDOS
  // ==============================================
  pedidoCard: {
    backgroundColor: '#fff', borderRadius: 15, padding: 16, marginBottom: 15,
    borderWidth: 1, borderColor: '#eee', elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4
  },
  pedidoHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingBottom: 8
  },
  pedidoName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  pedidoInfo: { fontSize: 14, color: '#555', marginVertical: 2, lineHeight: 20 },
  badgeLitros: {
    backgroundColor: '#E3F2FD', paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 8
  },
  badgeText: { color: '#1976D2', fontWeight: 'bold', fontSize: 12 },
});