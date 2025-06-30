import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Tab,
  Tabs,
  Typography,
  Alert
} from '@mui/material';
import {
  ArrowBack,
  Edit as EditIcon,
  Person as PersonIcon,
  Work as WorkIcon,
  School as SchoolIcon,
  Fingerprint as FingerprintIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  EventNote as EventNoteIcon,
  CheckCircle,
  Error as ErrorIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { trabajadorService, asistenciaService } from '../../services/api';

// Componente TabPanel para las pestañas
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`trabajador-tabpanel-${index}`}
      aria-labelledby={`trabajador-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const TrabajadorDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Estados
  const [trabajador, setTrabajador] = useState(null);
  const [asistencias, setAsistencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingAsistencias, setLoadingAsistencias] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  
  // Cargar la información del trabajador
  useEffect(() => {
    const fetchTrabajador = async () => {
      try {
        setLoading(true);
        console.log('🔍 Cargando trabajador con ID:', id);
        const data = await trabajadorService.getById(id);
        console.log('📊 Datos del trabajador recibidos:', data);
        setTrabajador(data);
      } catch (err) {
        console.error('❌ Error al cargar datos del trabajador:', err);
        setError('No se pudieron cargar los datos del trabajador');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTrabajador();
  }, [id]);
  
  // Cargar las asistencias recientes del trabajador
  useEffect(() => {
    const fetchAsistencias = async () => {
      try {
        setLoadingAsistencias(true);
        
        // Obtener el mes actual para el rango de fechas
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        
        const data = await asistenciaService.getAsistenciasByTrabajador(
          id,
          startOfMonth.toISOString().split('T')[0],
          today.toISOString().split('T')[0]
        );
        
        setAsistencias(data.registros || []);
      } catch (err) {
        console.error('❌ Error al cargar asistencias:', err);
        // No establecemos error global, solo para asistencias
      } finally {
        setLoadingAsistencias(false);
      }
    };
    
    if (!loading && trabajador) {
      fetchAsistencias();
    }
  }, [id, loading, trabajador]);
  
  // Cambiar de pestaña
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  // Formatear fecha
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'PPP', { locale: es });
  };
  
  // Determinar color del chip según estado
  const getChipColor = (estatus) => {
    if (estatus === 'ASISTENCIA') return 'success';
    if (estatus.includes('RETARDO')) return 'warning';
    if (estatus === 'FALTA') return 'error';
    if (estatus === 'JUSTIFICADO') return 'info';
    return 'default';
  };
  
  // Función helper para obtener el valor de una relación de forma segura
  const getRelationValue = (relation, field = 'descripcion', fallback = 'N/A') => {
    if (!relation) return fallback;
    if (typeof relation === 'object' && relation[field]) {
      return relation[field];
    }
    return fallback;
  };
  
  // Función helper para obtener nombre del departamento
  const getDepartamentoName = () => {
    console.log('🏢 Departamento data:', trabajador?.departamento_rel);
    return getRelationValue(trabajador?.departamento_rel, 'descripcion', 'Sin departamento');
  };
  
  // Función helper para obtener nombre del tipo de trabajador
  const getTipoTrabajadorName = () => {
    console.log('👤 Tipo trabajador data:', trabajador?.tipo_trabajador);
    return getRelationValue(trabajador?.tipo_trabajador, 'descripcion', 'No especificado');
  };
  
  // Función helper para obtener grado de estudios
  const getGradoEstudiosName = () => {
    console.log('🎓 Grado estudios data:', trabajador?.grado_estudios_rel);
    return getRelationValue(trabajador?.grado_estudios_rel, 'descripcion', 'No especificado');
  };
  
  // Función helper para obtener horario
  const getHorarioName = () => {
    console.log('⏰ Horario data:', trabajador?.horario_rel);
    return getRelationValue(trabajador?.horario_rel, 'descripcion', 'Sin horario asignado');
  };
  
  // Función helper para obtener centro de trabajo
  const getCentroTrabajoName = () => {
    console.log('🏛️ Centro trabajo data:', trabajador?.centro_trabajo_rel);
    if (trabajador?.centro_trabajo_rel) {
      const plantel = trabajador.centro_trabajo_rel.plantel || '';
      const ubicacion = trabajador.centro_trabajo_rel.ubicacion || '';
      return plantel && ubicacion ? `${plantel} - ${ubicacion}` : (plantel || ubicacion || 'No especificado');
    }
    return 'No especificado';
  };
  
  // Función helper para obtener rol
  const getRolName = () => {
    console.log('🔐 Rol data:', trabajador?.rol_rel);
    return getRelationValue(trabajador?.rol_rel, 'descripcion', 'Sin rol asignado');
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 4 }}>
          {error}
        </Alert>
        <Button
          sx={{ mt: 2 }}
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate('/trabajadores')}
        >
          Volver a la lista
        </Button>
      </Container>
    );
  }
  
  if (!trabajador) {
    return (
      <Container>
        <Alert severity="warning" sx={{ mt: 4 }}>
          No se encontró información del trabajador
        </Alert>
        <Button
          sx={{ mt: 2 }}
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate('/trabajadores')}
        >
          Volver a la lista
        </Button>
      </Container>
    );
  }
  
  return (
    <Container>
      <Box sx={{ mb: 4 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate('/trabajadores')}
          sx={{ mb: 2 }}
        >
          Volver a la lista
        </Button>
        
        <Grid container alignItems="center" spacing={2}>
          <Grid item xs>
            <Typography variant="h4" gutterBottom>
              {`${trabajador.nombre} ${trabajador.apellidoPaterno} ${trabajador.apellidoMaterno}`}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              {trabajador.puesto} - {getDepartamentoName()}
            </Typography>
          </Grid>
        </Grid>
      </Box>
      
      <Paper sx={{ mb: 4 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="Pestañas de información del trabajador">
            <Tab icon={<PersonIcon />} label="Datos Personales" id="tab-0" />
            <Tab icon={<WorkIcon />} label="Datos Laborales" id="tab-1" />
            <Tab icon={<SchoolIcon />} label="Datos Académicos" id="tab-2" />
            <Tab icon={<EventNoteIcon />} label="Asistencias" id="tab-3" />
          </Tabs>
        </Box>
        
        {/* Pestaña de Datos Personales */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardHeader title="Información Básica" />
                <Divider />
                <CardContent>
                  <List>
                    <ListItem>
                      <ListItemText primary="RFC" secondary={trabajador.rfc} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="CURP" secondary={trabajador.curp} />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Estado" 
                        secondary={
                          <Chip 
                            label={trabajador.estado ? 'Activo' : 'Inactivo'} 
                            color={trabajador.estado ? 'success' : 'default'}
                            size="small"
                            icon={trabajador.estado ? <CheckCircle /> : <ErrorIcon />}
                          />
                        } 
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardHeader title="Contacto" />
                <Divider />
                <CardContent>
                  <List>
                    <ListItem>
                      <ListItemText 
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <EmailIcon fontSize="small" sx={{ mr: 1 }} />
                            Correo Electrónico
                          </Box>
                        } 
                        secondary={trabajador.correo} 
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
        
        {/* Pestaña de Datos Laborales */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardHeader title="Puesto y Departamento" />
                <Divider />
                <CardContent>
                  <List>
                    <ListItem>
                      <ListItemText 
                        primary="Tipo de Trabajador" 
                        secondary={getTipoTrabajadorName()}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Departamento" 
                        secondary={getDepartamentoName()}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Puesto" 
                        secondary={trabajador.puesto} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Turno" 
                        secondary={trabajador.turno} 
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardHeader title="Fechas de Ingreso" />
                <Divider />
                <CardContent>
                  <List>
                    <ListItem>
                      <ListItemText 
                        primary="Fecha de Ingreso a SEP" 
                        secondary={formatDate(trabajador.fechaIngresoSep)} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Fecha de Ingreso a la Rama" 
                        secondary={formatDate(trabajador.fechaIngresoRama)} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Fecha de Ingreso al Gobierno Federal" 
                        secondary={formatDate(trabajador.fechaIngresoGobFed)} 
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardHeader title="Horario y Centro de Trabajo" />
                <Divider />
                <CardContent>
                  <List>
                    <ListItem>
                      <ListItemText 
                        primary="Horario" 
                        secondary={getHorarioName()}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Centro de Trabajo" 
                        secondary={getCentroTrabajoName()}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Rol en el Sistema" 
                        secondary={getRolName()}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
        
        {/* Pestaña de Datos Académicos */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardHeader title="Formación Académica" />
                <Divider />
                <CardContent>
                  <List>
                    <ListItem>
                      <ListItemText 
                        primary="Grado de Estudios" 
                        secondary={getGradoEstudiosName()}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Título" 
                        secondary={trabajador.titulo} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Cédula Profesional" 
                        secondary={trabajador.cedula} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Escuela de Egreso" 
                        secondary={trabajador.escuelaEgreso} 
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
        
        {/* Pestaña de Asistencias */}
        <TabPanel value={tabValue} index={3}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Registros de Asistencia Recientes
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Mostrando registros del mes actual
            </Typography>
          </Box>
          
          {loadingAsistencias ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : asistencias.length === 0 ? (
            <Alert severity="info">
              No hay registros de asistencia en el período seleccionado
            </Alert>
          ) : (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardHeader title="Resumen de Asistencias" />
                    <Divider />
                    <CardContent>
                      <Grid container spacing={2}>
                        <Grid item xs={6} md={3}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" color="success.main">
                              {asistencias.filter(a => a.estatus === 'ASISTENCIA').length}
                            </Typography>
                            <Typography variant="body2">Asistencias</Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={6} md={3}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" color="warning.main">
                              {asistencias.filter(a => a.estatus.includes('RETARDO')).length}
                            </Typography>
                            <Typography variant="body2">Retardos</Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={6} md={3}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" color="error.main">
                              {asistencias.filter(a => a.estatus === 'FALTA').length}
                            </Typography>
                            <Typography variant="body2">Faltas</Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={6} md={3}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" color="info.main">
                              {asistencias.filter(a => a.estatus === 'JUSTIFICADO').length}
                            </Typography>
                            <Typography variant="body2">Justificados</Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardHeader 
                      title="Información de Asistencia" 
                      action={
                        <Button
                          variant="outlined"
                          size="small"
                          component={RouterLink}
                          to={`/reportes/asistencias-mensuales?trabajador=${id}`}
                        >
                          Ver Reporte Completo
                        </Button>
                      }
                    />
                    <Divider />
                    <CardContent>
                      <Typography variant="body1" gutterBottom>
                        Para generar reportes más detallados, utiliza la sección de reportes.
                      </Typography>
                      <Button
                        variant="contained"
                        component={RouterLink}
                        to="/justificaciones/nueva"
                        state={{ trabajadorId: id }}
                        sx={{ mt: 1 }}
                      >
                        Registrar Justificación
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
              
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Últimos registros
                </Typography>
                <Paper variant="outlined">
                  <List>
                    {asistencias.slice(0, 10).map((asistencia, index) => (
                      <React.Fragment key={index}>
                        <ListItem
                          secondaryAction={
                            <Chip
                              label={asistencia.estatus}
                              color={getChipColor(asistencia.estatus)}
                              size="small"
                            />
                          }
                        >
                          <ListItemText
                            primary={format(new Date(asistencia.fecha), 'PPPP', { locale: es })}
                            secondary={format(new Date(asistencia.fecha), 'h:mm a', { locale: es })}
                          />
                        </ListItem>
                        {index < asistencias.slice(0, 10).length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                </Paper>
              </Box>
            </Box>
          )}
        </TabPanel>
      </Paper>
      
      <Box sx={{ mt: 4, mb: 8 }}>
        <Button
          variant="contained"
          color="primary"
          component={RouterLink}
          to={`/trabajadores/${id}/editar`}
          startIcon={<EditIcon />}
          sx={{ mr: 2 }}
        >
          Editar Trabajador
        </Button>
        <Button
          variant="outlined"
          component={RouterLink}
          to="/reportes/asistencias-mensuales"
          state={{ trabajadorId: id }}
        >
          Ver Reporte de Asistencias
        </Button>
      </Box>
    </Container>
  );
};

export default TrabajadorDetail;