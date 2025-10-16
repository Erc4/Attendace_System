import React, { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Divider,
  Alert,
  Card,
  CardContent,
  Avatar,
  IconButton,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Lock as LockIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Badge as BadgeIcon,
  School as SchoolIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

const Perfil = () => {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  
  // Estado para edición de perfil
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    nombre: user?.nombre || '',
    apellidoPaterno: user?.apellidoPaterno || '',
    apellidoMaterno: user?.apellidoMaterno || '',
    correo: user?.correo || '',
    titulo: user?.titulo || '',
    cedula: user?.cedula || '',
    escuelaEgreso: user?.escuelaEgreso || '',
  });
  
  // Estado para cambio de contraseña
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleEditToggle = () => {
    if (isEditing) {
      // Cancelar edición - restaurar datos originales
      setFormData({
        nombre: user?.nombre || '',
        apellidoPaterno: user?.apellidoPaterno || '',
        apellidoMaterno: user?.apellidoMaterno || '',
        correo: user?.correo || '',
        titulo: user?.titulo || '',
        cedula: user?.cedula || '',
        escuelaEgreso: user?.escuelaEgreso || '',
      });
    }
    setIsEditing(!isEditing);
    setError(null);
    setSuccess(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
      const token = localStorage.getItem('token');

      const response = await axios.put(
        `${API_URL}/me`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setSuccess('Perfil actualizado correctamente');
      setIsEditing(false);
      
      // Refrescar datos del usuario
      await refreshUser();
      
    } catch (err) {
      console.error('Error al actualizar perfil:', err);
      setError(err.response?.data?.detail || 'Error al actualizar el perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setError(null);
    setSuccess(null);

    // Validaciones
    if (!passwordData.current_password || !passwordData.new_password || !passwordData.confirm_password) {
      setError('Todos los campos son requeridos');
      return;
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      setError('Las contraseñas nuevas no coinciden');
      return;
    }

    if (passwordData.new_password.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
      const token = localStorage.getItem('token');

      await axios.put(
        `${API_URL}/me/password`,
        {
          current_password: passwordData.current_password,
          new_password: passwordData.new_password
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setSuccess('Contraseña actualizada correctamente');
      setPasswordDialogOpen(false);
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
      
    } catch (err) {
      console.error('Error al cambiar contraseña:', err);
      setError(err.response?.data?.detail || 'Error al cambiar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  const nombreCompleto = user 
    ? `${user.nombre} ${user.apellidoPaterno} ${user.apellidoMaterno || ''}`.trim()
    : '';

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        {/* Header del perfil */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Avatar
            sx={{ width: 80, height: 80, mr: 2, bgcolor: 'primary.main' }}
          >
            <PersonIcon sx={{ fontSize: 50 }} />
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h4" gutterBottom>
              {nombreCompleto}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {user?.puesto || 'Sin puesto asignado'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {user?.departamento || 'Sin departamento'}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Mensajes de error/éxito */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        {/* Tabs */}
        <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 3 }}>
          <Tab label="Información Personal" />
          <Tab label="Información Laboral" />
        </Tabs>

        {/* Tab 1: Información Personal */}
        {tabValue === 0 && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h6">Datos Personales</Typography>
              <Box>
                {!isEditing && (
                  <Button
                    variant="contained"
                    startIcon={<EditIcon />}
                    onClick={handleEditToggle}
                  >
                    Editar
                  </Button>
                )}
                {isEditing && (
                  <>
                    <Button
                      variant="outlined"
                      startIcon={<CancelIcon />}
                      onClick={handleEditToggle}
                      sx={{ mr: 1 }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={handleSaveProfile}
                      disabled={loading}
                    >
                      Guardar
                    </Button>
                  </>
                )}
              </Box>
            </Box>

            <Grid container spacing={3}>
              {/* Campos editables */}
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Nombre(s)"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  InputProps={{
                    startAdornment: <PersonIcon sx={{ mr: 1, color: 'action.active' }} />
                  }}
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Apellido Paterno"
                  name="apellidoPaterno"
                  value={formData.apellidoPaterno}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Apellido Materno"
                  name="apellidoMaterno"
                  value={formData.apellidoMaterno}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Correo Electrónico"
                  name="correo"
                  type="email"
                  value={formData.correo}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  InputProps={{
                    startAdornment: <EmailIcon sx={{ mr: 1, color: 'action.active' }} />
                  }}
                />
              </Grid>

              {/* Campos de solo lectura */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="RFC"
                  value={user?.rfc || ''}
                  disabled
                  InputProps={{
                    startAdornment: <BadgeIcon sx={{ mr: 1, color: 'action.active' }} />
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Título"
                  name="titulo"
                  value={formData.titulo}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  InputProps={{
                    startAdornment: <SchoolIcon sx={{ mr: 1, color: 'action.active' }} />
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Cédula Profesional"
                  name="cedula"
                  value={formData.cedula}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Escuela de Egreso"
                  name="escuelaEgreso"
                  value={formData.escuelaEgreso}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* Sección de seguridad */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Seguridad
              </Typography>
              <Button
                variant="outlined"
                startIcon={<LockIcon />}
                onClick={() => setPasswordDialogOpen(true)}
              >
                Cambiar Contraseña
              </Button>
            </Box>
          </Box>
        )}

        {/* Tab 2: Información Laboral */}
        {tabValue === 1 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Información Laboral (Solo lectura)
            </Typography>
            
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom>
                      Departamento
                    </Typography>
                    <Typography variant="h6">
                      {user?.departamento || 'No asignado'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom>
                      Puesto
                    </Typography>
                    <Typography variant="h6">
                      {user?.puesto || 'No asignado'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom>
                      Rol en el Sistema
                    </Typography>
                    <Typography variant="h6">
                      {user?.rol || 'No asignado'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom>
                      RFC
                    </Typography>
                    <Typography variant="h6">
                      {user?.rfc || 'No disponible'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Alert severity="info" sx={{ mt: 3 }}>
              Para modificar tu información laboral, contacta al administrador del sistema.
            </Alert>
          </Box>
        )}
      </Paper>

      {/* Dialog para cambiar contraseña */}
      <Dialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Cambiar Contraseña</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              type="password"
              label="Contraseña Actual"
              name="current_password"
              value={passwordData.current_password}
              onChange={handlePasswordChange}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              type="password"
              label="Nueva Contraseña"
              name="new_password"
              value={passwordData.new_password}
              onChange={handlePasswordChange}
              helperText="Mínimo 6 caracteres"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              type="password"
              label="Confirmar Nueva Contraseña"
              name="confirm_password"
              value={passwordData.confirm_password}
              onChange={handlePasswordChange}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordDialogOpen(false)}>
            Cancelar
          </Button>
          <Button 
            variant="contained" 
            onClick={handleChangePassword}
            disabled={loading}
          >
            Cambiar Contraseña
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Perfil;