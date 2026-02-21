const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'comparatico_user',
  password: process.env.DB_PASSWORD || 'comparatico_password',
  database: process.env.DB_NAME || 'comparatico',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const initDb = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('--- Iniciando migración de esquema a MariaDB ---');

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS productos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        codigoBarras VARCHAR(100) UNIQUE,
        nombre VARCHAR(255) NOT NULL,
        descripcion TEXT,
        creadoEn DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS recibos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        claveXml VARCHAR(100) UNIQUE NOT NULL,
        fecha DATETIME,
        establecimiento VARCHAR(255) NOT NULL,
        total DECIMAL(15, 2),
        creadoEn DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS precios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        productoId INT NOT NULL,
        reciboId INT NOT NULL,
        precio DECIMAL(15, 5) NOT NULL,
        creadoEn DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_producto (productoId),
        INDEX idx_recibo (reciboId),
        CONSTRAINT fk_producto FOREIGN KEY (productoId) REFERENCES productos(id) ON DELETE CASCADE,
        CONSTRAINT fk_recibo FOREIGN KEY (reciboId) REFERENCES recibos(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    console.log('--- Esquema de MariaDB inicializado correctamente ---');
    connection.release();
  } catch (error) {
    console.error('Error inicializando MariaDB:', error);
    process.exit(1);
  }
};

initDb();

module.exports = pool;
