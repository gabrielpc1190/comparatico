const fs = require('fs');
const path = require('path');

async function testRegex() {
    console.log("=== PROBANDO REGEX DE LIMPIEZA DE NOMBRES (DESDE ARCHIVO) ===");

    try {
        const filePath = path.join(__dirname, 'products_export.tsv');
        if (!fs.existsSync(filePath)) {
            console.error("El archivo products_export.tsv no existe.");
            return;
        }

        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim().length > 0);

        const products = lines.map(line => {
            const parts = line.split('\t');
            return { id: parts[0], nombre: parts[1] || '' };
        });

        console.log(`Analizando ${products.length} productos...`);

        // Propuesta 1: Captura números separados por espacio, luego '00', luego unidad(g, kg, ml, l, unid), y opcionalmente un '0' o '1' al final.
        const tailRegex1 = /\s+\d+\s+00\s+(g|kg|ml|l|unid|oz|lb)(\s+[01])?$/i;

        // Propuesta 2: Algo más agresivo, cualquier cosa que parezca peso al final. 
        const tailRegex2 = /\s+\d+(\s+00)?\s*(g|kg|ml|l|unid|oz|lb|G|KG|ML|L|UNID|OZ|LB)(\s+\d+)?$/i;

        let matchCount1 = 0;
        let matchCount2 = 0;

        console.log("\n--- EJEMPLOS DE LIMPIEZA ---");

        for (const prod of products) {
            let matched = false;
            let cleanedName1 = prod.nombre;
            let cleanedName2 = prod.nombre;

            if (tailRegex1.test(prod.nombre)) {
                cleanedName1 = prod.nombre.replace(tailRegex1, '').trim();
                matchCount1++;
                matched = true;
            }

            if (tailRegex2.test(prod.nombre)) {
                cleanedName2 = prod.nombre.replace(tailRegex2, '').trim();
                matchCount2++;
                matched = true;
            }

            if (matched && matchCount1 <= 40) {
                console.log(`Original: "${prod.nombre}"`);
                console.log(`  Regex 1 : "${cleanedName1}"`);
                console.log(`  Regex 2 : "${cleanedName2}"`);
                console.log("-");
            }
        }

        console.log(`\nResultados:`);
        console.log(`Total Productos: ${products.length}`);
        console.log(`Coincidencias Regex 1: ${matchCount1} (${((matchCount1 / products.length) * 100).toFixed(2)}%)`);
        console.log(`Coincidencias Regex 2: ${matchCount2} (${((matchCount2 / products.length) * 100).toFixed(2)}%)`);

    } catch (err) {
        console.error("Error:", err);
    }
}

testRegex();
