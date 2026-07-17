# 🎨 Frontend - Sistema de Droguería

Frontend moderno para el sistema de gestión de droguería.

## 🚀 Instalación

```bash
# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env

# Ejecutar en desarrollo
npm run dev
```

## 📁 Estructura

```
frontend/
├── src/
│   ├── assets/          # Recursos estáticos
│   ├── components/      # Componentes reutilizables
│   ├── features/        # Funcionalidades por módulo
│   ├── hooks/           # Custom hooks
│   ├── services/        # Servicios API
│   ├── stores/          # Estado global
│   ├── types/           # Tipos TypeScript
│   └── utils/           # Utilidades
```

## 🛠️ Tecnologías

- React 18 + TypeScript
- Vite
- TailwindCSS
- Zustand (state management)
- React Router
- Axios
- React Query

## 📦 Scripts

```bash
npm run dev      # Desarrollo
npm run build    # Build producción
npm run preview  # Preview build
npm run lint     # Linter
```

## 🔧 Configuración

Edita `.env` con la URL de tu API:

```env
VITE_API_URL=http://localhost:3000/api
```
