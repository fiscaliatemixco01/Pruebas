import React from 'react';
import logoFge from '../assets/FISCALIA_LOGO.png';
import iconoRostro from '../assets/FACE_ID.png'; 
import './login.css';

export function Login() {
  return (
    <div className="login-container">
      {/* Lateral izquierdo azul */}
      <div className="login-left">
        <div className="logo-circle">
          <img src={logoFge} alt="Logo Fiscalía" className="logo-img" />
        </div>
      </div>

      {/* Lateral derecho blanco */}
      <div className="login-right">
        <div className="login-content">
          <img src={iconoRostro} alt="Icono Biométrico" className="face-icon" />
          
          <button className="btn-navy">Inicio de sesion</button>
          
          <p className="question-text">¿No tienes una cuenta?</p>
          
          <button className="btn-navy">Crear cuenta</button>
        </div>
      </div>
    </div>
  );
}

export default Login;