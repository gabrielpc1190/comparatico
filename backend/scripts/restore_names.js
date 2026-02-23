const fs = require('fs');
const path = require('path');
const db = require('../db');

async function restoreNames() {
    console.log("=== INICIANDO RESTAURACIÓN DE NOMBRES DESDE BACKUP ===");

    try {
        const filePath = path.join(__dirname, '../products_export.tsv');
        if (!fs.existsSync(filePath)) {
            console.error("No se encontró el archivo products_export.tsv para restaurar.");
            return;
        }

        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim().length > 0);

        console.log(`Restaurando ${lines.length} productos...`);

        for (const line of lines) {
            const parts = line.split('\t');
            if (parts.length >= 2) {
                const id = parts[0];
                const nombre = parts[1];
                await db.execute('UPDATE productos SET nombre = ? WHERE id = ?', [nombre, id]);
            }
        }

        console.log("Restauración completada con éxito.");

    } catch (error) {
        console.error("Error durante la restauración:", error);
    } finally {
        await db.end();
    }
}

restoreNames();
