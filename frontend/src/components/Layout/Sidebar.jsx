import React from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Toolbar,
  Collapse,
  Typography,
  Box
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  DateRange as DateRangeIcon,
  Assignment as AssignmentIcon,
  AccessTime as AccessTimeIcon,
  BarChart as BarChartIcon,
  Settings as SettingsIcon,
  ExpandLess,
  ExpandMore,
  Fingerprint as FingerprintIcon,
  Event as EventIcon,
  EventBusy as EventBusyIcon,
  CalendarToday as CalendarTodayIcon,
  Description as DescriptionIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const drawerWidth = 240;

const Sidebar = ({ open }) => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  
  // Estado para gestionar los menús desplegables
  const [reportesOpen, setReportesOpen] = React.useState(false);
  const [catalogosOpen, setCatalogosOpen] = React.useState(false);
  
  // Función para alternar los menús desplegables
  const handleReportesToggle = () => {
    setReportesOpen(!reportesOpen);
  };
  
  const handleCatalogosToggle = () => {
    setCatalogosOpen(!catalogosOpen);
  };
  
  // Verificar si una ruta está activa
  const isActive = (path) => {
    return location.pathname === path;
  };

  if (!isAuthenticated) {
    return null; // No mostrar el sidebar si no hay usuario autenticado
  }

  return (
    <Drawer
      variant="persistent"
      open={open}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
        },
      }}
    >
      <Toolbar />
      <Box sx={{ overflow: 'auto', mt: 2 }}>
        <List>
          <ListItem button component={RouterLink} to="/dashboard" selected={isActive('/dashboard')}>
            <ListItemIcon>
              <DashboardIcon color={isActive('/dashboard') ? 'primary' : 'inherit'} />
            </ListItemIcon>
            <ListItemText primary="Dashboard" />
          </ListItem>
          
          <ListItem button component={RouterLink} to="/asistencias" selected={isActive('/asistencias')}>
            <ListItemIcon>
              <FingerprintIcon color={isActive('/asistencias') ? 'primary' : 'inherit'} />
            </ListItemIcon>
            <ListItemText primary="Registro de Asistencia" />
          </ListItem>
          
          <Divider sx={{ my: 1 }} />
          
          <ListItem button component={RouterLink} to="/trabajadores" selected={isActive('/trabajadores')}>
            <ListItemIcon>
              <PeopleIcon color={isActive('/trabajadores') ? 'primary' : 'inherit'} />
            </ListItemIcon>
            <ListItemText primary="Trabajadores" />
          </ListItem>
          
          <ListItem button component={RouterLink} to="/horarios" selected={isActive('/horarios')}>
            <ListItemIcon>
              <AccessTimeIcon color={isActive('/horarios') ? 'primary' : 'inherit'} />
            </ListItemIcon>
            <ListItemText primary="Horarios" />
          </ListItem>
          
          <ListItem button component={RouterLink} to="/justificaciones" selected={isActive('/justificaciones')}>
            <ListItemIcon>
              <AssignmentIcon color={isActive('/justificaciones') ? 'primary' : 'inherit'} />
            </ListItemIcon>
            <ListItemText primary="Justificaciones" />
          </ListItem>
          
          <ListItem button component={RouterLink} to="/dias-festivos" selected={isActive('/dias-festivos')}>
            <ListItemIcon>
              <EventIcon color={isActive('/dias-festivos') ? 'primary' : 'inherit'} />
            </ListItemIcon>
            <ListItemText primary="Días Festivos" />
          </ListItem>
          
          <Divider sx={{ my: 1 }} />
          
          <ListItem button onClick={handleReportesToggle}>
            <ListItemIcon>
              <BarChartIcon />
            </ListItemIcon>
            <ListItemText primary="Reportes" />
            {reportesOpen ? <ExpandLess /> : <ExpandMore />}
          </ListItem>
          
          <Collapse in={reportesOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              <ListItem 
                button 
                component={RouterLink} 
                to="/reportes/asistencias-diarias" 
                selected={isActive('/reportes/asistencias-diarias')}
                sx={{ pl: 4 }}
              >
                <ListItemIcon>
                  <CalendarTodayIcon 
                    fontSize="small" 
                    color={isActive('/reportes/asistencias-diarias') ? 'primary' : 'inherit'} 
                  />
                </ListItemIcon>
                <ListItemText primary="Asistencias Diarias" />
              </ListItem>
              
              <ListItem 
                button 
                component={RouterLink} 
                to="/reportes/asistencias-mensuales" 
                selected={isActive('/reportes/asistencias-mensuales')}
                sx={{ pl: 4 }}
              >
                <ListItemIcon>
                  <DateRangeIcon 
                    fontSize="small" 
                    color={isActive('/reportes/asistencias-mensuales') ? 'primary' : 'inherit'} 
                  />
                </ListItemIcon>
                <ListItemText primary="Asistencias Mensuales" />
              </ListItem>
              
              <ListItem 
                button 
                component={RouterLink} 
                to="/reportes/retardos" 
                selected={isActive('/reportes/retardos')}
                sx={{ pl: 4 }}
              >
                <ListItemIcon>
                  <AccessTimeIcon 
                    fontSize="small" 
                    color={isActive('/reportes/retardos') ? 'primary' : 'inherit'} 
                  />
                </ListItemIcon>
                <ListItemText primary="Retardos" />
              </ListItem>
              
              <ListItem 
                button 
                component={RouterLink} 
                to="/reportes/faltas" 
                selected={isActive('/reportes/faltas')}
                sx={{ pl: 4 }}
              >
                <ListItemIcon>
                  <EventBusyIcon 
                    fontSize="small" 
                    color={isActive('/reportes/faltas') ? 'primary' : 'inherit'} 
                  />
                </ListItemIcon>
                <ListItemText primary="Faltas" />
              </ListItem>
              
              <ListItem 
                button 
                component={RouterLink} 
                to="/reportes/justificaciones" 
                selected={isActive('/reportes/justificaciones')}
                sx={{ pl: 4 }}
              >
                <ListItemIcon>
                  <DescriptionIcon 
                    fontSize="small" 
                    color={isActive('/reportes/justificaciones') ? 'primary' : 'inherit'} 
                  />
                </ListItemIcon>
                <ListItemText primary="Justificaciones" />
              </ListItem>
            </List>
          </Collapse>
          
          <Divider sx={{ my: 1 }} />
          
          <ListItem button onClick={handleCatalogosToggle}>
            <ListItemIcon>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText primary="Configuración" />
            {catalogosOpen ? <ExpandLess /> : <ExpandMore />}
          </ListItem>
          
          <Collapse in={catalogosOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              <ListItem 
                button 
                component={RouterLink} 
                to="/configuracion/departamentos" 
                selected={isActive('/configuracion/departamentos')}
                sx={{ pl: 4 }}
              >
                <ListItemText primary="Departamentos" />
              </ListItem>
              
              <ListItem 
                button 
                component={RouterLink} 
                to="/configuracion/centros-trabajo" 
                selected={isActive('/configuracion/centros-trabajo')}
                sx={{ pl: 4 }}
              >
                <ListItemText primary="Centros de Trabajo" />
              </ListItem>
              
              <ListItem 
                button 
                component={RouterLink} 
                to="/configuracion/tipos-trabajador" 
                selected={isActive('/configuracion/tipos-trabajador')}
                sx={{ pl: 4 }}
              >
                <ListItemText primary="Tipos de Trabajador" />
              </ListItem>
              
              <ListItem 
                button 
                component={RouterLink} 
                to="/configuracion/grados-estudio" 
                selected={isActive('/configuracion/grados-estudio')}
                sx={{ pl: 4 }}
              >
                <ListItemText primary="Grados de Estudio" />
              </ListItem>
              
              <ListItem 
                button 
                component={RouterLink} 
                to="/configuracion/reglas-retardo" 
                selected={isActive('/configuracion/reglas-retardo')}
                sx={{ pl: 4 }}
              >
                <ListItemText primary="Reglas de Retardo" />
              </ListItem>
              
              <ListItem 
                button 
                component={RouterLink} 
                to="/configuracion/reglas-justificacion" 
                selected={isActive('/configuracion/reglas-justificacion')}
                sx={{ pl: 4 }}
              >
                <ListItemText primary="Reglas de Justificación" />
              </ListItem>
            </List>
          </Collapse>
        </List>
      </Box>
    </Drawer>
  );
};

export default Sidebar;