import React, { useState, useEffect } from 'react';
import { boolean } from 'yup';
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
  VerifiedUser
} from '@mui/icons-material';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { es } from 'date-fns/locale';
import { trabajadorService, catalogoService } from '../../services/api';
import HuellaSimulator from './HuellaSimulator';

// Validación para el formulario
const validationSchema = Yup.object({
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
  id_tipo: Yup.number().required('El tipo de trabajador es requerido'),
  departamento: Yup.number().required('El departamento es requerido'),
  puesto: Yup.string().required('El puesto es requerido'),
  id_horario: Yup.number().required('El horario es requerido'),
  id_centroTrabajo: Yup.number().required('El centro de trabajo es requerido'),
  turno: Yup.string().required('El turno es requerido'),
  fechaIngresoSep: Yup.date().required('La fecha de ingreso a SEP es requerida'),
  fechaIngresoRama: Yup.date().required('La fecha de ingreso a la rama es requerida'),
  fechaIngresoGobFed: Yup.date().required('La fecha de ingreso al gobierno federal es requerida'),
  
  // Datos académicos
  id_gradoEstudios: Yup.number().required('El grado de estudios es requerido'),
  titulo: Yup.string().required('El título es requerido'),
  cedula: Yup.string().required('La cédula es requerida'),
  escuelaEgreso: Yup.string().required('La escuela de egreso es requerida'),
  
  // Acceso al sistema (opcional)
  id_rol: Yup.number().required('El rol es requerido'),
  tieneCuenta: Yup.boolean(),
  password: Yup.string().when('tieneCuenta', {
    is: true,
    then: () => Yup.string()
      .min(6, 'La contraseña debe tener al menos 6 caracteres')
      .required('La contraseña es requerida si el trabajador tiene acceso'),
    otherwise: () => Yup.string()
  }),
  confirmPassword: Yup.string().when('tieneCuenta', {
    is: true,
    then: () => Yup.string()
      .oneOf([Yup.ref('password'), null], 'Las contraseñas deben coincidir')
      .required('Confirma la contraseña'),
    otherwise: () => Yup.string()
  }),
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
          fechaIngresoSep: new Date(data.fechaIngresoSep),
          fechaIngresoRama: new Date(data.fechaIngresoRama),
          fechaIngresoGobFed: new Date(data.fechaIngresoGobFed),
          tieneCuenta: Boolean(data.hashed_password),
          password: '',
          confirmPassword: ''
        };
        
        setInitialValues(formattedData);
        if (data.huellaDigital) {
          setHuellaCaptured(true);
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
        
        setTiposTrabajador(tiposResponse);
        setDepartamentos(deptosResponse);
        setHorarios(horariosResponse);
        setCentrosTrabajo(ctResponse);
        setGradosEstudio(gradosResponse);
        setRoles(rolesResponse);
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
  
  // Función para simular la captura de huella
  const simulateCapture = (setFieldValue) => {
    // Simulamos una captura exitosa con una cadena base64 ficticia
    const huellaSimulada = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAA";
    setFieldValue('huellaDigital', huellaSimulada);
    setHuellaCaptured(true);
  };
  
  // Función principal para manejar el envío del formulario
  const handleSubmit = async (values, { setSubmitting, setFieldError }) => {
    // No enviar si no se ha capturado la huella
    if (!values.huellaDigital && !huellaCaptured) {
      setFieldError('huellaDigital', 'Es necesario capturar la huella digital');
      setActiveStep(4); // Ir al paso de la huella
      setSubmitting(false);
      return;
    }
    
    try {
      setSaving(true);
      
      // Preparar los datos a enviar
      const trabajadorData = {
        ...values,
        // Si no tiene cuenta, no enviar contraseña
        ...(values.tieneCuenta ? {} : { password: null })
      };
      
      // Eliminar campos que no son parte del modelo
      delete trabajadorData.tieneCuenta;
      delete trabajadorData.confirmPassword;
      
      if (isEditMode) {
        await trabajadorService.update(id, trabajadorData);
      } else {
        await trabajadorService.create(trabajadorData);
      }
      
      // Navegar de vuelta a la lista de trabajadores
      navigate('/trabajadores');
    } catch (err) {
      console.error('Error al guardar trabajador:', err);
      setError('No se pudo guardar la información del trabajador. Inténtalo de nuevo más tarde.');
      setSubmitting(false);
    } finally {
      setSaving(false);
    }
  };
  
  if (loading || loadingCatalogos) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
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
          {error}
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
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({
            values,
            errors,
            touched,
            handleChange,
            handleBlur,
            handleSubmit,
            isSubmitting,
            setFieldValue
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
                          <MenuItem key={tipo.id} value={tipo.id}>
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
                          <MenuItem key={depto.id} value={depto.id}>
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
                          <MenuItem key={horario.id} value={horario.id}>
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
                          <MenuItem key={centro.id} value={centro.id}>
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
                    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                      <DatePicker
                        label="Fecha de Ingreso a la Rama"
                        value={values.fechaIngresoRama}
                        onChange={(date) => setFieldValue('fechaIngresoRama', date)}
                        slotProps={(params) => (
                          <TextField
                            {...params}
                            fullWidth
                            required
                            error={touched.fechaIngresoRama && Boolean(errors.fechaIngresoRama)}
                            helperText={touched.fechaIngresoRama && errors.fechaIngresoRama}
                          />
                        )}
                      />
                    </LocalizationProvider>
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                      <DatePicker
                        label="Fecha de Ingreso Gobierno Federal"
                        value={values.fechaIngresoGobFed}
                        onChange={(date) => setFieldValue('fechaIngresoGobFed', date)}
                        slotProps={(params) => (
                          <TextField
                            {...params}
                            fullWidth
                            required
                            error={touched.fechaIngresoGobFed && Boolean(errors.fechaIngresoGobFed)}
                            helperText={touched.fechaIngresoGobFed && errors.fechaIngresoGobFed}
                          />
                        )}
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
                          <MenuItem key={grado.id} value={grado.id}>
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
                  
                  {values.tieneCuenta && (
                    <>
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
                              <MenuItem key={rol.id} value={rol.id}>
                                {rol.descripcion}
                              </MenuItem>
                            ))}
                          </Select>
                          {touched.id_rol && errors.id_rol && (
                            <FormHelperText>{errors.id_rol}</FormHelperText>
                          )}
                        </FormControl>
                      </Grid>
                      
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Contraseña"
                          name="password"
                          type="password"
                          value={values.password}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          error={touched.password && Boolean(errors.password)}
                          helperText={touched.password && errors.password}
                          required={values.tieneCuenta}
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
                          required={values.tieneCuenta}
                        />
                      </Grid>
                      
                      <Grid item xs={12}>
                        <Alert severity="info">
                          Este trabajador podrá iniciar sesión usando su RFC y la contraseña asignada.
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
                      Captura la huella digital del trabajador para que pueda registrar su asistencia.
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <HuellaSimulator
                      onHuellaCapturada={(huellaData) => {
                        if (huellaData) {
                          setFieldValue('huellaDigital', huellaData.data);
                          setHuellaCaptured(true);
                        } else {
                          setFieldValue('huellaDigital', null);
                          setHuellaCaptured(false);
                        }
                      }}
                      huellaCaptured={huellaCaptured}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Alert severity="info">
                      La huella digital es necesaria para que el trabajador pueda registrar su asistencia 
                      mediante el lector biométrico.
                    </Alert>
                  </Grid>
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
                      startIcon={<Save />}
                      type="submit"
                      disabled={isSubmitting || saving}
                    >
                      {saving ? <CircularProgress size={24} /> : 'Guardar Trabajador'}
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