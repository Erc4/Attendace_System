import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

// Layouts
import Layout from './components/Layout/Layout';

// Páginas públicas
import Login from './components/Auth/Login';
import BiometricAuth from './components/Auth/BiometricAuth';

// Páginas protegidas
import Dashboard from './pages/Dashboard';
import RegistroAsistencia from './components/Asistencias/RegistroAsistencia';
import TrabajadoresList from './components/Trabajadores/TrabajadoresList';
import TrabajadorForm from './components/Trabajadores/TrabajadorForm';
import TrabajadorDetail from './components/Trabajadores/TrabajadorDetail';

// Componentes de Horarios
import HorariosList from './components/Horarios/HorariosList';
import HorarioForm from './components/Horarios/HorarioForm';
import HorarioDetail from './components/Horarios/HorarioDetail';
import TrabajadoresSinHorario from './components/Horarios/TrabajadoresSinHorario';

// Componentes de Asistencias
import RegistroAsistenciaManual from './components/Asistencias/RegistroAsistenciaManual';
import AsistenciasList from './components/Asistencias/AsistenciasList';
import ReportesAsistencia from './components/Asistencias/ReportesAsistencia';

// Componentes de reportes
import ReporteRetardosFaltas from './components/Reportes/ReporteRetardosFaltas';

import GestionJustificaciones from './components/Justificaciones/GestionJustificaciones';

// Página no encontrada
import NotFound from './pages/NotFound';

// Componente para rutas protegidas
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <div>Cargando...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Rutas públicas */}
      <Route path="/login" element={<Login />} />
      <Route path="/biometric" element={<BiometricAuth />} />
      
      {/* Rutas protegidas */}
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      {/* Rutas de Asistencias */}
      <Route 
        path="/asistencias" 
        element={
          <ProtectedRoute>
            <Layout>
              <AsistenciasList />
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/asistencias/registro" 
        element={
          <ProtectedRoute>
            <Layout>
              <RegistroAsistenciaManual />
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/asistencias/registrar" 
        element={
          <ProtectedRoute>
            <Layout>
              <RegistroAsistencia />
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/asistencias/reportes" 
        element={
          <ProtectedRoute>
            <Layout>
              <ReportesAsistencia />
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      {/* Rutas de Trabajadores */}
      <Route 
        path="/trabajadores" 
        element={
          <ProtectedRoute>
            <Layout>
              <TrabajadoresList />
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/trabajadores/nuevo" 
        element={
          <ProtectedRoute>
            <Layout>
              <TrabajadorForm />
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/trabajadores/:id" 
        element={
          <ProtectedRoute>
            <Layout>
              <TrabajadorDetail />
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/trabajadores/:id/editar" 
        element={
          <ProtectedRoute>
            <Layout>
              <TrabajadorForm />
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      {/* RUTAS DE HORARIOS - COMPLETAMENTE IMPLEMENTADAS */}
      <Route 
        path="/horarios" 
        element={
          <ProtectedRoute>
            <Layout>
              <HorariosList />
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/horarios/nuevo" 
        element={
          <ProtectedRoute>
            <Layout>
              <HorarioForm />
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/horarios/:id" 
        element={
          <ProtectedRoute>
            <Layout>
              <HorarioDetail />
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/horarios/:id/editar" 
        element={
          <ProtectedRoute>
            <Layout>
              <HorarioForm />
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/horarios/trabajadores-sin-horario" 
        element={
          <ProtectedRoute>
            <Layout>
              <TrabajadoresSinHorario />
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      {/* Justificaciones */}
      <Route 
        path="/justificaciones" 
        element={
          <ProtectedRoute>
            <Layout>
              <GestionJustificaciones/>
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      {/* Días Festivos */}
      <Route 
        path="/dias-festivos" 
        element={
          <ProtectedRoute>
            <Layout>
              <div>Gestión de Días Festivos (por implementar)</div>
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      {/* Reportes - RUTAS ACTUALIZADAS */}
      <Route 
        path="/reportes" 
        element={
          <ProtectedRoute>
            <Layout>
              <ReportesAsistencia />
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/reportes/asistencias-diarias" 
        element={
          <ProtectedRoute>
            <Layout>
              <ReportesAsistencia />
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/reportes/asistencias-mensuales" 
        element={
          <ProtectedRoute>
            <Layout>
              <ReportesAsistencia />
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/reportes/retardos" 
        element={
          <ProtectedRoute>
            <Layout>
              <ReportesAsistencia />
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/reportes/faltas" 
        element={
          <ProtectedRoute>
            <Layout>
              <ReportesAsistencia />
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/reportes/justificaciones" 
        element={
          <ProtectedRoute>
            <Layout>
              <ReportesAsistencia />
            </Layout>
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/reportes/retardos-faltas" 
        element={
          <ProtectedRoute>
            <Layout>
              <ReporteRetardosFaltas />
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      {/* Configuración */}
      <Route 
        path="/configuracion/:section" 
        element={
          <ProtectedRoute>
            <Layout>
              <div>Sección de Configuración (por implementar)</div>
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      {/* Página no encontrada */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;