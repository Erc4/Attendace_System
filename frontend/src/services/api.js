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

// Servicios para horarios - COMPLETAMENTE ACTUALIZADO
const horarioService = {
  // Obtener todos los horarios con filtros
  getAll: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.skip) queryParams.append('skip', params.skip);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.descripcion) queryParams.append('descripcion', params.descripcion);
      
      const response = await axiosInstance.get(`/horarios?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener horarios:', error);
      throw error;
    }
  },

  // Obtener horario por ID con detalles completos
  getById: async (id) => {
    try {
      const response = await axiosInstance.get(`/horarios/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener horario:', error);
      throw error;
    }
  },

  // Crear nuevo horario
  create: async (horarioData) => {
    try {
      console.log('Creando horario:', horarioData);
      const response = await axiosInstance.post('/horarios', horarioData);
      return response.data;
    } catch (error) {
      console.error('Error al crear horario:', error);
      throw error;
    }
  },

  // Actualizar horario existente
  update: async (id, horarioData) => {
    try {
      console.log('Actualizando horario:', id, horarioData);
      const response = await axiosInstance.put(`/horarios/${id}`, horarioData);
      return response.data;
    } catch (error) {
      console.error('Error al actualizar horario:', error);
      throw error;
    }
  },

  // Eliminar horario
  delete: async (id) => {
    try {
      await axiosInstance.delete(`/horarios/${id}`);
      return true;
    } catch (error) {
      console.error('Error al eliminar horario:', error);
      throw error;
    }
  },

  // Asignar horario a trabajador
  asignarTrabajador: async (horarioId, asignacionData) => {
    try {
      console.log('Asignando trabajador a horario:', horarioId, asignacionData);
      const response = await axiosInstance.post(`/horarios/${horarioId}/asignar`, asignacionData);
      return response.data;
    } catch (error) {
      console.error('Error al asignar trabajador:', error);
      throw error;
    }
  },

  // Obtener historial de horarios de un trabajador
  getHistorialTrabajador: async (trabajadorId) => {
    try {
      const response = await axiosInstance.get(`/trabajadores/${trabajadorId}/horarios`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener historial de horarios:', error);
      throw error;
    }
  },

  // Obtener trabajadores sin horario asignado
  getTrabajadoresSinHorario: async () => {
    try {
      const response = await axiosInstance.get('/horarios/trabajadores-sin-horario');
      return response.data;
    } catch (error) {
      console.error('Error al obtener trabajadores sin horario:', error);
      throw error;
    }
  },

  // Obtener resumen estadístico de horarios
  getResumen: async () => {
    try {
      const response = await axiosInstance.get('/horarios/resumen');
      return response.data;
    } catch (error) {
      console.error('Error al obtener resumen de horarios:', error);
      throw error;
    }
  },

  // Validar horario (entrada y salida)
  validarTiempo: async (horaEntrada, horaSalida) => {
    try {
      const response = await axiosInstance.get('/horarios/validar-tiempo', {
        params: {
          hora_entrada: horaEntrada,
          hora_salida: horaSalida
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error al validar horario:', error);
      throw error;
    }
  },

  // Obtener días festivos
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

  // Utilizar el servicio de horarios para catálogos
  getHorarios: async () => {
    const response = await axiosInstance.get('/horarios');
    return response.data;
  },

  // Crear nuevos catálogos
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

// Utilidades para horarios
const horarioUtils = {
  // Formatear tiempo para mostrar
  formatTime: (timeString) => {
    if (!timeString) return '--:--';
    return timeString.substring(0, 5);
  },

  // Calcular duración entre dos horarios
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
    
    return {
      horas,
      minutos,
      totalMinutos: duracionMinutos,
      formatoTexto: `${horas}h ${minutos}m`
    };
  },

  // Validar si un horario es válido
  validarHorario: (entrada, salida) => {
    const duracion = horarioUtils.calcularDuracion(entrada, salida);
    
    if (!duracion) {
      return {
        esValido: false,
        errores: ['La hora de salida debe ser posterior a la hora de entrada']
      };
    }
    
    const errores = [];
    
    if (duracion.totalMinutos < 240) { // Menos de 4 horas
      errores.push('La jornada laboral debe ser de al menos 4 horas');
    }
    
    if (duracion.totalMinutos > 480) { // Más de 8 horas
      errores.push('Advertencia: Jornada laboral mayor a 8 horas');
    }
    
    return {
      esValido: errores.length === 0 || errores.every(e => e.includes('Advertencia')),
      errores,
      duracion
    };
  },

  // Obtener horarios predefinidos
  getHorariosPredefinidos: () => [
    {
      tipo: 'matutino',
      nombre: 'Matutino (8:00-16:00)',
      entrada: '08:00',
      salida: '16:00'
    },
    {
      tipo: 'vespertino',
      nombre: 'Vespertino (14:00-22:00)',
      entrada: '14:00',
      salida: '22:00'
    },
    {
      tipo: 'mixto',
      nombre: 'Mixto (8:00-14:00)',
      entrada: '08:00',
      salida: '14:00'
    },
    {
      tipo: 'nocturno',
      nombre: 'Nocturno (22:00-06:00)',
      entrada: '22:00',
      salida: '06:00'
    }
  ],

  // Copiar horario a todos los días
  copiarHorarioATodos: (horarioBase, diaOrigen) => {
    const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];
    const resultado = { ...horarioBase };
    
    const entradaOrigen = horarioBase[`${diaOrigen}Entrada`];
    const salidaOrigen = horarioBase[`${diaOrigen}Salida`];
    
    dias.forEach(dia => {
      if (dia !== diaOrigen) {
        resultado[`${dia}Entrada`] = entradaOrigen;
        resultado[`${dia}Salida`] = salidaOrigen;
      }
    });
    
    return resultado;
  }
};

export {
  authService,
  trabajadorService,
  asistenciaService,
  justificacionService,
  horarioService,
  reporteService,
  catalogoService,
  horarioUtils,
}; 