import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Crear instancia de axios con configuración base
const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar el token de autenticación a las solicitudes
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para manejar respuestas y errores
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Manejar errores de autenticación
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Servicios de autenticación
const authService = {
  login: async (rfc, password) => {
    const response = await axiosInstance.post('/login', { rfc, password });
    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token);
    }
    return response.data;
  },
  
  loginWithBiometric: async (huellaBase64) => {
    const response = await axiosInstance.post('/biometrico/autenticar', { huella_base64: huellaBase64 });
    return response.data;
  },
  
  registrarAsistenciaBiometrica: async (huellaBase64) => {
    const response = await axiosInstance.post('/biometrico/registrar-asistencia', { huella_base64: huellaBase64 });
    return response.data;
  },
  
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  
  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },
};

// Servicios para trabajadores
const trabajadorService = {
  getAll: async (params = {}) => {
    const response = await axiosInstance.get('/trabajadores', { params });
    return response.data;
  },
  
  getById: async (id) => {
    const response = await axiosInstance.get(`/trabajadores/${id}`);
    return response.data;
  },
  
  create: async (trabajador) => {
    const response = await axiosInstance.post('/trabajadores', trabajador);
    return response.data;
  },
  
  update: async (id, trabajador) => {
    const response = await axiosInstance.put(`/trabajadores/${id}`, trabajador);
    return response.data;
  },
  
  delete: async (id) => {
    const response = await axiosInstance.delete(`/trabajadores/${id}`);
    return response.data;
  },
};

// Servicios para asistencias
const asistenciaService = {
  getAll: async (params = {}) => {
    const response = await axiosInstance.get('/asistencias', { params });
    return response.data;
  },
  
  getById: async (id) => {
    const response = await axiosInstance.get(`/asistencias/${id}`);
    return response.data;
  },
  
  create: async (asistencia) => {
    const response = await axiosInstance.post('/asistencias', asistencia);
    return response.data;
  },
  
  update: async (id, asistencia) => {
    const response = await axiosInstance.put(`/asistencias/${id}`, asistencia);
    return response.data;
  },
  
  delete: async (id) => {
    const response = await axiosInstance.delete(`/asistencias/${id}`);
    return response.data;
  },
  
  getAsistenciasByTrabajador: async (trabajadorId, fechaInicio, fechaFin) => {
    const params = {};
    if (fechaInicio) params.fecha_inicio = fechaInicio;
    if (fechaFin) params.fecha_fin = fechaFin;
    
    const response = await axiosInstance.get(`/asistencias/trabajador/${trabajadorId}`, { params });
    return response.data;
  },
  
  getAsistenciasHoy: async () => {
    const response = await axiosInstance.get('/asistencias/hoy');
    return response.data;
  },
};

// Servicios para justificaciones
const justificacionService = {
  getAll: async (params = {}) => {
    const response = await axiosInstance.get('/justificaciones', { params });
    return response.data;
  },
  
  getById: async (id) => {
    const response = await axiosInstance.get(`/justificaciones/${id}`);
    return response.data;
  },
  
  create: async (justificacion) => {
    const response = await axiosInstance.post('/justificaciones', justificacion);
    return response.data;
  },
  
  update: async (id, justificacion) => {
    const response = await axiosInstance.put(`/justificaciones/${id}`, justificacion);
    return response.data;
  },
  
  delete: async (id) => {
    const response = await axiosInstance.delete(`/justificaciones/${id}`);
    return response.data;
  },
  
  getReglasJustificacion: async () => {
    const response = await axiosInstance.get('/reglas-justificacion');
    return response.data;
  },
};

// Servicios para horarios
const horarioService = {
  getAll: async () => {
    const response = await axiosInstance.get('/horarios');
    return response.data;
  },
  
  getById: async (id) => {
    const response = await axiosInstance.get(`/horarios/${id}`);
    return response.data;
  },
  
  create: async (horario) => {
    const response = await axiosInstance.post('/horarios', horario);
    return response.data;
  },
  
  update: async (id, horario) => {
    const response = await axiosInstance.put(`/horarios/${id}`, horario);
    return response.data;
  },
  
  delete: async (id) => {
    const response = await axiosInstance.delete(`/horarios/${id}`);
    return response.data;
  },
  
  getDiasFestivos: async () => {
    const response = await axiosInstance.get('/dias-festivos');
    return response.data;
  },
};

// Servicios para reportes
const reporteService = {
  getAsistenciasDiarias: async (fecha, departamentoId) => {
    const params = {};
    if (fecha) params.fecha = fecha;
    if (departamentoId) params.departamento_id = departamentoId;
    
    const response = await axiosInstance.get('/reportes/asistencias-diarias', { params });
    return response.data;
  },
  
  getAsistenciasMensuales: async (anio, mes, departamentoId) => {
    const params = {};
    if (anio) params.anio = anio;
    if (mes) params.mes = mes;
    if (departamentoId) params.departamento_id = departamentoId;
    
    const response = await axiosInstance.get('/reportes/asistencias-mensuales', { params });
    return response.data;
  },
  
  descargarAsistenciasMensualesCSV: async (anio, mes, departamentoId) => {
    const params = {};
    if (anio) params.anio = anio;
    if (mes) params.mes = mes;
    if (departamentoId) params.departamento_id = departamentoId;
    
    const response = await axiosInstance.get('/reportes/asistencias-mensuales-csv', { 
      params,
      responseType: 'blob'
    });
    
    // Crear un enlace para descargar el archivo
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `asistencias_${anio}_${mes}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },
  
  getReporteRetardos: async (fechaInicio, fechaFin, departamentoId) => {
    const params = {};
    if (fechaInicio) params.fecha_inicio = fechaInicio;
    if (fechaFin) params.fecha_fin = fechaFin;
    if (departamentoId) params.departamento_id = departamentoId;
    
    const response = await axiosInstance.get('/reportes/retardos', { params });
    return response.data;
  },
  
  getReporteFaltas: async (fechaInicio, fechaFin, departamentoId) => {
    const params = {};
    if (fechaInicio) params.fecha_inicio = fechaInicio;
    if (fechaFin) params.fecha_fin = fechaFin;
    if (departamentoId) params.departamento_id = departamentoId;
    
    const response = await axiosInstance.get('/reportes/faltas', { params });
    return response.data;
  },
  
  getReporteJustificaciones: async (fechaInicio, fechaFin, departamentoId, idRegla) => {
    const params = {};
    if (fechaInicio) params.fecha_inicio = fechaInicio;
    if (fechaFin) params.fecha_fin = fechaFin;
    if (departamentoId) params.departamento_id = departamentoId;
    if (idRegla) params.id_regla_justificacion = idRegla;
    
    const response = await axiosInstance.get('/reportes/justificaciones', { params });
    return response.data;
  },
};

// Servicios para departamentos y otros catálogos
const catalogoService = {
  getDepartamentos: async () => {
    const response = await axiosInstance.get('/departamentos');
    return response.data;
  },
  
  getTiposTrabajador: async () => {
    const response = await axiosInstance.get('/tipos-trabajador');
    return response.data;
  },
  
  getGradosEstudio: async () => {
    const response = await axiosInstance.get('/grados-estudio');
    return response.data;
  },
  
  getRolesUsuario: async () => {
    const response = await axiosInstance.get('/roles-usuario');
    return response.data;
  },
  
  getReglasRetardo: async () => {
    const response = await axiosInstance.get('/reglas-retardo');
    return response.data;
  },
  
  getCentrosTrabajo: async () => {
    const response = await axiosInstance.get('/centros-trabajo');
    return response.data;
  },

  getHorarios: async () => {
    const response = await axiosInstance.get('/horarios');
    return response.data;
  },

  //Crear nuevos catálogos
  createDepartamento: async (departamento) => {
    const response = await axiosInstance.post('/departamentos', departamento);
    return response.data;
  },
  
  createTipoTrabajador: async (tipo) => {
    const response = await axiosInstance.post('/tipos-trabajador', tipo);
    return response.data;
  },
  
  createGradoEstudio: async (grado) => {
    const response = await axiosInstance.post('/grados-estudio', grado);
    return response.data;
  },
  
  createRolUsuario: async (rol) => {
    const response = await axiosInstance.post('/roles-usuario', rol);
    return response.data;
  },
  
  createCentroTrabajo: async (centro) => {
    const response = await axiosInstance.post('/centros-trabajo', centro);
    return response.data;
  },
};



export {
  authService,
  trabajadorService,
  asistenciaService,
  justificacionService,
  horarioService,
  reporteService,
  catalogoService,
};