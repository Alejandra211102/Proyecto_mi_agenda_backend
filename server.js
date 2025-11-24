// server.js
console.log('🔄 Iniciando servidor...');

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware con CORS flexible
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());

console.log('✅ Módulos cargados correctamente');

// ✅ Configuración de MySQL con VARIABLES DE ENTORNO (para AWS RDS)
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'agenda_db',
  port: parseInt(process.env.DB_PORT || '3306'),
  charset: 'utf8mb4',
  connectTimeout: 10000
};

console.log('📋 Configuración de base de datos:', {
  host: dbConfig.host,
  user: dbConfig.user,
  database: dbConfig.database,
  port: dbConfig.port
});

let pool;

async function initDB() {
  const maxRetries = 10;
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      console.log(`🔌 Intentando conectar a MySQL... (intento ${retries + 1}/${maxRetries})`);
      pool = mysql.createPool(dbConfig);
      
      const connection = await pool.getConnection();
      console.log('✅ Conexión a MySQL exitosa');
      connection.release();
      
      return true;
    } catch (error) {
      retries++;
      console.error(`❌ Error conectando a MySQL (intento ${retries}/${maxRetries}):`, error.message);
      
      if (retries < maxRetries) {
        console.log('⏳ Reintentando en 5 segundos...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        console.error('');
        console.error('💥 No se pudo conectar a MySQL después de múltiples intentos');
        console.error('🔍 Verifica que:');
        console.error('   1. El contenedor MySQL esté corriendo (o RDS esté disponible)');
        console.error('   2. La base de datos "agenda_db" exista');
        console.error('   3. Las credenciales sean correctas');
        console.error('   4. El security group permita conexiones en el puerto 3306');
        console.error('');
        return false;
      }
    }
  }
  
  return false;
}

// ==================== RUTAS API ====================

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({
    message: '✅ API de Agenda Personal funcionando',
    timestamp: new Date().toISOString(),
    version: '2.0',
    features: ['CRUD eventos', 'Notificaciones', 'ESP32 support']
  });
});

// Obtener todos los eventos
app.get('/api/eventos', async (req, res) => {
  try {
    const [eventos] = await pool.query('SELECT * FROM eventos ORDER BY fecha_hora ASC');
    res.json(eventos);
  } catch (error) {
    console.error('Error obteniendo eventos:', error);
    res.status(500).json({ error: error.message });
  }
});

// Crear evento
app.post('/api/eventos', async (req, res) => {
  try {
    const { titulo, descripcion, fecha_hora, prioridad } = req.body;
    
    if (!titulo || !fecha_hora) {
      return res.status(400).json({ error: 'Titulo y fecha_hora son obligatorios' });
    }

    const [result] = await pool.query(
      'INSERT INTO eventos (titulo, descripcion, fecha_hora, prioridad) VALUES (?, ?, ?, ?)',
      [titulo, descripcion, fecha_hora, prioridad || 'normal']
    );

    res.status(201).json({
      message: 'Evento creado exitosamente',
      id: result.insertId
    });
  } catch (error) {
    console.error('Error creando evento:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener un evento específico
app.get('/api/eventos/:id', async (req, res) => {
  try {
    const [eventos] = await pool.query(
      'SELECT * FROM eventos WHERE id = ?',
      [req.params.id]
    );

    if (eventos.length === 0) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }

    res.json(eventos[0]);
  } catch (error) {
    console.error('Error obteniendo evento:', error);
    res.status(500).json({ error: error.message });
  }
});

// Actualizar evento
app.put('/api/eventos/:id', async (req, res) => {
  try {
    const { titulo, descripcion, fecha_hora, prioridad, completado } = req.body;
    const { id } = req.params;

    const [result] = await pool.query(
      `UPDATE eventos 
       SET titulo = COALESCE(?, titulo),
           descripcion = COALESCE(?, descripcion),
           fecha_hora = COALESCE(?, fecha_hora),
           prioridad = COALESCE(?, prioridad),
           completado = COALESCE(?, completado)
       WHERE id = ?`,
      [titulo, descripcion, fecha_hora, prioridad, completado, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }

    res.json({ message: 'Evento actualizado exitosamente' });
  } catch (error) {
    console.error('Error actualizando evento:', error);
    res.status(500).json({ error: error.message });
  }
});

// Marcar como completado
app.post('/api/eventos/:id/completar', async (req, res) => {
  try {
    const [result] = await pool.query(
      'UPDATE eventos SET completado = TRUE WHERE id = ?',
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }

    res.json({ message: 'Evento completado exitosamente' });
  } catch (error) {
    console.error('Error completando evento:', error);
    res.status(500).json({ error: error.message });
  }
});

// Eliminar evento
app.delete('/api/eventos/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM eventos WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }

    res.json({ message: 'Evento eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando evento:', error);
    res.status(500).json({ error: error.message });
  }
});

// Eventos del día actual
app.get('/api/eventos/dia/hoy', async (req, res) => {
  try {
    const [eventos] = await pool.query(`
      SELECT * FROM eventos 
      WHERE DATE(fecha_hora) = CURDATE()
      ORDER BY fecha_hora ASC
    `);
    res.json(eventos);
  } catch (error) {
    console.error('Error obteniendo eventos del día:', error);
    res.status(500).json({ error: error.message });
  }
});

// Eventos pendientes
app.get('/api/eventos/pendientes', async (req, res) => {
  try {
    const [eventos] = await pool.query(`
      SELECT * FROM eventos 
      WHERE completado = FALSE AND fecha_hora >= NOW()
      ORDER BY fecha_hora ASC
    `);
    res.json(eventos);
  } catch (error) {
    console.error('Error obteniendo eventos pendientes:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint optimizado para ESP32
app.get('/api/eventos/esp32', async (req, res) => {
  try {
    const [eventos] = await pool.query(`
      SELECT 
        titulo,
        TIME_FORMAT(fecha_hora, '%H:%i') as hora,
        prioridad
      FROM eventos 
      WHERE DATE(fecha_hora) = CURDATE() AND completado = FALSE
      ORDER BY fecha_hora ASC
      LIMIT 10
    `);
    
    const eventosSimplificados = eventos.map(e => ({
      t: e.titulo.substring(0, 30),
      h: e.hora,
      p: e.prioridad[0].toUpperCase()
    }));

    res.json({
      count: eventos.length,
      eventos: eventosSimplificados
    });
  } catch (error) {
    console.error('Error obteniendo eventos para ESP32:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener notificaciones pendientes (eventos próximos)
app.get('/api/notificaciones', async (req, res) => {
  try {
    const [notificaciones] = await pool.query(`
      SELECT 
        id,
        titulo,
        fecha_hora,
        prioridad,
        TIMESTAMPDIFF(MINUTE, NOW(), fecha_hora) as minutos_restantes
      FROM eventos 
      WHERE fecha_hora BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 30 MINUTE)
      AND completado = FALSE
      ORDER BY fecha_hora ASC
    `);

    res.json(notificaciones);
  } catch (error) {
    console.error('Error obteniendo notificaciones:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== SISTEMA DE NOTIFICACIONES ====================

// Sistema de notificaciones y recordatorios - Ejecuta cada minuto
cron.schedule('* * * * *', async () => {
  try {
    if (!pool) return;
    
    // 1. Notificar eventos del día (al inicio del día)
    const [eventosHoy] = await pool.query(`
      SELECT * FROM eventos 
      WHERE DATE(fecha_hora) = CURDATE() 
      AND notificado = FALSE 
      AND completado = FALSE
    `);

    if (eventosHoy.length > 0) {
      console.log(`📅 ${eventosHoy.length} evento(s) para hoy`);
      const ids = eventosHoy.map(e => e.id);
      await pool.query('UPDATE eventos SET notificado = TRUE WHERE id IN (?)', [ids]);
    }

    // 2. Enviar recordatorios antes de que ocurra el evento (30 minutos antes)
    const [eventosProximos] = await pool.query(`
      SELECT * FROM eventos 
      WHERE fecha_hora BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 30 MINUTE)
      AND completado = FALSE
    `);

    if (eventosProximos.length > 0) {
      for (const evento of eventosProximos) {
        const minutosRestantes = Math.floor((new Date(evento.fecha_hora) - new Date()) / 60000);
        console.log(`🔔 RECORDATORIO: "${evento.titulo}" en ${minutosRestantes} minutos (${new Date(evento.fecha_hora).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })})`);
      }
    }

    // 3. Detectar eventos que ya pasaron y no se completaron
    const [eventosPasados] = await pool.query(`
      SELECT * FROM eventos 
      WHERE fecha_hora < NOW() 
      AND completado = FALSE
      AND fecha_hora >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
    `);

    if (eventosPasados.length > 0) {
      console.log(`⚠️  ${eventosPasados.length} evento(s) pasados sin completar`);
    }
    
  } catch (error) {
    console.error('Error en sistema de notificaciones:', error.message);
  }
});

// ==================== INICIAR SERVIDOR ====================

async function start() {
  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('🚀 INICIANDO SERVIDOR DE AGENDA');
  console.log('═══════════════════════════════════════');
  console.log('');
  
  const dbConnected = await initDB();
  
  if (!dbConnected) {
    console.log('⚠️  Servidor iniciado SIN conexión a base de datos');
    console.log('   La API no funcionará hasta que conectes MySQL/RDS');
    console.log('');
  }
  
  app.listen(PORT, () => {
    console.log('');
    console.log('✅ Servidor Express iniciado');
    console.log('📡 URL: http://localhost:' + PORT);
    console.log('');
    console.log('📋 Endpoints disponibles:');
    console.log('   GET    http://localhost:' + PORT + '/api/eventos');
    console.log('   POST   http://localhost:' + PORT + '/api/eventos');
    console.log('   GET    http://localhost:' + PORT + '/api/eventos/esp32');
    console.log('   GET    http://localhost:' + PORT + '/api/notificaciones');
    console.log('');
    console.log('💡 Presiona Ctrl+C para detener');
    console.log('');
  });
}

start().catch(err => {
  console.error('💥 Error fatal:', err);
  process.exit(1);
});