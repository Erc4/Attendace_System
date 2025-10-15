import React from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  IconButton,
  Box,
  Menu,
  MenuItem,
  Avatar,
  Divider
} from '@mui/material';
import {
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
  AccountCircle,
  Settings as SettingsIcon,
  ExitToApp as LogoutIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const Header = ({ onToggleSidebar }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleClose();
  };

  return (
    <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={onToggleSidebar}
          sx={{ mr: 2 }}
        >
          <MenuIcon />
        </IconButton>
        
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Sistema de Control de Asistencias
        </Typography>
        
        {isAuthenticated && (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton color="inherit" aria-label="show notifications">
              <NotificationsIcon />
            </IconButton>
            
            <IconButton
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
              color="inherit"
            >
              <AccountCircle />
            </IconButton>
            
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="subtitle1">
                  {user ? `${user.nombre}` : 'Usuario'}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {user ? user.rfc : ''}
                </Typography>
              </Box>
              <Divider />
              <MenuItem onClick={handleClose}>
                <IconButton size="small" sx={{ mr: 1 }}>
                  <AccountCircle fontSize="small" />
                </IconButton>
                Mi Perfil
              </MenuItem>
              <MenuItem onClick={handleClose}>
                <IconButton size="small" sx={{ mr: 1 }}>
                  <SettingsIcon fontSize="small" />
                </IconButton>
                Configuración
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout}>
                <IconButton size="small" sx={{ mr: 1 }}>
                  <LogoutIcon fontSize="small" />
                </IconButton>
                Cerrar Sesión
              </MenuItem>
            </Menu>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Header;