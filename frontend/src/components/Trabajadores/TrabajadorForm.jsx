import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  Container,
  Divider,
  FormControl,
  FormControlLabel,
  FormHelperText,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stepper,
  Step,
  StepLabel,
  Switch,
  TextField,
  Typography,
  Alert,
  FormGroup,
  IconButton,
} from '@mui/material';
import {
  ArrowBack,
  Save,
  AddAPhoto,
  Fingerprint,
  PersonAdd,
  Work,
  School,
  VerifiedUser,
  CheckCircle
} from '@mui/icons-material';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { trabajadorService, catalogoService } from '../../services/api';
import HuellaSimulator from './HuellaSimulator';

// Validación completa del formulario con huella condicional
const getValidationSchema = (isEditMode) => Yup.object({
  // Datos personales
  nombre: Yup.string().required('El nombre es requerido'),
  apellidoPaterno: Yup.string().required('El apellido paterno es requerido'),
  apellidoMaterno: Yup.string().required('El apellido materno es requerido'),
  rfc: Yup.string()
    .required('El RFC es requerido')
    .min(12, 'El RFC debe tener al menos 12 caracteres')
    .max(13, 'El RFC debe tener máximo 13 caracteres'),
  curp: Yup.string()
    .required('El CURP es requerido')
    .length(18, 'El CURP debe tener 18 caracteres'),
  correo: Yup.string()
    .email('Correo electrónico inválido')
    .required('El correo es requerido'),
  
  // Datos laborales
  id_tipo: Yup.string().required('El tipo de trabajador es requerido'),
  departamento: Yup.string().required('El departamento es requerido'),
  puesto: Yup.string().required('El puesto es requerido'),
  id_horario: Yup.string().required('El horario es requerido'),
  id_centroTrabajo: Yup.string().required('El centro de trabajo es requerido'),
  turno: Yup.string().required('El turno es requerido'),
  fechaIngresoSep: Yup.date().nullable().required('La fecha de ingreso a SEP es requerida'),
  fechaIngresoRama: Yup.date().nullable().required('La fecha de ingreso a la rama es requerida'),
  fechaIngresoGobFed: Yup.date().nullable().required('La fecha de ingreso al gobierno federal es requerida'),
  
  // Datos académicos
  id_gradoEstudios: Yup.string().required('El grado de estudios es requerido'),
  titulo: Yup.string().required('El título es requerido'),
  cedula: Yup.string().required('La cédula es requerida'),
  escuelaEgreso: Yup.string().required('La escuela de egreso es requerida'),
  
  // Acceso al sistema
  id_rol: Yup.string().required('El rol es requerido'),
  tieneCuenta: Yup.boolean(),
  password: Yup.string().when('tieneCuenta', {
    is: true,
    then: () => isEditMode 
      ? Yup.string().min(6, 'La contraseña debe tener al menos 6 caracteres').nullable()
      : Yup.string().min(6, 'La contraseña debe tener al menos 6 caracteres').required('La contraseña es requerida si el trabajador tiene acceso'),
    otherwise: () => Yup.string().nullable()
  }),
  confirmPassword: Yup.string().when(['tieneCuenta', 'password'], {
    is: (tieneCuenta, password) => tieneCuenta && password,
    then: () => Yup.string()
      .oneOf([Yup.ref('password'), null], 'Las contraseñas deben coincidir')
      .required('Confirma la contraseña'),
    otherwise: () => Yup.string().nullable()
  }),
  
  // Huella digital - SOLO requerida en modo creación
  huellaDigital: isEditMode 
    ? Yup.string().nullable() 
    : Yup.string().nullable().required('La huella digital es requerida para nuevos trabajadores')
});

const TrabajadorForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  
  // Estados para el formulario
  const [initialValues, setInitialValues] = useState({
    nombre: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    rfc: '',
    curp: '',
    correo: '',
    id_tipo: '',
    departamento: '',
    puesto: '',
    id_horario: '',
    id_centroTrabajo: '',
    turno: 'MATUTINO',
    fechaIngresoSep: null,
    fechaIngresoRama: null,
    fechaIngresoGobFed: null,
    id_gradoEstudios: '',
    titulo: '',
    cedula: '',
    escuelaEgreso: '',
    id_rol: '',
    estado: true,
    tieneCuenta: false,
    password: '',
    confirmPassword: '',
    huellaDigital: null
  });
  
  // Estados para catálogos
  const [tiposTrabajador, setTiposTrabajador] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [centrosTrabajo, setCentrosTrabajo] = useState([]);
  const [gradosEstudio, setGradosEstudio] = useState([]);
  const [roles, setRoles] = useState([]);
  
  // Estados para UI
  const [loading, setLoading] = useState(isEditMode);
  const [loadingCatalogos, setLoadingCatalogos] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  const [huellaCaptured, setHuellaCaptured] = useState(false);
  const [huellaExistente, setHuellaExistente] = useState(false); // Nueva bandera para huella existente
  const [updateHuella, setUpdateHuella] = useState(false); // Bandera para actualizar huella
  
  // Definir los pasos del wizard
  const steps = ['Datos personales', 'Datos laborales', 'Datos académicos', 'Acceso al sistema', 'Huella digital'];
  
  // Cargar los datos del trabajador si estamos editando
  useEffect(() => {
    const fetchTrabajador = async () => {
      if (!isEditMode) return;
      
      try {
        setLoading(true);
        const data = await trabajadorService.getById(id);
        
        // Convertir fechas a objetos Date
        const formattedData = {
          ...data,
          id_tipo: data.id_tipo ? data.id_tipo.toString() : '',
          departamento: data.departamento ? data.departamento.toString() : '',
          id_horario: data.id_horario ? data.id_horario.toString() : '',
          id_centroTrabajo: data.id_centroTrabajo ? data.id_centroTrabajo.toString() : '',
          id_gradoEstudios: data.id_gradoEstudios ? data.id_gradoEstudios.toString() : '',
          id_rol: data.id_rol ? data.id_rol.toString() : '',
          fechaIngresoSep: new Date(data.fechaIngresoSep),
          fechaIngresoRama: new Date(data.fechaIngresoRama),
          fechaIngresoGobFed: new Date(data.fechaIngresoGobFed),
          tieneCuenta: Boolean(data.hashed_password),
          password: '',
          confirmPassword: ''
        };
        
        setInitialValues(formattedData);
        
        // Verificar si ya tiene huella digital
        // La huella puede venir como BLOB, array de bytes, o string base64
        const tieneHuella = data.huellaDigital && 
                           data.huellaDigital !== null && 
                           data.huellaDigital !== '' &&
                           (
                             (typeof data.huellaDigital === 'string' && data.huellaDigital.length > 0) ||
                             (Array.isArray(data.huellaDigital) && data.huellaDigital.length > 0) ||
                             (data.huellaDigital instanceof ArrayBuffer && data.huellaDigital.byteLength > 0)
                           );
        
        console.log('🔍 DEBUGGING HUELLA:');
        console.log('- Datos recibidos:', data);
        console.log('- huellaDigital raw:', data.huellaDigital);
        console.log('- Tipo de huellaDigital:', typeof data.huellaDigital);
        console.log('- Es array?:', Array.isArray(data.huellaDigital));
        console.log('- Longitud:', data.huellaDigital?.length || 'N/A');
        console.log('- Tiene huella calculado:', tieneHuella);
        
        if (tieneHuella) {
          setHuellaExistente(true);
          setHuellaCaptured(true);
          setUpdateHuella(false); // Por defecto no actualizar
          console.log('✅ Trabajador tiene huella existente');
        } else {
          setHuellaExistente(false);
          setHuellaCaptured(false);
          setUpdateHuella(false);
          console.log('❌ Trabajador NO tiene huella existente');
        }
      } catch (err) {
        console.error('Error al cargar datos del trabajador:', err);
        setError('No se pudieron cargar los datos del trabajador. Inténtalo de nuevo más tarde.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTrabajador();
  }, [id, isEditMode]);
  
  // Cargar los catálogos necesarios
  useEffect(() => {
    const fetchCatalogos = async () => {
      try {
        setLoadingCatalogos(true);
        console.log('Cargando catálogos...');
        
        const [
          tiposResponse,
          deptosResponse,
          horariosResponse,
          ctResponse,
          gradosResponse,
          rolesResponse
        ] = await Promise.all([
          catalogoService.getTiposTrabajador(),
          catalogoService.getDepartamentos(),
          catalogoService.getHorarios(),
          catalogoService.getCentrosTrabajo(),
          catalogoService.getGradosEstudio(),
          catalogoService.getRolesUsuario()
        ]);
        
        console.log('Catálogos cargados:', {
          tipos: tiposResponse,
          departamentos: deptosResponse,
          horarios: horariosResponse,
          centros: ctResponse,
          grados: gradosResponse,
          roles: rolesResponse
        });
        
        setTiposTrabajador(tiposResponse || []);
        setDepartamentos(deptosResponse || []);
        setHorarios(horariosResponse || []);
        setCentrosTrabajo(ctResponse || []);
        setGradosEstudio(gradosResponse || []);
        setRoles(rolesResponse || []);
      } catch (err) {
        console.error('Error al cargar catálogos:', err);
        setError('No se pudieron cargar algunos catálogos necesarios.');
      } finally {
        setLoadingCatalogos(false);
      }
    };
    
    fetchCatalogos();
  }, []);
  
  // Manejadores para el stepper
  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };
  
  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };
  
  // Función principal para manejar el envío del formulario
  const handleFormSubmit = async (values, { setSubmitting, setFieldError }) => {
    console.log('🚀 INICIANDO ENVÍO DEL FORMULARIO');
    console.log('📝 Valores recibidos:', values);
    console.log('🔧 Modo edición:', isEditMode);
    console.log('👆 Huella existente:', huellaExistente);
    console.log('🔄 Actualizar huella:', updateHuella);
    
    // Validar huella SOLO para nuevos trabajadores o si se va a actualizar
    if (!isEditMode) {
      // Modo creación: huella obligatoria
      if (!values.huellaDigital && !huellaCaptured) {
        console.log('❌ Error: Falta huella digital para nuevo trabajador');
        setFieldError('huellaDigital', 'Es necesario capturar la huella digital para nuevos trabajadores');
        setActiveStep(4);
        setSubmitting(false);
        return;
      }
    } else {
      // Modo edición: huella opcional
      if (updateHuella && !values.huellaDigital && !huellaCaptured) {
        console.log('❌ Error: Se marcó actualizar huella pero no se capturó');
        setFieldError('huellaDigital', 'Es necesario capturar la nueva huella digital');
        setActiveStep(4);
        setSubmitting(false);
        return;
      }
    }
    
    try {
      setSaving(true);
      setError(null);
      console.log('🔄 Preparando datos...');
      
      // Preparar los datos a enviar
      const trabajadorData = {
        nombre: values.nombre,
        apellidoPaterno: values.apellidoPaterno,
        apellidoMaterno: values.apellidoMaterno,
        rfc: values.rfc,
        curp: values.curp,
        correo: values.correo,
        id_tipo: parseInt(values.id_tipo) || 1,
        departamento: parseInt(values.departamento) || 1,
        puesto: values.puesto,
        id_horario: parseInt(values.id_horario) || 1,
        estado: values.estado,
        id_centroTrabajo: parseInt(values.id_centroTrabajo) || 1,
        id_gradoEstudios: parseInt(values.id_gradoEstudios) || 1,
        titulo: values.titulo,
        cedula: values.cedula,
        escuelaEgreso: values.escuelaEgreso,
        turno: values.turno,
        fechaIngresoSep: values.fechaIngresoSep ? new Date(values.fechaIngresoSep).toISOString() : new Date().toISOString(),
        fechaIngresoRama: values.fechaIngresoRama ? new Date(values.fechaIngresoRama).toISOString() : new Date().toISOString(),
        fechaIngresoGobFed: values.fechaIngresoGobFed ? new Date(values.fechaIngresoGobFed).toISOString() : new Date().toISOString(),
        id_rol: parseInt(values.id_rol) || 1,
      };
      
      // Manejar huella digital
      if (!isEditMode) {
        // Modo creación: siempre incluir huella
        trabajadorData.huellaDigital = values.huellaDigital || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAA';
      } else {
        // Modo edición: solo incluir si se va a actualizar
        if (updateHuella && values.huellaDigital) {
          trabajadorData.huellaDigital = values.huellaDigital;
          console.log('🔄 Actualizando huella digital...');
        }
        // Si no se actualiza la huella, no enviar el campo
      }
      
      // SOLO agregar password si el trabajador tiene cuenta Y la contraseña no está vacía
      if (values.tieneCuenta && values.password && values.password.trim()) {
        trabajadorData.password = values.password;
      }
      
      console.log('📤 Datos preparados para envío:', trabajadorData);
      
      let response;
      if (isEditMode) {
        response = await trabajadorService.update(id, trabajadorData);
        console.log('✅ Trabajador actualizado:', response);
      } else {
        response = await trabajadorService.create(trabajadorData);
        console.log('✅ Trabajador creado:', response);
      }
      
      alert(isEditMode ? '¡Trabajador actualizado exitosamente!' : '¡Trabajador creado exitosamente!');
      navigate('/trabajadores');
      
    } catch (err) {
      console.error('❌ ERROR AL GUARDAR:', err);
      console.error('❌ Response status:', err.response?.status);
      console.error('❌ Response data completa:', err.response?.data);
      
      let errorMessage = 'Error al guardar el trabajador.';
      if (err.response?.data?.detail) {
        if (Array.isArray(err.response.data.detail)) {
          errorMessage = 'Errores de validación:\n' + err.response.data.detail.map(e => 
            `• Campo: ${e.loc.join('.')} - Error: ${e.msg} - Tipo esperado: ${e.type} - Valor recibido: ${JSON.stringify(e.input)}`
          ).join('\n');
        } else {
          errorMessage = err.response.data.detail;
        }
      }
      
      console.error('💥 Error detallado completo:', errorMessage);
      alert(`Error al guardar:\n\n${errorMessage}`);
      
      setError(errorMessage);
    } finally {
      setSaving(false);
      setSubmitting(false);
    }
  };
  
  if (loading || loadingCatalogos) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>
          {loadingCatalogos ? 'Cargando catálogos...' : 'Cargando datos...'}
        </Typography>
      </Box>
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
        
        <Typography variant="h4" gutterBottom>
          {isEditMode ? 'Editar Trabajador' : 'Nuevo Trabajador'}
        </Typography>
        
        <Typography variant="subtitle1" color="text.secondary">
          {isEditMode
            ? 'Actualiza la información del trabajador'
            : 'Completa el formulario para registrar un nuevo trabajador'}
        </Typography>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{error}</pre>
        </Alert>
      )}
      
      <Paper sx={{ p: 3, mb: 4 }}>
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        
        <Formik
          initialValues={initialValues}
          validationSchema={getValidationSchema(isEditMode)}
          onSubmit={handleFormSubmit}
          enableReinitialize
        >
          {({
            values,
            errors,
            touched,
            handleChange,
            handleBlur,
            isSubmitting,
            setFieldValue,
            submitForm
          }) => (
            <Form>
              {/* Paso 1: Datos personales */}
              {activeStep === 0 && (
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      Datos personales
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Nombre(s)"
                      name="nombre"
                      value={values.nombre}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.nombre && Boolean(errors.nombre)}
                      helperText={touched.nombre && errors.nombre}
                      required
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Apellido Paterno"
                      name="apellidoPaterno"
                      value={values.apellidoPaterno}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.apellidoPaterno && Boolean(errors.apellidoPaterno)}
                      helperText={touched.apellidoPaterno && errors.apellidoPaterno}
                      required
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Apellido Materno"
                      name="apellidoMaterno"
                      value={values.apellidoMaterno}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.apellidoMaterno && Boolean(errors.apellidoMaterno)}
                      helperText={touched.apellidoMaterno && errors.apellidoMaterno}
                      required
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="RFC"
                      name="rfc"
                      value={values.rfc}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.rfc && Boolean(errors.rfc)}
                      helperText={touched.rfc && errors.rfc}
                      required
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="CURP"
                      name="curp"
                      value={values.curp}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.curp && Boolean(errors.curp)}
                      helperText={touched.curp && errors.curp}
                      required
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Correo Electrónico"
                      name="correo"
                      type="email"
                      value={values.correo}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.correo && Boolean(errors.correo)}
                      helperText={touched.correo && errors.correo}
                      required
                    />
                  </Grid>
                </Grid>
              )}
              
              {/* Paso 2: Datos laborales */}
              {activeStep === 1 && (
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      Datos laborales
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth error={touched.id_tipo && Boolean(errors.id_tipo)}>
                      <InputLabel required>Tipo de Trabajador</InputLabel>
                      <Select
                        name="id_tipo"
                        value={values.id_tipo}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        label="Tipo de Trabajador"
                      >
                        {tiposTrabajador.map((tipo) => (
                          <MenuItem key={tipo.id} value={tipo.id.toString()}>
                            {tipo.descripcion}
                          </MenuItem>
                        ))}
                      </Select>
                      {touched.id_tipo && errors.id_tipo && (
                        <FormHelperText>{errors.id_tipo}</FormHelperText>
                      )}
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth error={touched.departamento && Boolean(errors.departamento)}>
                      <InputLabel required>Departamento</InputLabel>
                      <Select
                        name="departamento"
                        value={values.departamento}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        label="Departamento"
                      >
                        {departamentos.map((depto) => (
                          <MenuItem key={depto.id} value={depto.id.toString()}>
                            {depto.descripcion}
                          </MenuItem>
                        ))}
                      </Select>
                      {touched.departamento && errors.departamento && (
                        <FormHelperText>{errors.departamento}</FormHelperText>
                      )}
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Puesto"
                      name="puesto"
                      value={values.puesto}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.puesto && Boolean(errors.puesto)}
                      helperText={touched.puesto && errors.puesto}
                      required
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth error={touched.id_horario && Boolean(errors.id_horario)}>
                      <InputLabel required>Horario</InputLabel>
                      <Select
                        name="id_horario"
                        value={values.id_horario}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        label="Horario"
                      >
                        {horarios.map((horario) => (
                          <MenuItem key={horario.id} value={horario.id.toString()}>
                            {horario.descripcion}
                          </MenuItem>
                        ))}
                      </Select>
                      {touched.id_horario && errors.id_horario && (
                        <FormHelperText>{errors.id_horario}</FormHelperText>
                      )}
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth error={touched.turno && Boolean(errors.turno)}>
                      <InputLabel required>Turno</InputLabel>
                      <Select
                        name="turno"
                        value={values.turno}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        label="Turno"
                      >
                        <MenuItem value="MATUTINO">Matutino</MenuItem>
                        <MenuItem value="VESPERTINO">Vespertino</MenuItem>
                        <MenuItem value="MIXTO">Mixto</MenuItem>
                      </Select>
                      {touched.turno && errors.turno && (
                        <FormHelperText>{errors.turno}</FormHelperText>
                      )}
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth error={touched.id_centroTrabajo && Boolean(errors.id_centroTrabajo)}>
                      <InputLabel required>Centro de Trabajo</InputLabel>
                      <Select
                        name="id_centroTrabajo"
                        value={values.id_centroTrabajo}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        label="Centro de Trabajo"
                      >
                        {centrosTrabajo.map((centro) => (
                          <MenuItem key={centro.id} value={centro.id.toString()}>
                            {centro.plantel} - {centro.ubicacion}
                          </MenuItem>
                        ))}
                      </Select>
                      {touched.id_centroTrabajo && errors.id_centroTrabajo && (
                        <FormHelperText>{errors.id_centroTrabajo}</FormHelperText>
                      )}
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={values.estado}
                            onChange={(e) => setFieldValue('estado', e.target.checked)}
                            name="estado"
                            color="primary"
                          />
                        }
                        label="Trabajador Activo"
                      />
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
                      <DatePicker
                        label="Fecha de Ingreso SEP"
                        value={values.fechaIngresoSep ? dayjs(values.fechaIngresoSep) : null}
                        onChange={(date) => setFieldValue('fechaIngresoSep', date ? date.toDate() : null)}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            required: true,
                            error: touched.fechaIngresoSep && Boolean(errors.fechaIngresoSep),
                            helperText: touched.fechaIngresoSep && errors.fechaIngresoSep
                          }   
                        }}
                      />
                    </LocalizationProvider>
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
                      <DatePicker
                        label="Fecha de Ingreso a la Rama"
                        value={values.fechaIngresoRama ? dayjs(values.fechaIngresoRama) : null}
                        onChange={(date) => setFieldValue('fechaIngresoRama', date ? date.toDate() : null)}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            required: true,
                            error: touched.fechaIngresoRama && Boolean(errors.fechaIngresoRama),
                            helperText: touched.fechaIngresoRama && errors.fechaIngresoRama
                          }
                        }}
                      />
                    </LocalizationProvider>
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
                      <DatePicker
                        label="Fecha de Ingreso Gobierno Federal"
                        value={values.fechaIngresoGobFed ? dayjs(values.fechaIngresoGobFed) : null}
                        onChange={(date) => setFieldValue('fechaIngresoGobFed', date ? date.toDate() : null)}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            required: true,
                            error: touched.fechaIngresoGobFed && Boolean(errors.fechaIngresoGobFed),
                            helperText: touched.fechaIngresoGobFed && errors.fechaIngresoGobFed
                          }
                        }}
                      />
                    </LocalizationProvider>
                  </Grid>
                </Grid>
              )}
              
              {/* Paso 3: Datos académicos */}
              {activeStep === 2 && (
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      Datos académicos
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth error={touched.id_gradoEstudios && Boolean(errors.id_gradoEstudios)}>
                      <InputLabel required>Grado de Estudios</InputLabel>
                      <Select
                        name="id_gradoEstudios"
                        value={values.id_gradoEstudios}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        label="Grado de Estudios"
                      >
                        {gradosEstudio.map((grado) => (
                          <MenuItem key={grado.id} value={grado.id.toString()}>
                            {grado.descripcion}
                          </MenuItem>
                        ))}
                      </Select>
                      {touched.id_gradoEstudios && errors.id_gradoEstudios && (
                        <FormHelperText>{errors.id_gradoEstudios}</FormHelperText>
                      )}
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Título"
                      name="titulo"
                      value={values.titulo}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.titulo && Boolean(errors.titulo)}
                      helperText={touched.titulo && errors.titulo}
                      required
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Cédula Profesional"
                      name="cedula"
                      value={values.cedula}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.cedula && Boolean(errors.cedula)}
                      helperText={touched.cedula && errors.cedula}
                      required
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Escuela de Egreso"
                      name="escuelaEgreso"
                      value={values.escuelaEgreso}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.escuelaEgreso && Boolean(errors.escuelaEgreso)}
                      helperText={touched.escuelaEgreso && errors.escuelaEgreso}
                      required
                    />
                  </Grid>
                </Grid>
              )}
              
              {/* Paso 4: Acceso al sistema */}
              {activeStep === 3 && (
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      Acceso al sistema
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      Configure si este trabajador tendrá acceso al sistema de administración. 
                      No todos los trabajadores necesitan acceso.
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <FormGroup>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={values.tieneCuenta}
                            onChange={(e) => setFieldValue('tieneCuenta', e.target.checked)}
                            name="tieneCuenta"
                            color="primary"
                          />
                        }
                        label="Este trabajador tiene acceso al sistema"
                      />
                    </FormGroup>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth error={touched.id_rol && Boolean(errors.id_rol)}>
                      <InputLabel required>Rol en el sistema</InputLabel>
                      <Select
                        name="id_rol"
                        value={values.id_rol}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        label="Rol en el sistema"
                      >
                        {roles.map((rol) => (
                          <MenuItem key={rol.id} value={rol.id.toString()}>
                            {rol.descripcion}
                          </MenuItem>
                        ))}
                      </Select>
                      {touched.id_rol && errors.id_rol && (
                        <FormHelperText>{errors.id_rol}</FormHelperText>
                      )}
                    </FormControl>
                  </Grid>
                  
                  {values.tieneCuenta && (
                    <>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label={isEditMode ? "Nueva Contraseña (opcional)" : "Contraseña"}
                          name="password"
                          type="password"
                          value={values.password}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          error={touched.password && Boolean(errors.password)}
                          helperText={touched.password && errors.password || (isEditMode ? "Deja en blanco para mantener la contraseña actual" : "")}
                          required={!isEditMode && values.tieneCuenta}
                        />
                      </Grid>
                      
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Confirmar Contraseña"
                          name="confirmPassword"
                          type="password"
                          value={values.confirmPassword}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          error={touched.confirmPassword && Boolean(errors.confirmPassword)}
                          helperText={touched.confirmPassword && errors.confirmPassword}
                          required={!isEditMode && values.tieneCuenta || (isEditMode && values.password)}
                        />
                      </Grid>
                      
                      <Grid item xs={12}>
                        <Alert severity="info">
                          {isEditMode 
                            ? "Si no ingresas una nueva contraseña, se mantendrá la actual. El trabajador podrá iniciar sesión usando su RFC."
                            : "Este trabajador podrá iniciar sesión usando su RFC y la contraseña asignada."
                          }
                        </Alert>
                      </Grid>
                    </>
                  )}
                </Grid>
              )}
              
              {/* Paso 5: Huella digital */}
              {activeStep === 4 && (
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      Huella digital
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {isEditMode 
                        ? "Gestiona la huella digital del trabajador."
                        : "Captura la huella digital del trabajador para que pueda registrar su asistencia."
                      }
                    </Typography>
                  </Grid>
                  
                  {/* DEBUG: Mostrar estados actuales */}
                  <Grid item xs={12}>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      <Typography variant="caption" component="div">
                        <strong>DEBUG INFO:</strong><br/>
                        • Modo edición: {isEditMode.toString()}<br/>
                        • Huella existente: {huellaExistente.toString()}<br/>
                        • Actualizar huella: {updateHuella.toString()}<br/>
                        • Huella capturada: {huellaCaptured.toString()}<br/>
                        • Valores.huellaDigital: {values.huellaDigital ? 'SÍ tiene' : 'NO tiene'}
                      </Typography>
                    </Alert>
                  </Grid>
                  
                  {/* Opciones para todos los casos en modo edición */}
                  {isEditMode && (
                    <Grid item xs={12}>
                      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                        <Typography variant="subtitle1" gutterBottom>
                          Opciones de huella digital:
                        </Typography>
                        
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                          {/* Opción: Mantener huella actual */}
                          <Button
                            variant={!updateHuella ? "contained" : "outlined"}
                            color={!updateHuella ? "success" : "inherit"}
                            onClick={() => {
                              console.log('👍 Usuario eligió MANTENER huella actual');
                              setUpdateHuella(false);
                              setHuellaCaptured(true);
                              setFieldValue('huellaDigital', null);
                            }}
                            startIcon={<CheckCircle />}
                          >
                            {huellaExistente ? 'Mantener huella actual' : 'Sin huella (mantener)'}
                          </Button>
                          
                          {/* Opción: Actualizar/Capturar huella */}
                          <Button
                            variant={updateHuella ? "contained" : "outlined"}
                            color={updateHuella ? "primary" : "inherit"}
                            onClick={() => {
                              console.log('🔄 Usuario eligió ACTUALIZAR/CAPTURAR huella');
                              setUpdateHuella(true);
                              setHuellaCaptured(false);
                              setFieldValue('huellaDigital', null);
                            }}
                            startIcon={<Fingerprint />}
                          >
                            {huellaExistente ? 'Actualizar huella' : 'Capturar nueva huella'}
                          </Button>
                        </Box>
                        
                        {/* Estado actual */}
                        <Box sx={{ mt: 2, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                          <Typography variant="body2">
                            <strong>Estado actual:</strong> {
                              !updateHuella 
                                ? huellaExistente 
                                  ? '✅ Se mantendrá la huella digital existente'
                                  : '⚠️ El trabajador no tendrá huella digital'
                                : '🔄 Se capturará/actualizará la huella digital'
                            }
                          </Typography>
                        </Box>
                      </Paper>
                    </Grid>
                  )}
                  
                  {/* Mostrar capturador cuando corresponde */}
                  {(!isEditMode || updateHuella) && (
                    <Grid item xs={12}>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="subtitle1" gutterBottom>
                          {isEditMode ? 'Capturar nueva huella digital:' : 'Capturar huella digital:'}
                        </Typography>
                        <HuellaSimulator
                          onHuellaCapturada={(huellaData) => {
                            console.log('🖐️ Huella capturada en simulador:', huellaData);
                            if (huellaData) {
                              setFieldValue('huellaDigital', huellaData.data);
                              setHuellaCaptured(true);
                              console.log('✅ Huella guardada en formulario');
                            } else {
                              setFieldValue('huellaDigital', null);
                              setHuellaCaptured(false);
                              console.log('❌ Huella eliminada del formulario');
                            }
                          }}
                          huellaCaptured={false} // Siempre empezar desde cero cuando se muestra
                        />
                      </Paper>
                    </Grid>
                  )}
                  
                  {/* Información contextual */}
                  <Grid item xs={12}>
                    <Alert 
                      severity={
                        !isEditMode 
                          ? "warning"
                          : updateHuella 
                            ? "info"
                            : huellaExistente 
                              ? "success"
                              : "warning"
                      }
                    >
                      {!isEditMode 
                        ? "⚠️ La huella digital es obligatoria para nuevos trabajadores."
                        : updateHuella 
                          ? "ℹ️ Captura la nueva huella digital. Se reemplazará la actual."
                          : huellaExistente 
                            ? "✅ Se mantendrá la huella digital actual del trabajador."
                            : "⚠️ El trabajador no podrá registrar asistencia sin huella digital."
                      }
                    </Alert>
                  </Grid>
                  
                  {/* Error de validación si es necesario */}
                  {touched.huellaDigital && errors.huellaDigital && (
                    <Grid item xs={12}>
                      <Alert severity="error">
                        <strong>Error:</strong> {errors.huellaDigital}
                      </Alert>
                    </Grid>
                  )}
                </Grid>
              )}
              
              {/* Botones de navegación */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                <Button
                  disabled={activeStep === 0}
                  onClick={handleBack}
                >
                  Anterior
                </Button>
                
                <Box>
                  {activeStep === steps.length - 1 ? (
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />}
                      disabled={isSubmitting || saving}
                      onClick={(e) => {
                        e.preventDefault();
                        console.log('🔘 Botón presionado - Ejecutando submitForm');
                        console.log('Estado actual:', { isSubmitting, saving, values });
                        submitForm();
                      }}
                    >
                      {saving ? 'Guardando...' : (isEditMode ? 'Actualizar Trabajador' : 'Crear Trabajador')}
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleNext}
                    >
                      Siguiente
                    </Button>
                  )}
                </Box>
              </Box>
            </Form>
          )}
        </Formik>
      </Paper>
    </Container>
  );
};

export default TrabajadorForm;