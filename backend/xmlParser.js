const { XMLParser } = require('fast-xml-parser');
const crypto = require('crypto');
const fs = require('fs');

const logStream = fs.createWriteStream('parse.log', { flags: 'a' });
function log(msg) {
    const line = `[INF] ${new Date().toISOString()} ${msg}`;
    console.log(line);
    logStream.write(line + '\n');
}
function logErr(msg, err) {
    const line = `[ERR] ${new Date().toISOString()} ${msg} ${err ? err.message : ''}`;
    console.error(line);
    logStream.write(line + '\n');
}

const parser = new XMLParser({
    ignoreAttributes: false,
    parseTagValue: true,
    trimValues: true,
});

function parseFacturaCR(xmlString) {
    log('--- Iniciando parsing de XML de Costa Rica ---');
    try {
        const result = parser.parse(xmlString);

        // Check main root
        const rootKey = Object.keys(result).find(k => k.includes('FacturaElectronica') || k.includes('TiqueteElectronico'));
        if (!rootKey) {
            logErr('Error: No se encontró el nodo raíz esperado (Factura o Tiquete Electrónico).');
            throw new Error('No es un documento electrónico válido de Costa Rica.');
        }

        const doc = result[rootKey];
        log(`Documento detectado: ${rootKey}`);

        // Extract official 50-digit unique key (Clave)
        // Fallback to SHA256 hash if Clave is missing (unlikely in Costa Rica)
        const xmlHash = doc.Clave || crypto.createHash('sha256').update(xmlString).digest('hex');
        log(`Identificador Único (Clave): ${xmlHash}`);

        // Get Establishment / Emisor
        const emisor = doc.Emisor || {};
        const nombreLegal = emisor.Nombre || 'Desconocido';
        const nombreComercial = emisor.NombreComercial;

        let establecimientoName = nombreLegal;
        if (nombreComercial && nombreComercial.trim() !== '' && nombreComercial.trim() !== nombreLegal.trim()) {
            establecimientoName = `${nombreComercial} (${nombreLegal})`;
        } else if (nombreComercial && nombreComercial.trim() !== '') {
            establecimientoName = nombreComercial;
        }

        const ubicacion = emisor.Ubicacion;
        let detalleUbicacion = '';
        if (ubicacion && ubicacion.OtrasSenas) {
            detalleUbicacion = ` - ${ubicacion.OtrasSenas}`;
        }

        // We compose a string that includes the business name and addressing details
        // so it saves uniquely in the DB and gives Google Maps more context
        const establecimiento = `${establecimientoName}${detalleUbicacion}`;

        let fecha = doc.FechaEmision ? new Date(doc.FechaEmision) : new Date();
        // Format to YYYY-MM-DD HH:mm:ss for MariaDB
        fecha = fecha.toISOString().slice(0, 19).replace('T', ' ');
        const total = doc.ResumenFactura?.TotalComprobante || 0;

        log(`Emisor: ${establecimiento}`);
        log(`Fecha Emisión: ${fecha}`);
        log(`Total Comprobante: ${total}`);

        // Get Items
        let items = [];
        const detalleServicio = doc.DetalleServicio?.LineaDetalle;

        if (detalleServicio) {
            const lineas = Array.isArray(detalleServicio) ? detalleServicio : [detalleServicio];
            log(`Encontradas ${lineas.length} líneas de detalle.`);

            items = lineas.map((linea, index) => {
                let barcode = '';
                if (linea.Codigo) {
                    const codigos = Array.isArray(linea.Codigo) ? linea.Codigo : [linea.Codigo];
                    barcode = codigos[0]?.Codigo || '';
                }

                const item = {
                    codigoBarras: barcode,
                    nombre: linea.Detalle || 'Producto',
                    precio: linea.PrecioUnitario || 0,
                    cantidad: linea.Cantidad || 1,
                    unidadMedida: linea.UnidadMedida || ''
                };

                log(`  [Línea ${index + 1}] Prod: ${item.nombre.substring(0, 30)}... | Cant: ${item.cantidad} ${item.unidadMedida} | Precio: ${item.precio}`);
                return item;
            });
        } else {
            logErr('Advertencia: El XML no contiene Líneas de Detalle.');
        }

        return {
            xmlHash,
            establecimiento,
            fecha,
            total,
            items
        };
    } catch (error) {
        logErr('Error crítico durante el parseo del XML:', error);
        throw new Error(`Error al procesar el archivo XML: ${error.message}`);
    }
}

module.exports = { parseFacturaCR };
