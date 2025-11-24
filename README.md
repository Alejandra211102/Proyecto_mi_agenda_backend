# 🔧 Backend API - Agenda Personal

API RESTful construida con Node.js y Express para gestionar eventos de la agenda personal.

## 📋 Descripción

Servidor backend que proporciona una API completa para crear, leer, actualizar y eliminar eventos. Incluye sistema de notificaciones automatizadas, endpoints optimizados para ESP32 y reconexión automática a base de datos.

## 🏗️ Arquitectura

```
┌──────────────────┐
│   Frontend       │
│   (React)        │
└────────┬─────────┘
         │ HTTP
         ↓
┌──────────────────┐
│   Backend API    │
│   (Express)      │
│   Puerto 3000    │
└────────┬─────────┘
         │ MySQL Protocol
         ↓
┌──────────────────┐
│   AWS RDS        │
│   (MySQL 8.0)    │
└──────────────────┘
```

## 🚀 Stack Tecnológico

- **Node.js 18** - Runtime de JavaScript
- **Express 4.18** - Framework web
- **MySQL2 3.6** - Cliente de MySQL con soporte de promesas
- **CORS 2.8** - Control de acceso entre orígenes
- **node-cron 3.0** - Programación de tareas
- **Docker** - Containerización

## 📁 Estructura del Proyecto

```
agenda-backend/
├── server.js           # Servidor principal
├── package.json        # Dependencias y scripts
├── package-lock.json   # Lock de dependencias
├── Dockerfile          # Imagen Docker
├── .dockerignore       # Archivos ignorados por Docker
├── .gitignore          # Archivos ignorados por Git
└── README.md           # Esta documentación
```

## ⚙️ Variables de Entorno

Crear archivo `.env` (solo para desarrollo local):

```env
# Servidor
NODE_ENV=production
PORT=3000

# Base de Datos RDS
DB_HOST=agenda-db.xxxxx.us-east-1.rds.amazonaws.com
DB_USER=admin
DB_PASSWORD=tu_password_seguro
DB_NAME=agenda_db
DB_PORT=3306

# CORS
FRONTEND_URL=http://tu-frontend-ip
```

⚠️ **IMPORTANTE:** Nunca subas el archivo `.env` a Git. Ya está incluido en `.gitignore`.

## 📡 API Endpoints

### 🔹 Eventos Generales

#### **GET** `/api/eventos`
Obtiene todos los eventos ordenados por fecha.

**Respuesta:**
```json
[
  {
    "id": 1,
    "titulo": "Reunión de equipo",
    "descripcion": "Revisión del sprint semanal",
    "fecha_hora": "2025-11-23T14:00:00.000Z",
    "prioridad": "importante",
    "completado": 0,
    "notificado": 0,
    "created_at": "2025-11-23T10:00:00.000Z",
    "updated_at": "2025-11-23T10:00:00.000Z"
  }
]
```

---

#### **GET** `/api/eventos/:id`
Obtiene un evento específico por ID.

**Parámetros:**
- `id` (number) - ID del evento

**Respuesta exitosa (200):**
```json
{
  "id": 1,
  "titulo": "Reunión de equipo",
  ...
}
```

**Respuesta error (404):**
```json
{
  "error": "Evento no encontrado"
}
```

---

#### **POST** `/api/eventos`
Crea un nuevo evento.

**Body (JSON):**
```json
{
  "titulo": "Nueva reunión",
  "descripcion": "Descripción opcional",
  "fecha_hora": "2025-11-25 15:00:00",
  "prioridad": "urgente"
}
```

**Campos:**
- `titulo` (string, requerido) - Título del evento
- `descripcion` (string, opcional) - Descripción detallada
- `fecha_hora` (datetime, requerido) - Formato: YYYY-MM-DD HH:MM:SS
- `prioridad` (enum, opcional) - Valores: 'urgente', 'importante', 'normal', 'leve'

**Respuesta exitosa (201):**
```json
{
  "message": "Evento creado",
  "id": 5
}
```

**Respuesta error (400):**
```json
{
  "error": "Titulo y fecha_hora son obligatorios"
}
```

---

#### **PUT** `/api/eventos/:id`
Actualiza un evento existente.

**Parámetros:**
- `id` (number) - ID del evento

**Body (JSON):**
```json
{
  "titulo": "Reunión actualizada",
  "descripcion": "Nueva descripción",
  "fecha_hora": "2025-11-25 16:00:00",
  "prioridad": "importante",
  "completado": true
}
```

**Nota:** Todos los campos son opcionales. Solo se actualizan los campos enviados.

**Respuesta exitosa (200):**
```json
{
  "message": "Evento actualizado"
}
```

---

#### **DELETE** `/api/eventos/:id`
Elimina un evento.

**Parámetros:**
- `id` (number) - ID del evento

**Respuesta exitosa (200):**
```json
{
  "message": "Evento eliminado"
}
```

---

### 🔹 Endpoints Especializados

#### **GET** `/api/eventos/dia/hoy`
Obtiene eventos del día actual.

**Respuesta:**
```json
[
  {
    "id": 1,
    "titulo": "Reunión matutina",
    "fecha_hora": "2025-11-23T09:00:00.000Z",
    ...
  }
]
```

---

#### **GET** `/api/eventos/pendientes`
Obtiene eventos no completados y futuros.

**Respuesta:**
```json
[
  {
    "id": 2,
    "titulo": "Llamada cliente",
    "completado": 0,
    ...
  }
]
```

---

#### **POST** `/api/eventos/:id/completar`
Marca un evento como completado.

**Parámetros:**
- `id` (number) - ID del evento

**Respuesta exitosa (200):**
```json
{
  "message": "Evento completado"
}
```

---

#### **GET** `/api/eventos/esp32`
Endpoint optimizado para dispositivos ESP32.

Retorna formato simplificado con campos cortos para ahorrar memoria.

**Respuesta:**
```json
{
  "count": 3,
  "eventos": [
    {
      "t": "Reunión de equipo",
      "h": "09:00",
      "p": "I"
    },
    {
      "t": "Almuerzo con cliente",
      "h": "13:00",
      "p": "N"
    }
  ]
}
```

**Campos:**
- `t` - Título (máximo 30 caracteres)
- `h` - Hora en formato HH:MM
- `p` - Prioridad: U (Urgente), I (Importante), N (Normal), L (Leve)

---

## 🚀 Despliegue en AWS EC2

### Paso 1: Crear Instancia EC2

#### 1.1 Configuración Básica

1. Ve a **AWS Console** → **EC2** → **Lanzar instancia**
2. **Nombre:** `agenda-backend`
3. **AMI:** Ubuntu Server 22.04 LTS (Free Tier)
4. **Tipo de instancia:** t2.micro (Free Tier)
5. **Par de claves:** Usar el mismo que creaste para el frontend (`agenda-keys`)

#### 1.2 Configuración de Red

**Firewall (grupo de seguridad):**

Crear nuevo grupo de seguridad: `agenda-backend-sg`

**Reglas de entrada:**
- **SSH:** Puerto 22, desde Mi IP
- **Custom TCP:** Puerto 3000, desde 0.0.0.0/0 (para permitir acceso desde frontend)

**Almacenamiento:** 8 GB SSD

#### 1.3 Lanzar Instancia

Clic en **"Lanzar instancia"**

Espera 1-2 minutos hasta que esté en estado **"running"**.

**Obtén y guarda la IP pública:** Ejemplo: `3.145.78.90`

---

### Paso 2: Conectarse a EC2

#### Opción A: EC2 Instance Connect (Recomendado)

1. Ve a **EC2** → **Instancias** → Selecciona `agenda-backend`
2. Clic en **"Conectar"**
3. Pestaña **"EC2 Instance Connect"**
4. Clic en **"Conectar"**

#### Opción B: SSH desde tu PC

```bash
ssh -i /ruta/a/agenda-keys.pem ubuntu@3.145.78.90
```

---

### Paso 3: Instalar Docker en EC2

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Agregar usuario al grupo docker
sudo usermod -aG docker ubuntu

# Salir y volver a entrar
exit
```

Reconecta a EC2 para que tome efecto.

---

### Paso 4: Clonar Repositorio

```bash
# Instalar Git (si no está instalado)
sudo apt install git -y

# Clonar tu repositorio
git clone https://github.com/TU_USUARIO/agenda-personal.git

# Entrar a la carpeta del backend
cd agenda-personal/agenda-backend
```

---

### Paso 5: Configurar Variables de Entorno

#### Opción A: Archivo .env (Desarrollo/Testing)

```bash
# Crear archivo .env
nano .env
```

Agregar:
```env
NODE_ENV=production
PORT=3000
DB_HOST=agenda-db.xxxxx.us-east-1.rds.amazonaws.com
DB_USER=admin
DB_PASSWORD=TU_PASSWORD_RDS
DB_NAME=agenda_db
DB_PORT=3306
FRONTEND_URL=http://TU_IP_FRONTEND
```

Guardar: `Ctrl+O`, Enter, `Ctrl+X`

#### Opción B: Variables en Docker (Producción - Recomendado)

No crear archivo `.env`, pasar variables directamente al contenedor.

---

### Paso 6: Construir y Ejecutar con Docker

#### Opción A: Con archivo .env

```bash
# Construir imagen
docker build -t agenda-backend .

# Ejecutar contenedor
docker run -d \
  --name agenda-backend \
  --restart always \
  -p 3000:3000 \
  --env-file .env \
  agenda-backend:latest
```

#### Opción B: Con variables inline (Más seguro)

```bash
# Construir imagen
docker build -t agenda-backend .

# Ejecutar con variables
docker run -d \
  --name agenda-backend \
  --restart always \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e DB_HOST=agenda-db.xxxxx.rds.amazonaws.com \
  -e DB_USER=admin \
  -e DB_PASSWORD=TU_PASSWORD \
  -e DB_NAME=agenda_db \
  -e DB_PORT=3306 \
  -e FRONTEND_URL=http://IP_FRONTEND \
  agenda-backend:latest
```

---

### Paso 7: Verificar Despliegue

```bash
# Ver logs del contenedor
docker logs agenda-backend -f
```

**Deberías ver:**
```
🔄 Iniciando servidor...
✅ Módulos cargados correctamente
📋 Configuración de base de datos: { host: 'agenda-db.xxxxx...', ... }
🔌 Intentando conectar a MySQL... (intento 1/10)
✅ Conexión a MySQL exitosa
✅ Servidor Express iniciado
📡 URL: http://localhost:3000
```

**Probar desde tu navegador:**
```
http://3.145.78.90:3000/api/eventos
```

Deberías ver un JSON con los eventos.

---

## 🧪 Testing

### Test Local

```bash
# Instalar dependencias
npm install

# Iniciar en modo desarrollo
npm start

# O con nodemon
npm run dev
```

### Test de Endpoints

```bash
# Health check
curl http://localhost:3000/

# Obtener eventos
curl http://localhost:3000/api/eventos

# Crear evento
curl -X POST http://localhost:3000/api/eventos \
  -H "Content-Type: application/json" \
  -d '{
    "titulo": "Test evento",
    "fecha_hora": "2025-11-25 10:00:00",
    "prioridad": "normal"
  }'

# Actualizar evento
curl -X PUT http://localhost:3000/api/eventos/1 \
  -H "Content-Type: application/json" \
  -d '{"titulo": "Evento actualizado"}'

# Completar evento
curl -X POST http://localhost:3000/api/eventos/1/completar

# Eliminar evento
curl -X DELETE http://localhost:3000/api/eventos/1
```

---

## 🔄 Sistema de Notificaciones

El backend incluye un sistema de notificaciones automáticas usando `node-cron`.

### Funcionamiento

Cada minuto, el sistema verifica:
1. ¿Hay eventos para hoy?
2. ¿Están sin notificar?
3. ¿No están completados?

Si encuentra eventos, los marca como notificados y registra en logs.

### Código

```javascript
cron.schedule('* * * * *', async () => {
  const [eventos] = await pool.query(`
    SELECT * FROM eventos 
    WHERE DATE(fecha_hora) = CURDATE() 
    AND notificado = FALSE 
    AND completado = FALSE
  `);

  if (eventos.length > 0) {
    console.log(`🔔 ${eventos.length} evento(s) sin notificar`);
    // Marcar como notificados
  }
});
```

### Ver Notificaciones en Logs

```bash
docker logs agenda-backend -f | grep "🔔"
```

---

## 🔐 Seguridad

### Mejores Prácticas Implementadas

✅ **CORS configurado** - Solo permite orígenes específicos
✅ **Validación de entrada** - Verifica campos requeridos
✅ **Manejo de errores** - No expone información sensible
✅ **Variables de entorno** - Credenciales no hardcodeadas
✅ **Reconexión automática** - Reintentos en caso de fallo DB
✅ **Logs sanitizados** - No registra passwords

### Recomendaciones Adicionales

#### 1. Rate Limiting

Instalar y configurar:
```bash
npm install express-rate-limit
```

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // límite de 100 requests por IP
});

app.use('/api/', limiter);
```

#### 2. Helmet (Seguridad de Headers)

```bash
npm install helmet
```

```javascript
const helmet = require('helmet');
app.use(helmet());
```

#### 3. HTTPS con Let's Encrypt

Usar un reverse proxy como Nginx con certificado SSL.

---

## 📊 Monitoreo

### Ver Logs en Tiempo Real

```bash
# Todos los logs
docker logs -f agenda-backend

# Solo errores
docker logs agenda-backend 2>&1 | grep "Error"

# Solo conexiones
docker logs agenda-backend 2>&1 | grep "Conexión"
```

### Métricas del Contenedor

```bash
# Ver uso de recursos
docker stats agenda-backend

# Ver procesos
docker top agenda-backend
```

### CloudWatch (AWS)

Configurar CloudWatch Logs para persistir logs:

```bash
# Instalar CloudWatch Agent
sudo yum install amazon-cloudwatch-agent
```

---

## 🔄 Actualización

### Actualizar Código

```bash
# En EC2
cd agenda-personal
git pull

# Reconstruir imagen
cd agenda-backend
docker build -t agenda-backend .

# Detener contenedor actual
docker stop agenda-backend
docker rm agenda-backend

# Ejecutar nueva versión
docker run -d \
  --name agenda-backend \
  --restart always \
  -p 3000:3000 \
  --env-file .env \
  agenda-backend:latest
```

### Actualizar Dependencias

```bash
# Actualizar package.json localmente
npm update

# Commit y push
git add package.json package-lock.json
git commit -m "Update dependencies"
git push

# Pull y rebuild en EC2
```

---

## 🐛 Troubleshooting

### Error: "connect ECONNREFUSED"

**Causa:** No puede conectarse a RDS

**Solución:**
```bash
# 1. Verificar que RDS esté corriendo
# 2. Verificar grupo de seguridad de RDS
# 3. Verificar variables de entorno

docker exec agenda-backend sh -c 'echo $DB_HOST'
```

### Error: "Port 3000 already in use"

**Causa:** El puerto ya está en uso

**Solución:**
```bash
# Ver qué está usando el puerto
sudo lsof -i :3000

# Cambiar puerto en docker run
docker run -d -p 3001:3000 ...
```

### Backend no responde

```bash
# Verificar que el contenedor esté corriendo
docker ps

# Ver logs
docker logs agenda-backend

# Reiniciar contenedor
docker restart agenda-backend
```

### Problema de memoria

```bash
# Ver uso de memoria
docker stats

# Aumentar límite de memoria
docker run -d --memory="512m" ...
```

---

## 💰 Costos AWS

### EC2 t2.micro

**Free Tier (12 meses):**
- ✅ 750 horas/mes GRATIS

**Post Free Tier:**
- 💵 ~$9/mes ($0.0116/hora)

### Transferencia de Datos

- Entrada: GRATIS
- Salida primeros 100GB/mes: GRATIS
- Después: $0.09/GB

**Estimado total:** $9-12/mes después del Free Tier

---

## 📚 Recursos Adicionales

- [Express Documentation](https://expressjs.com/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [MySQL2 Documentation](https://github.com/sidorares/node-mysql2)
- [Docker Node.js Best Practices](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)
- [AWS EC2 Documentation](https://docs.aws.amazon.com/ec2/)

---

## 📝 Checklist de Despliegue

```
✅ Instancia EC2 creada (t2.micro)
✅ Grupo de seguridad configurado (puertos 22 y 3000)
✅ Docker instalado en EC2
✅ Repositorio clonado
✅ Variables de entorno configuradas
✅ Imagen Docker construida
✅ Contenedor ejecutándose
✅ Conexión a RDS exitosa
✅ API respondiendo en puerto 3000
✅ Logs mostrando inicio correcto
✅ Pruebas de endpoints exitosas
```

---

**🎉 ¡Backend desplegado exitosamente!**

