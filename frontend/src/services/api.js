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
    try {
      console.log('🔐 Intentando login para:', rfc);
      const response = await axiosInstance.post('/login', { rfc, password });
      if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
        console.log('✅ Login exitoso');
      }
      return response.data;
    } catch (error) {
      console.error('❌ Error en login:', error);
      throw error;
    }
  },
  
  loginWithBiometric: async (huellaBase64) => {
    try {
      console.log('👆 Intentando login biométrico');
      const response = await axiosInstance.post('/biometrico/autenticar', { huella_base64: huellaBase64 });
      console.log('✅ Login biométrico exitoso');
      return response.data;
    } catch (error) {
      console.error('❌ Error en login biométrico:', error);
      throw error;
    }
  },
  
  registrarAsistenciaBiometrica: async (huellaBase64) => {
    try {
      console.log('👆 Registrando asistencia biométrica');
      const response = await axiosInstance.post('/biometrico/registrar-asistencia', { huella_base64: huellaBase64 });
      console.log('✅ Asistencia biométrica registrada');
      return response.data;
    } catch (error) {
      console.error('❌ Error en registro biométrico:', error);
      throw error;
    }
  },
  
  logout: () => {
    console.log('🚪 Cerrando sesión');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  
  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },
};

// Servicios para trabajadores - VERSIÓN CORREGIDA
const trabajadorService = {
  getAll: async (params = {}) => {
    try {
      console.log('📤 Solicitando trabajadores con parámetros:', params);
      const response = await axiosInstance.get('/trabajadores', { params });
      console.log('📥 Respuesta trabajadores:', response.data);
      
      // Validar que la respuesta sea un array
      if (!Array.isArray(response.data)) {
        console.error('❌ La respuesta de trabajadores no es un array:', response.data);
        throw new Error('Formato de datos inválido: se esperaba un array de trabajadores');
      }
      
      console.log('✅ Trabajadores validados:', response.data.length, 'elementos');
      return response.data;
      
    } catch (error) {
      console.error('❌ Error al obtener trabajadores:', error);
      console.error('❌ URL del endpoint:', `${axiosInstance.defaults.baseURL}/trabajadores`);
      console.error('❌ Parámetros enviados:', params);
      console.error('❌ Response status:', error.response?.status);
      console.error('❌ Response data:', error.response?.data);
      
      // Si hay problemas con el servidor, retornar array vacío para evitar crashes
      if (error.response?.status === 500 || error.code === 'ECONNREFUSED') {
        console.log('⚠️ Retornando array vacío debido a error del servidor');
        return [];
      }
      
      throw error;
    }
  },
  
  getById: async (id) => {
    try {
      console.log('📤 Solicitando trabajador por ID:', id);
      const response = await axiosInstance.get(`/trabajadores/${id}`);
      console.log('📥 Trabajador obtenido:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error al obtener trabajador por ID:', error);
      throw error;
    }
  },
  
  create: async (trabajador) => {
    try {
      console.log('📤 Creando trabajador:', trabajador);
      const response = await axiosInstance.post('/trabajadores', trabajador);
      console.log('✅ Trabajador creado:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error al crear trabajador:', error);
      throw error;
    }
  },
  
  update: async (id, trabajador) => {
    try {
      console.log('📤 Actualizando trabajador:', id, trabajador);
      const response = await axiosInstance.put(`/trabajadores/${id}`, trabajador);
      console.log('✅ Trabajador actualizado:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error al actualizar trabajador:', error);
      throw error;
    }
  },
  
  delete: async (id) => {
    try {
      console.log('🗑️ Eliminando trabajador:', id);
      const response = await axiosInstance.delete(`/trabajadores/${id}`);
      console.log('✅ Trabajador eliminado');
      return response.data;
    } catch (error) {
      console.error('❌ Error al eliminar trabajador:', error);
      throw error;
    }
  },
};

// Servicios para asistencias - VERSIÓN CORREGIDA
const asistenciaService = {
  getAll: async (params = {}) => {
    try {
      console.log('📤 Solicitando asistencias con parámetros:', params);
      const response = await axiosInstance.get('/asistencias', { params });
      console.log('📥 Respuesta de asistencias:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error al obtener asistencias:', error);
      throw error;
    }
  },
  
  getById: async (id) => {
    try {
      const response = await axiosInstance.get(`/asistencias/${id}`);
      return response.data;
    } catch (error) {
      console.error('❌ Error al obtener asistencia por ID:', error);
      throw error;
    }
  },
  
  create: async (asistencia) => {
    try {
      console.log('📤 Creando asistencia:', asistencia);
      const response = await axiosInstance.post('/asistencias', asistencia);
      console.log('✅ Asistencia creada:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error al crear asistencia:', error);
      console.error('❌ Response data:', error.response?.data);
      throw error;
    }
  },
  
  update: async (id, asistencia) => {
    try {
      console.log('📤 Actualizando asistencia:', id, asistencia);
      const response = await axiosInstance.put(`/asistencias/${id}`, asistencia);
      console.log('✅ Asistencia actualizada:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error al actualizar asistencia:', error);
      throw error;
    }
  },
  
  delete: async (id) => {
    try {
      console.log('🗑️ Eliminando asistencia:', id);
      const response = await axiosInstance.delete(`/asistencias/${id}`);
      console.log('✅ Asistencia eliminada');
      return response.data;
    } catch (error) {
      console.error('❌ Error al eliminar asistencia:', error);
      throw error;
    }
  },
  
  getAsistenciasByTrabajador: async (trabajadorId, fechaInicio, fechaFin) => {
    try {
      const params = {};
      if (fechaInicio) params.fecha_inicio = fechaInicio;
      if (fechaFin) params.fecha_fin = fechaFin;
      
      console.log('📤 Solicitando asistencias por trabajador:', trabajadorId, params);
      const response = await axiosInstance.get(`/asistencias/trabajador/${trabajadorId}`, { params });
      console.log('📥 Asistencias del trabajador:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error al obtener asistencias del trabajador:', error);
      throw error;
    }
  },
  
  getAsistenciasHoy: async () => {
    try {
      console.log('📤 Solicitando asistencias de hoy...');
      const response = await axiosInstance.get('/asistencias/hoy');
      console.log('📥 Respuesta asistencias hoy:', response.data);
      
      // Validar estructura de la respuesta
      if (!response.data || typeof response.data !== 'object') {
        throw new Error('Respuesta inválida del servidor para asistencias de hoy');
      }
      
      // Asegurar que tenga la estructura esperada
      const normalizedData = {
        fecha: response.data.fecha || new Date().toISOString().split('T')[0],
        estadisticas: response.data.estadisticas || {
          total_trabajadores: 0,
          asistencias: 0,
          retardos: 0,
          faltas: 0,
          no_registrados: 0,
          porcentaje_asistencia: 0
        },
        registros: Array.isArray(response.data.registros) ? response.data.registros : []
      };
      
      console.log('✅ Datos normalizados:', normalizedData);
      return normalizedData;
      
    } catch (error) {
      console.error('❌ Error al obtener asistencias de hoy:', error);
      console.error('❌ URL del endpoint:', `${axiosInstance.defaults.baseURL}/asistencias/hoy`);
      console.error('❌ Response status:', error.response?.status);
      console.error('❌ Response data:', error.response?.data);
      
      // Retornar estructura vacía en caso de error para evitar crashes
      if (error.response?.status === 404 || error.response?.status === 500) {
        console.log('⚠️ Retornando estructura vacía debido a error del servidor');
        return {
          fecha: new Date().toISOString().split('T')[0],
          estadisticas: {
            total_trabajadores: 0,
            asistencias: 0,
            retardos: 0,
            faltas: 0,
            no_registrados: 0,
            porcentaje_asistencia: 0
          },
          registros: []
        };
      }
      
      throw error;
    }
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
      
      console.log('📤 Solicitando horarios con parámetros:', params);
      const response = await axiosInstance.get(`/horarios?${queryParams.toString()}`);
      console.log('📥 Horarios obtenidos:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error al obtener horarios:', error);
      throw error;
    }
  },

  // Obtener horario por ID con detalles completos
  getById: async (id) => {
    try {
      const response = await axiosInstance.get(`/horarios/${id}`);
      return response.data;
    } catch (error) {
      console.error('❌ Error al obtener horario:', error);
      throw error;
    }
  },

  // Crear nuevo horario
  create: async (horarioData) => {
    try {
      console.log('📤 Creando horario:', horarioData);
      const response = await axiosInstance.post('/horarios', horarioData);
      console.log('✅ Horario creado:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error al crear horario:', error);
      throw error;
    }
  },

  // Actualizar horario existente
  update: async (id, horarioData) => {
    try {
      console.log('📤 Actualizando horario:', id, horarioData);
      const response = await axiosInstance.put(`/horarios/${id}`, horarioData);
      console.log('✅ Horario actualizado:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error al actualizar horario:', error);
      throw error;
    }
  },

  // Eliminar horario
  delete: async (id) => {
    try {
      await axiosInstance.delete(`/horarios/${id}`);
      return true;
    } catch (error) {
      console.error('❌ Error al eliminar horario:', error);
      throw error;
    }
  },

  // Asignar horario a trabajador
  asignarTrabajador: async (horarioId, asignacionData) => {
    try {
      console.log('📤 Asignando trabajador a horario:', horarioId, asignacionData);
      const response = await axiosInstance.post(`/horarios/${horarioId}/asignar`, asignacionData);
      return response.data;
    } catch (error) {
      console.error('❌ Error al asignar trabajador:', error);
      throw error;
    }
  },

  // Obtener historial de horarios de un trabajador
  getHistorialTrabajador: async (trabajadorId) => {
    try {
      const response = await axiosInstance.get(`/trabajadores/${trabajadorId}/horarios`);
      return response.data;
    } catch (error) {
      console.error('❌ Error al obtener historial de horarios:', error);
      throw error;
    }
  },

  // Obtener trabajadores sin horario asignado
  getTrabajadoresSinHorario: async () => {
    try {
      const response = await axiosInstance.get('/horarios/trabajadores-sin-horario');
      return response.data;
    } catch (error) {
      console.error('❌ Error al obtener trabajadores sin horario:', error);
      throw error;
    }
  },

  // Obtener resumen estadístico de horarios
  getResumen: async () => {
    try {
      const response = await axiosInstance.get('/horarios/resumen');
      return response.data;
    } catch (error) {
      console.error('❌ Error al obtener resumen de horarios:', error);
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
      console.error('❌ Error al validar horario:', error);
      throw error;
    }
  },

  // Obtener días festivos
  getDiasFestivos: async () => {
    try {
      const response = await axiosInstance.get('/dias-festivos');
      return response.data;
    } catch (error) {
      console.error('❌ Error al obtener días festivos:', error);
      throw error;
    }
  },
};

// Servicios para reportes - CORREGIDO
const reporteService = {
  getAsistenciasDiarias: async (fecha, departamentoId) => {
    try {
      const params = {};
      if (fecha) params.fecha = fecha;
      if (departamentoId) params.departamento_id = departamentoId;
      
      const response = await axiosInstance.get('/reportes/asistencias-diarias', { params });
      return response.data;
    } catch (error) {
      console.error('❌ Error al obtener reporte diario:', error);
      throw error;
    }
  },
  
  getAsistenciasMensuales: async (anio, mes, departamentoId) => {
    try {
      const params = {};
      if (anio) params.anio = anio;
      if (mes) params.mes = mes;
      if (departamentoId) params.departamento_id = departamentoId;
      
      const response = await axiosInstance.get('/reportes/asistencias-mensuales', { params });
      return response.data;
    } catch (error) {
      console.error('❌ Error al obtener reporte mensual:', error);
      throw error;
    }
  },
  
  descargarAsistenciasMensualesCSV: async (anio, mes, departamentoId) => {
    try {
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
    } catch (error) {
      console.error('❌ Error al descargar CSV:', error);
      throw error;
    }
  },
  
  getReporteRetardos: async (fechaInicio, fechaFin, departamentoId) => {
    try {
      const params = {};
      if (fechaInicio) params.fecha_inicio = fechaInicio;
      if (fechaFin) params.fecha_fin = fechaFin;
      if (departamentoId) params.departamento_id = departamentoId;
      
      const response = await axiosInstance.get('/reportes/retardos', { params });
      return response.data;
    } catch (error) {
      console.error('❌ Error al obtener reporte de retardos:', error);
      throw error;
    }
  },
  
  getReporteFaltas: async (fechaInicio, fechaFin, departamentoId) => {
    try {
      const params = {};
      if (fechaInicio) params.fecha_inicio = fechaInicio;
      if (fechaFin) params.fecha_fin = fechaFin;
      if (departamentoId) params.departamento_id = departamentoId;
      
      const response = await axiosInstance.get('/reportes/faltas', { params });
      return response.data;
    } catch (error) {
      console.error('❌ Error al obtener reporte de faltas:', error);
      throw error;
    }
  },
  
  getReporteJustificaciones: async (fechaInicio, fechaFin, departamentoId, idRegla) => {
    try {
      const params = {};
      if (fechaInicio) params.fecha_inicio = fechaInicio;
      if (fechaFin) params.fecha_fin = fechaFin;
      if (departamentoId) params.departamento_id = departamentoId;
      if (idRegla) params.id_regla_justificacion = idRegla;
      
      const response = await axiosInstance.get('/reportes/justificaciones', { params });
      return response.data;
    } catch (error) {
      console.error('❌ Error al obtener reporte de justificaciones:', error);
      throw error;
    }
  },

  // Función para obtener reporte de retardos y faltas
  getReporteRetardosFaltas: async (params) => {
    try {
      console.log('📤 Solicitando reporte de retardos y faltas:', params);
      
      // Construir parámetros de consulta
      const queryParams = new URLSearchParams();
      if (params.fecha_inicio) queryParams.append('fecha_inicio', params.fecha_inicio);
      if (params.fecha_fin) queryParams.append('fecha_fin', params.fecha_fin);
      if (params.departamento_id) queryParams.append('departamento_id', params.departamento_id);
      if (params.trabajador_id) queryParams.append('trabajador_id', params.trabajador_id);
      
      // Intentar primero con el endpoint específico
      try {
        const response = await axiosInstance.get(`/reportes/retardos-faltas?${queryParams.toString()}`);
        console.log('📥 Datos del reporte recibidos:', response.data);
        return response.data;
      } catch (error) {
        // Si el endpoint no existe (404), usar asistencias-mensuales como fallback
        if (error.response?.status === 404) {
          console.log('⚠️ Endpoint retardos-faltas no encontrado, usando fallback...');
          
          // IMPORTANTE: Procesar las fechas para obtener datos del período completo
          const fechaInicio = new Date(params.fecha_inicio);
          const fechaFin = new Date(params.fecha_fin);
          
          // Obtener todos los meses necesarios
          const mesesRequeridos = [];
          let fechaActual = new Date(fechaInicio);
          
          while (fechaActual <= fechaFin) {
            mesesRequeridos.push({
              anio: fechaActual.getFullYear(),
              mes: fechaActual.getMonth() + 1
            });
            
            // Avanzar al siguiente mes
            fechaActual.setMonth(fechaActual.getMonth() + 1);
            
            // Evitar bucle infinito
            if (mesesRequeridos.length > 12) break;
          }
          
          // Si es un solo mes o fechas del mismo mes
          if (mesesRequeridos.length === 1 || 
              (fechaInicio.getMonth() === fechaFin.getMonth() && 
               fechaInicio.getFullYear() === fechaFin.getFullYear())) {
            
            // Obtener datos del mes
            const responseAsistencias = await axiosInstance.get('/reportes/asistencias-mensuales', {
              params: {
                anio: fechaInicio.getFullYear(),
                mes: fechaInicio.getMonth() + 1,
                departamento_id: params.departamento_id
              }
            });
            
            // FILTRAR los datos según las fechas seleccionadas
            const dataFiltrada = {
              fecha_inicio: params.fecha_inicio,
              fecha_fin: params.fecha_fin,
              trabajadores: []
            };
            
            // Filtrar registros diarios por fecha
            if (responseAsistencias.data.trabajadores) {
              dataFiltrada.trabajadores = responseAsistencias.data.trabajadores.map(trabajador => {
                // Filtrar solo los registros dentro del rango de fechas
                const registrosFiltrados = trabajador.registros_diarios ? 
                  trabajador.registros_diarios.filter(registro => {
                    const fechaRegistro = new Date(registro.fecha);
                    return fechaRegistro >= fechaInicio && fechaRegistro <= fechaFin;
                  }) : [];
                
                // Recalcular estadísticas basadas en los registros filtrados
                const estadisticasRecalculadas = {
                  dias_laborables: 0,
                  asistencias: 0,
                  retardos: 0,
                  faltas: 0,
                  porcentaje_asistencia: 0
                };
                
                // Contar días laborables en el período seleccionado
                let fecha = new Date(fechaInicio);
                while (fecha <= fechaFin) {
                  // Si es día laboral (lunes a viernes)
                  if (fecha.getDay() !== 0 && fecha.getDay() !== 6) {
                    estadisticasRecalculadas.dias_laborables++;
                  }
                  fecha.setDate(fecha.getDate() + 1);
                }
                
                // Recalcular estadísticas desde los registros filtrados
                registrosFiltrados.forEach(registro => {
                  if (registro.estatus === 'ASISTENCIA') {
                    estadisticasRecalculadas.asistencias++;
                  } else if (registro.estatus && registro.estatus.includes('RETARDO')) {
                    estadisticasRecalculadas.retardos++;
                  } else if (registro.estatus === 'FALTA') {
                    estadisticasRecalculadas.faltas++;
                  }
                });
                
                // Calcular porcentaje
                if (estadisticasRecalculadas.dias_laborables > 0) {
                  estadisticasRecalculadas.porcentaje_asistencia = 
                    (estadisticasRecalculadas.asistencias / estadisticasRecalculadas.dias_laborables) * 100;
                }
                
                return {
                  ...trabajador,
                  registros_diarios: registrosFiltrados,
                  estadisticas: estadisticasRecalculadas
                };
              });
            }
            
            // Agregar resumen
            dataFiltrada.resumen = {
              total_trabajadores: dataFiltrada.trabajadores.length,
              total_retardos: dataFiltrada.trabajadores.reduce((sum, t) => sum + t.estadisticas.retardos, 0),
              total_faltas: dataFiltrada.trabajadores.reduce((sum, t) => sum + t.estadisticas.faltas, 0)
            };
            
            console.log('✅ Datos filtrados por fecha:', dataFiltrada);
            return dataFiltrada;
          }
          
          // Si son múltiples meses, combinar los datos
          console.log('📅 Período abarca múltiples meses, combinando datos...');
          
          // Por ahora, usar el primer mes como fallback simple
          const primerMes = mesesRequeridos[0];
          const responseAsistencias = await axiosInstance.get('/reportes/asistencias-mensuales', {
            params: {
              anio: primerMes.anio,
              mes: primerMes.mes,
              departamento_id: params.departamento_id
            }
          });
          
          return {
            fecha_inicio: params.fecha_inicio,
            fecha_fin: params.fecha_fin,
            trabajadores: responseAsistencias.data.trabajadores || [],
            resumen: responseAsistencias.data.resumen || {}
          };
        }
        
        throw error;
      }
    } catch (error) {
      console.error('❌ Error al obtener reporte de retardos y faltas:', error);
      throw error;
    }
  },
  createJustificacion: async (justificacion) => {
    try {
      console.log('📤 Creando justificación:', justificacion);
      const response = await axiosInstance.post('/justificaciones', justificacion);
      console.log('✅ Justificación creada:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error al crear justificación:', error);
      throw error;
    }
  },
  
  getJustificaciones: async (params = {}) => {
    try {
      console.log('📤 Obteniendo justificaciones con parámetros:', params);
      
      const queryParams = new URLSearchParams();
      if (params.fecha_inicio) queryParams.append('fecha_inicio', params.fecha_inicio);
      if (params.fecha_fin) queryParams.append('fecha_fin', params.fecha_fin);
      if (params.trabajador_id) queryParams.append('trabajador_id', params.trabajador_id);
      
      const response = await axiosInstance.get(`/justificaciones?${queryParams.toString()}`);
      console.log('📥 Justificaciones obtenidas:', response.data);
      
      // Transformar los datos para incluir el nombre del trabajador
      const justificacionesConNombre = response.data.map(just => ({
        ...just,
        trabajador_nombre: just.trabajador ? 
          `${just.trabajador.nombre} ${just.trabajador.apellidoPaterno} ${just.trabajador.apellidoMaterno}` :
          'Trabajador desconocido'
      }));
      
      return justificacionesConNombre;
    } catch (error) {
      console.error('❌ Error al obtener justificaciones:', error);
      throw error;
    }
  },
  
  deleteJustificacion: async (id) => {
    try {
      console.log('🗑️ Eliminando justificación:', id);
      await axiosInstance.delete(`/justificaciones/${id}`);
      console.log('✅ Justificación eliminada');
      return true;
    } catch (error) {
      console.error('❌ Error al eliminar justificación:', error);
      throw error;
    }
  },
  
  getJustificacionesPorTrabajador: async (trabajadorId, fechaInicio, fechaFin) => {
    try {
      const params = {};
      if (fechaInicio) params.fecha_inicio = fechaInicio;
      if (fechaFin) params.fecha_fin = fechaFin;
      
      const response = await axiosInstance.get(`/trabajadores/${trabajadorId}/justificaciones`, { params });
      return response.data;
    } catch (error) {
      console.error('❌ Error al obtener justificaciones del trabajador:', error);
      throw error;
    }
  }
};

// Servicios para departamentos y otros catálogos
const catalogoService = {
  getDepartamentos: async () => {
    try {
      console.log('📤 Solicitando departamentos...');
      const response = await axiosInstance.get('/departamentos');
      console.log('📥 Departamentos obtenidos:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error al obtener departamentos:', error);
      throw error;
    }
  },
  
  getTiposTrabajador: async () => {
    try {
      console.log('📤 Solicitando tipos de trabajador...');
      const response = await axiosInstance.get('/tipos-trabajador');
      console.log('📥 Tipos de trabajador obtenidos:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error al obtener tipos de trabajador:', error);
      throw error;
    }
  },
  
  getGradosEstudio: async () => {
    try {
      console.log('📤 Solicitando grados de estudio...');
      const response = await axiosInstance.get('/grados-estudio');
      console.log('📥 Grados de estudio obtenidos:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error al obtener grados de estudio:', error);
      throw error;
    }
  },
  
  getRolesUsuario: async () => {
    try {
      console.log('📤 Solicitando roles de usuario...');
      const response = await axiosInstance.get('/roles-usuario');
      console.log('📥 Roles de usuario obtenidos:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error al obtener roles de usuario:', error);
      throw error;
    }
  },
  
  getReglasRetardo: async () => {
    try {
      const response = await axiosInstance.get('/reglas-retardo');
      return response.data;
    } catch (error) {
      console.error('❌ Error al obtener reglas de retardo:', error);
      throw error;
    }
  },
  
  getCentrosTrabajo: async () => {
    try {
      console.log('📤 Solicitando centros de trabajo...');
      const response = await axiosInstance.get('/centros-trabajo');
      console.log('📥 Centros de trabajo obtenidos:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error al obtener centros de trabajo:', error);
      throw error;
    }
  },

  // Utilizar el servicio de horarios para catálogos
  getHorarios: async () => {
    try {
      console.log('📤 Solicitando horarios para catálogo...');
      const response = await axiosInstance.get('/horarios');
      console.log('📥 Horarios para catálogo obtenidos:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error al obtener horarios para catálogo:', error);
      throw error;
    }
  },

  // Crear nuevos catálogos
  createDepartamento: async (departamento) => {
    try {
      const response = await axiosInstance.post('/departamentos', departamento);
      return response.data;
    } catch (error) {
      console.error('❌ Error al crear departamento:', error);
      throw error;
    }
  },
  
  createTipoTrabajador: async (tipo) => {
    try {
      const response = await axiosInstance.post('/tipos-trabajador', tipo);
      return response.data;
    } catch (error) {
      console.error('❌ Error al crear tipo de trabajador:', error);
      throw error;
    }
  },
  
  createGradoEstudio: async (grado) => {
    try {
      const response = await axiosInstance.post('/grados-estudio', grado);
      return response.data;
    } catch (error) {
      console.error('❌ Error al crear grado de estudio:', error);
      throw error;
    }
  },
  
  createRolUsuario: async (rol) => {
    try {
      const response = await axiosInstance.post('/roles-usuario', rol);
      return response.data;
    } catch (error) {
      console.error('❌ Error al crear rol de usuario:', error);
      throw error;
    }
  },
  
  createCentroTrabajo: async (centro) => {
    try {
      const response = await axiosInstance.post('/centros-trabajo', centro);
      return response.data;
    } catch (error) {
      console.error('❌ Error al crear centro de trabajo:', error);
      throw error;
    }
  },

  getReglasJustificacion: async () => {
    try {
      const response = await axiosInstance.get('/reglas-justificacion');
      return response.data;
    } catch (error) {
      console.error('❌ Error al obtener reglas de justificación:', error);
      throw error;
    }
  },
  
  createReglaJustificacion: async (regla) => {
    try {
      const response = await axiosInstance.post('/reglas-justificacion', regla);
      return response.data;
    } catch (error) {
      console.error('❌ Error al crear regla de justificación:', error);
      throw error;
    }
  },
  
  updateReglaJustificacion: async (id, regla) => {
    try {
      const response = await axiosInstance.put(`/reglas-justificacion/${id}`, regla);
      return response.data;
    } catch (error) {
      console.error('❌ Error al actualizar regla de justificación:', error);
      throw error;
    }
  },
  
  deleteReglaJustificacion: async (id) => {
    try {
      await axiosInstance.delete(`/reglas-justificacion/${id}`);
      return true;
    } catch (error) {
      console.error('❌ Error al eliminar regla de justificación:', error);
      throw error;
    }
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

// Función de prueba de conectividad
const testApiConnectivity = async () => {
  try {
    console.log('🔍 Probando conectividad con la API...');
    console.log('🔗 URL base:', axiosInstance.defaults.baseURL);
    
    // Probar endpoint básico
    const response = await axiosInstance.get('/trabajadores?limit=1');
    console.log('✅ API responde correctamente');
    console.log('📊 Status:', response.status);
    console.log('📦 Data type:', typeof response.data);
    console.log('📋 Es array:', Array.isArray(response.data));
    
    return {
      status: 'ok',
      message: 'API funcionando correctamente',
      data: response.data
    };
    
  } catch (error) {
    console.error('❌ Error de conectividad:', error.message);
    console.error('🔗 URL intentada:', error.config?.url);
    console.error('📊 Status code:', error.response?.status);
    
    return {
      status: 'error',
      message: error.message,
      details: {
        url: error.config?.url,
        status: error.response?.status,
        data: error.response?.data
      }
    };
  }
};

// Función de debug general
const debugApiState = () => {
  console.log('🔍 =================================');
  console.log('🔍 DEBUG API STATE');
  console.log('🔍 =================================');
  console.log('🔗 Base URL:', axiosInstance.defaults.baseURL);
  console.log('🔑 Token exists:', !!localStorage.getItem('token'));
  console.log('👤 User data:', localStorage.getItem('user'));
  console.log('🌐 Environment:', process.env.NODE_ENV);
  console.log('🎯 API URL from env:', process.env.REACT_APP_API_URL);
  console.log('🔍 =================================');
  
  // Probar conectividad
  return testApiConnectivity();
};

// Función para limpiar caché y recargar
const clearCacheAndReload = () => {
  console.log('🧹 Limpiando caché y recargando...');
  
  // Limpiar localStorage
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  localStorage.clear();
  
  // Restaurar datos de sesión si existen
  if (token) localStorage.setItem('token', token);
  if (user) localStorage.setItem('user', user);
  
  // Recargar página
  window.location.reload();
};

// Función para verificar el estado del servidor
const checkServerHealth = async () => {
  try {
    console.log('🏥 Verificando salud del servidor...');
    
    const healthChecks = [
      { name: 'Trabajadores', endpoint: '/trabajadores?limit=1' },
      { name: 'Asistencias Hoy', endpoint: '/asistencias/hoy' },
      { name: 'Departamentos', endpoint: '/departamentos' },
      { name: 'Horarios', endpoint: '/horarios?limit=1' }
    ];
    
    const results = [];
    
    for (const check of healthChecks) {
      try {
        const start = Date.now();
        const response = await axiosInstance.get(check.endpoint);
        const duration = Date.now() - start;
        
        results.push({
          name: check.name,
          status: 'ok',
          responseTime: duration,
          dataType: typeof response.data,
          dataLength: Array.isArray(response.data) ? response.data.length : 'N/A'
        });
        
        console.log(`✅ ${check.name}: OK (${duration}ms)`);
        
      } catch (error) {
        results.push({
          name: check.name,
          status: 'error',
          error: error.message,
          statusCode: error.response?.status
        });
        
        console.log(`❌ ${check.name}: Error - ${error.message}`);
      }
    }
    
    console.log('🏥 Resumen de verificación:', results);
    return results;
    
  } catch (error) {
    console.error('❌ Error en verificación de salud:', error);
    return [];
  }
};

// Función para reinicializar la instancia de axios
const reinitializeAxios = () => {
  console.log('🔄 Reinicializando instancia de axios...');
  
  // Configurar nuevamente los interceptors
  axiosInstance.interceptors.request.clear();
  axiosInstance.interceptors.response.clear();
  
  // Request interceptor
  axiosInstance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      console.log('📤 Request:', config.method?.toUpperCase(), config.url);
      return config;
    },
    (error) => {
      console.error('❌ Request error:', error);
      return Promise.reject(error);
    }
  );
  
  // Response interceptor
  axiosInstance.interceptors.response.use(
    (response) => {
      console.log('📥 Response:', response.status, response.config.url);
      return response;
    },
    (error) => {
      console.error('❌ Response error:', error.response?.status, error.config?.url);
      
      // Manejar errores de autenticación
      if (error.response && error.response.status === 401) {
        console.log('🚪 Token expirado, redirigiendo al login...');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      
      return Promise.reject(error);
    }
  );
  
  console.log('✅ Axios reinicializado correctamente');
};

// Exportar todos los servicios y utilidades
export {
  authService,
  trabajadorService,
  asistenciaService,
  horarioService,
  reporteService,
  catalogoService,
  horarioUtils,
  testApiConnectivity,
  debugApiState,
  clearCacheAndReload,
  checkServerHealth,
  reinitializeAxios,
  axiosInstance
};