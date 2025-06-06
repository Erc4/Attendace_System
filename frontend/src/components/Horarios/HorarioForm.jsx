import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Container,
  Grid,
  Paper,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  IconButton,
  Chip,
  Divider,
  FormControl,
  FormHelperText
} from '@mui/material';
import {
  ArrowBack,
  Save,
  Schedule as ScheduleIcon,
  ContentCopy as CopyIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { horarioService } from '../../services/api';

// Utilidades para horarios
const horarioUtils = {
  formatTime: (timeString) => {
    if (!timeString) return '--:--';
    return timeString.substring(0, 5);
  },
  
  calcularDuracion: (entrada, salida) => {
    if (!entrada || !salida) return null;
    
    const [horaEntrada, minutoEntrada] = entrada.split(':').map(Number);
    const [horaSalida, minutoSalida] = salida.split(':').map(Number);
    
    const minutosEntrada = horaEntrada * 60 + minutoEntrada;
    const minutosSalida = horaSalida * 60 + minutoSalida;
    
    if (minutosSalida <= minutosEntrada) return null;
    
    const duracionMinutos = minutosSalida - minutosEntrada;
    const horas = Math.floor(duracionMinutos / 60);
    const minutos = duracionMinutos % 60;
    
    return { horas, minutos, total: duracionMinutos };
  }
};

// Configurar locale español para dayjs
dayjs.locale('es');

// Esquema de validación
const validationSchema = Yup.object({
  descripcion: Yup.string()
    .required('La descripción es requerida')
    .min(3, 'La descripción debe tener al menos 3 caracteres')
    .max(100, 'La descripción no puede exceder 100 caracteres'),
  lunesEntrada: Yup.string().required('Hora de entrada del lunes es requerida'),
  lunesSalida: Yup.string().required('Hora de salida del lunes es requerida'),
  martesEntrada: Yup.string().required('Hora de entrada del martes es requerida'),
  martesSalida: Yup.string().required('Hora de salida del martes es requerida'),
  miercolesEntrada: Yup.string().required('Hora de entrada del miércoles es requerida'),
  miercolesSalida: Yup.string().required('Hora de salida del miércoles es requerida'),
  juevesEntrada: Yup.string().required('Hora de entrada del jueves es requerida'),
  juevesSalida: Yup.string().required('Hora de salida del jueves es requerida'),
  viernesEntrada: Yup.string().required('Hora de entrada del viernes es requerida'),
  viernesSalida: Yup.string().required('Hora de salida del viernes es requerida')
});

const HorarioForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  
  // Estados del componente
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [validationResults, setValidationResults] = useState({});
  
  // Valores iniciales del formulario
  const [initialValues, setInitialValues] = useState({
    descripcion: '',
    lunesEntrada: '08:00',
    lunesSalida: '16:00',
    martesEntrada: '08:00',
    martesSalida: '16:00',
    miercolesEntrada: '08:00',
    miercolesSalida: '16:00',
    juevesEntrada: '08:00',
    juevesSalida: '16:00',
    viernesEntrada: '08:00',
    viernesSalida: '16:00'
  });
  
  // Días de la semana para el formulario
  const diasSemana = [
    { key: 'lunes', label: 'Lunes', entrada: 'lunesEntrada', salida: 'lunesSalida' },
    { key: 'martes', label: 'Martes', entrada: 'martesEntrada', salida: 'martesSalida' },
    { key: 'miercoles', label: 'Miércoles', entrada: 'miercolesEntrada', salida: 'miercolesSalida' },
    { key: 'jueves', label: 'Jueves', entrada: 'juevesEntrada', salida: 'juevesSalida' },
    { key: 'viernes', label: 'Viernes', entrada: 'viernesEntrada', salida: 'viernesSalida' }
  ];
  
  // Cargar datos del horario si estamos editando
  useEffect(() => {
    const fetchHorario = async () => {
      if (!isEditMode) return;
      
      try {
        setLoading(true);
        const data = await horarioService.getById(id);
        
        // Formatear las horas para el formulario
        const formattedData = {
          descripcion: data.horario.descripcion,
          lunesEntrada: data.horario.lunesEntrada.substring(0, 5),
          lunesSalida: data.horario.lunesSalida.substring(0, 5),
          martesEntrada: data.horario.martesEntrada.substring(0, 5),
          martesSalida: data.horario.martesSalida.substring(0, 5),
          miercolesEntrada: data.horario.miercolesEntrada.substring(0, 5),
          miercolesSalida: data.horario.miercolesSalida.substring(0, 5),
          juevesEntrada: data.horario.juevesEntrada.substring(0, 5),
          juevesSalida: data.horario.juevesSalida.substring(0, 5),
          viernesEntrada: data.horario.viernesEntrada.substring(0, 5),
          viernesSalida: data.horario.viernesSalida.substring(0, 5)
        };
        
        setInitialValues(formattedData);
      } catch (err) {
        console.error('Error al cargar horario:', err);
        setError('No se pudieron cargar los datos del horario.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchHorario();
  }, [id, isEditMode]);
  
  // Función para validar horarios
  const validarHorario = async (entrada, salida, dia) => {
    try {
      const result = await horarioService.validarTiempo(entrada, salida);
      setValidationResults(prev => ({
        ...prev,
        [dia]: result
      }));
      return result;
    } catch (err) {
      console.error('Error al validar horario:', err);
      return { es_valido: false, errores: ['Error al validar'] };
    }
  };
  
  // Función para copiar horario a todos los días
  const copiarHorarioATodos = (values, setFieldValue, diaOrigen) => {
    const entradaOrigen = values[`${diaOrigen}Entrada`];
    const salidaOrigen = values[`${diaOrigen}Salida`];
    
    diasSemana.forEach(dia => {
      if (dia.key !== diaOrigen) {
        setFieldValue(dia.entrada, entradaOrigen);
        setFieldValue(dia.salida, salidaOrigen);
      }
    });
  };
  
  // Función para establecer horarios predefinidos
  const aplicarHorarioPredefinido = (setFieldValue, tipo) => {
    let entrada, salida;
    
    switch (tipo) {
      case 'matutino':
        entrada = '08:00';
        salida = '16:00';
        break;
      case 'vespertino':
        entrada = '14:00';
        salida = '22:00';
        break;
      case 'mixto':
        entrada = '08:00';
        salida = '14:00';
        break;
      default:
        return;
    }
    
    diasSemana.forEach(dia => {
      setFieldValue(dia.entrada, entrada);
      setFieldValue(dia.salida, salida);
    });
  };
  
  // Función para calcular duración
  const calcularDuracion = (entrada, salida) => {
    if (!entrada || !salida) return null;
    
    const [horaEntrada, minutoEntrada] = entrada.split(':').map(Number);
    const [horaSalida, minutoSalida] = salida.split(':').map(Number);
    
    const minutosEntrada = horaEntrada * 60 + minutoEntrada;
    const minutosSalida = horaSalida * 60 + minutoSalida;
    
    if (minutosSalida <= minutosEntrada) return null;
    
    const duracionMinutos = minutosSalida - minutosEntrada;
    const horas = Math.floor(duracionMinutos / 60);
    const minutos = duracionMinutos % 60;
    
    return { horas, minutos, total: duracionMinutos };
  };
  
  // Función para manejar el envío del formulario
  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      setSaving(true);
      setError(null);
      
      // Preparar datos para envío
      const horarioData = {
        descripcion: values.descripcion,
        lunesEntrada: values.lunesEntrada + ':00',
        lunesSalida: values.lunesSalida + ':00',
        martesEntrada: values.martesEntrada + ':00',
        martesSalida: values.martesSalida + ':00',
        miercolesEntrada: values.miercolesEntrada + ':00',
        miercolesSalida: values.miercolesSalida + ':00',
        juevesEntrada: values.juevesEntrada + ':00',
        juevesSalida: values.juevesSalida + ':00',
        viernesEntrada: values.viernesEntrada + ':00',
        viernesSalida: values.viernesSalida + ':00'
      };
      
      if (isEditMode) {
        await horarioService.update(id, horarioData);
      } else {
        await horarioService.create(horarioData);
      }
      
      navigate('/horarios');
    } catch (err) {
      console.error('Error al guardar horario:', err);
      setError(
        err.response?.data?.detail || 
        'Error al guardar el horario. Inténtalo de nuevo.'
      );
    } finally {
      setSaving(false);
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Cargando datos del horario...</Typography>
      </Box>
    );
  }
  
  return (
    <Container>
      <Box sx={{ mb: 4 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate('/horarios')}
          sx={{ mb: 2 }}
        >
          Volver a horarios
        </Button>
        
        <Typography variant="h4" gutterBottom>
          {isEditMode ? 'Editar Horario' : 'Nuevo Horario'}
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          {isEditMode 
            ? 'Modifica los horarios de trabajo para los días laborales'
            : 'Define los horarios de trabajo para cada día de la semana'
          }
        </Typography>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ values, errors, touched, handleChange, handleBlur, setFieldValue, isSubmitting }) => (
            <Form>
              <Grid container spacing={3}>
                {/* Información general */}
                <Grid item xs={12}>
                  <Card>
                    <CardHeader 
                      title="Información General"
                      avatar={<ScheduleIcon color="primary" />}
                    />
                    <CardContent>
                      <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label="Descripción del Horario"
                            name="descripcion"
                            value={values.descripcion}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={touched.descripcion && Boolean(errors.descripcion)}
                            helperText={touched.descripcion && errors.descripcion}
                            placeholder="Ej: Horario Administrativo, Horario Docente Matutino"
                            required
                          />
                        </Grid>
                        
                        <Grid item xs={12} md={6}>
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="subtitle2" gutterBottom>
                              Horarios Predefinidos
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                              <Chip
                                label="Matutino (8:00-16:00)"
                                onClick={() => aplicarHorarioPredefinido(setFieldValue, 'matutino')}
                                variant="outlined"
                                size="small"
                              />
                              <Chip
                                label="Vespertino (14:00-22:00)"
                                onClick={() => aplicarHorarioPredefinido(setFieldValue, 'vespertino')}
                                variant="outlined"
                                size="small"
                              />
                              <Chip
                                label="Mixto (8:00-14:00)"
                                onClick={() => aplicarHorarioPredefinido(setFieldValue, 'mixto')}
                                variant="outlined"
                                size="small"
                              />
                            </Box>
                          </Box>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
                
                {/* Horarios por día */}
                <Grid item xs={12}>
                  <Card>
                    <CardHeader title="Horarios por Día" />
                    <CardContent>
                      <Grid container spacing={3}>
                        {diasSemana.map((dia) => {
                          const entrada = values[dia.entrada];
                          const salida = values[dia.salida];
                          const duracion = calcularDuracion(entrada, salida);
                          const validation = validationResults[dia.key];
                          
                          return (
                            <Grid item xs={12} key={dia.key}>
                              <Paper variant="outlined" sx={{ p: 2 }}>
                                <Grid container spacing={2} alignItems="center">
                                  <Grid item xs={12} sm={2}>
                                    <Typography variant="subtitle1" fontWeight="bold">
                                      {dia.label}
                                    </Typography>
                                  </Grid>
                                  
                                  <Grid item xs={12} sm={3}>
                                    <TimePicker
                                      label="Hora de Entrada"
                                      value={dayjs(`2024-01-01 ${entrada}`)}
                                      onChange={(newValue) => {
                                        const timeString = newValue.format('HH:mm');
                                        setFieldValue(dia.entrada, timeString);
                                        if (salida) {
                                          validarHorario(timeString, salida, dia.key);
                                        }
                                      }}
                                      ampm={false}
                                      slotProps={{
                                        textField: {
                                          fullWidth: true,
                                          size: 'small',
                                          error: touched[dia.entrada] && Boolean(errors[dia.entrada]),
                                          helperText: touched[dia.entrada] && errors[dia.entrada]
                                        }
                                      }}
                                    />
                                  </Grid>
                                  
                                  <Grid item xs={12} sm={3}>
                                    <TimePicker
                                      label="Hora de Salida"
                                      value={dayjs(`2024-01-01 ${salida}`)}
                                      onChange={(newValue) => {
                                        const timeString = newValue.format('HH:mm');
                                        setFieldValue(dia.salida, timeString);
                                        if (entrada) {
                                          validarHorario(entrada, timeString, dia.key);
                                        }
                                      }}
                                      ampm={false}
                                      slotProps={{
                                        textField: {
                                          fullWidth: true,
                                          size: 'small',
                                          error: touched[dia.salida] && Boolean(errors[dia.salida]),
                                          helperText: touched[dia.salida] && errors[dia.salida]
                                        }
                                      }}
                                    />
                                  </Grid>
                                  
                                  <Grid item xs={12} sm={2}>
                                    {duracion && (
                                      <Chip
                                        icon={validation?.es_valido === false ? <WarningIcon /> : <CheckIcon />}
                                        label={`${duracion.horas}h ${duracion.minutos}m`}
                                        color={validation?.es_valido === false ? 'warning' : 'success'}
                                        size="small"
                                      />
                                    )}
                                  </Grid>
                                  
                                  <Grid item xs={12} sm={2}>
                                    <IconButton
                                      size="small"
                                      onClick={() => copiarHorarioATodos(values, setFieldValue, dia.key)}
                                      title={`Copiar horario de ${dia.label} a todos los días`}
                                    >
                                      <CopyIcon />
                                    </IconButton>
                                  </Grid>
                                  
                                  {validation && validation.errores.length > 0 && (
                                    <Grid item xs={12}>
                                      <Alert severity="warning" size="small">
                                        {validation.errores.join(', ')}
                                      </Alert>
                                    </Grid>
                                  )}
                                </Grid>
                              </Paper>
                            </Grid>
                          );
                        })}
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
                
                {/* Resumen del horario */}
                <Grid item xs={12}>
                  <Card>
                    <CardHeader title="Resumen del Horario" />
                    <CardContent>
                      <Grid container spacing={2}>
                        {diasSemana.map((dia) => {
                          const entrada = values[dia.entrada];
                          const salida = values[dia.salida];
                          const duracion = calcularDuracion(entrada, salida);
                          
                          return (
                            <Grid item xs={12} sm={6} md={4} lg={2.4} key={dia.key}>
                              <Box sx={{ textAlign: 'center', p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                                <Typography variant="subtitle2" fontWeight="bold">
                                  {dia.label}
                                </Typography>
                                <Typography variant="body2">
                                  {entrada} - {salida}
                                </Typography>
                                {duracion && (
                                  <Typography variant="caption" color="text.secondary">
                                    {duracion.horas}h {duracion.minutos}m
                                  </Typography>
                                )}
                              </Box>
                            </Grid>
                          );
                        })}
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
              
              {/* Botones de acción */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4, mb: 4 }}>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/horarios')}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />}
                  disabled={isSubmitting || saving}
                >
                  {saving ? 'Guardando...' : (isEditMode ? 'Actualizar Horario' : 'Crear Horario')}
                </Button>
              </Box>
            </Form>
          )}
        </Formik>
      </LocalizationProvider>
    </Container>
  );
};

export default HorarioForm;