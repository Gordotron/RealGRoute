"""
🛡️ SISTEMA DE AUTENTICACIÓN COMPLETO - REALGROUTE 3.0
Handles: Registration, Login, JWT tokens, Password hashing
"""

import os
import pandas as pd
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import hashlib
import secrets
import jwt
from passlib.context import CryptContext
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
import re

# 🔐 CONFIGURACIÓN DE SEGURIDAD
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "realgroute_super_secret_key_2025_bogota_security")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 días

# 🔒 CONFIGURACIÓN DE PASSWORDS
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# 📝 MODELOS DE DATOS
class UserRegistration(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: str = None
    phone: str = None

class UserLogin(BaseModel):
    username: str
    password: str

class UserProfile(BaseModel):
    username: str
    email: str
    full_name: str = None
    phone: str = None
    created_at: str
    last_login: str = None
    is_active: bool = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
    user: UserProfile

# 🛡️ CLASE PRINCIPAL DE AUTENTICACIÓN
class AuthManager:
    def __init__(self):
        self.users_file = "data/users.csv"
        os.makedirs("data", exist_ok=True)
        self._init_users_file()
    
    def _init_users_file(self):
        """Inicializar archivo de usuarios si no existe"""
        if not os.path.exists(self.users_file):
            # Crear archivo con headers
            initial_df = pd.DataFrame(columns=[
                'username', 'email', 'password_hash', 'full_name', 
                'phone', 'created_at', 'last_login', 'is_active'
            ])
            initial_df.to_csv(self.users_file, index=False)
            print(f"✅ Archivo de usuarios creado: {self.users_file}")
    
    def hash_password(self, password: str) -> str:
        """Hashear password de forma segura"""
        return pwd_context.hash(password)
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verificar password contra hash"""
        return pwd_context.verify(plain_password, hashed_password)
    
    def validate_password(self, password: str) -> bool:
        """Validar fortaleza de password"""
        if len(password) < 6:
            return False
        # Al menos una letra y un número
        if not re.search(r"[A-Za-z]", password) or not re.search(r"\d", password):
            return False
        return True
    
    def validate_username(self, username: str) -> bool:
        """Validar formato de username"""
        if len(username) < 3 or len(username) > 20:
            return False
        # Solo letras, números y underscore
        if not re.match(r"^[a-zA-Z0-9_]+$", username):
            return False
        return True
    
    def user_exists(self, username: str = None, email: str = None) -> bool:
        """Verificar si usuario o email ya existe"""
        try:
            df = pd.read_csv(self.users_file)
            if username and username in df['username'].values:
                return True
            if email and email in df['email'].values:
                return True
            return False
        except:
            return False
    
    def create_user(self, registration: UserRegistration) -> Dict[str, Any]:
        """Crear nuevo usuario"""
        # Validaciones
        if not self.validate_username(registration.username):
            raise HTTPException(
                status_code=400, 
                detail="Username debe tener 3-20 caracteres, solo letras, números y _"
            )
        
        if not self.validate_password(registration.password):
            raise HTTPException(
                status_code=400,
                detail="Password debe tener al menos 6 caracteres, una letra y un número"
            )
        
        if self.user_exists(registration.username, registration.email):
            raise HTTPException(
                status_code=400,
                detail="Username o email ya existe"
            )
        
        # Crear usuario
        password_hash = self.hash_password(registration.password)
        created_at = datetime.utcnow().isoformat()
        
        new_user = {
            'username': registration.username,
            'email': registration.email,
            'password_hash': password_hash,
            'full_name': registration.full_name or '',
            'phone': registration.phone or '',
            'created_at': created_at,
            'last_login': '',
            'is_active': True
        }
        
        # Guardar en CSV
        df = pd.read_csv(self.users_file)
        new_df = pd.concat([df, pd.DataFrame([new_user])], ignore_index=True)
        new_df.to_csv(self.users_file, index=False)
        
        # Retornar perfil (sin password)
        return {
            'username': registration.username,
            'email': registration.email,
            'full_name': registration.full_name,
            'phone': registration.phone,
            'created_at': created_at,
            'is_active': True
        }
    
    def authenticate_user(self, username: str, password: str) -> Optional[Dict[str, Any]]:
        """Autenticar usuario"""
        try:
            df = pd.read_csv(self.users_file)
            user_data = df[df['username'] == username]
            
            if user_data.empty:
                return None
            
            user = user_data.iloc[0]
            if not user['is_active']:
                return None
            
            if not self.verify_password(password, user['password_hash']):
                return None
            
            # Actualizar last_login
            df.loc[df['username'] == username, 'last_login'] = datetime.utcnow().isoformat()
            df.to_csv(self.users_file, index=False)
            
            return {
                'username': user['username'],
                'email': user['email'],
                'full_name': user['full_name'],
                'phone': user['phone'],
                'created_at': user['created_at'],
                'last_login': datetime.utcnow().isoformat(),
                'is_active': user['is_active']
            }
        except Exception as e:
            print(f"❌ Error en autenticación: {e}")
            return None
    
    def create_access_token(self, data: dict) -> str:
        """Crear JWT token"""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verificar y decodificar JWT token"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            username: str = payload.get("sub")
            if username is None:
                return None
            
            # Verificar que el usuario aún existe y está activo
            df = pd.read_csv(self.users_file)
            user_data = df[df['username'] == username]
            
            if user_data.empty or not user_data.iloc[0]['is_active']:
                return None
            
            user = user_data.iloc[0]
            return {
                'username': user['username'],
                'email': user['email'],
                'full_name': user['full_name'],
                'phone': user['phone'],
                'created_at': user['created_at'],
                'last_login': user['last_login'],
                'is_active': user['is_active']
            }
        except jwt.PyJWTError:
            return None
    
    def get_user_profile(self, username: str) -> Optional[Dict[str, Any]]:
        """Obtener perfil de usuario"""
        try:
            df = pd.read_csv(self.users_file)
            user_data = df[df['username'] == username]
            
            if user_data.empty:
                return None
            
            user = user_data.iloc[0]
            return {
                'username': user['username'],
                'email': user['email'],
                'full_name': user['full_name'],
                'phone': user['phone'],
                'created_at': user['created_at'],
                'last_login': user['last_login'],
                'is_active': user['is_active']
            }
        except:
            return None

# 🌍 INSTANCIA GLOBAL
auth_manager = AuthManager()

# 🔐 DEPENDENCY PARA AUTENTICACIÓN
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    """Dependency para obtener usuario autenticado"""
    token = credentials.credentials
    user = auth_manager.verify_token(token)
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user

# 🔓 DEPENDENCY OPCIONAL PARA AUTENTICACIÓN
async def get_current_user_optional(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[Dict[str, Any]]:
    """Dependency opcional - no falla si no hay token"""
    try:
        if not credentials:
            return None
        token = credentials.credentials
        return auth_manager.verify_token(token)
    except:
        return None