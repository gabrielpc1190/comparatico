const fs = require('fs');
const path = require('path');

async function testRegex() {
    try {
        const filePath = path.join(__dirname, 'products_export.tsv');
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim().length > 0);

        const products = lines.map(line => {
            const parts = line.split('\t');
            return { id: parts[0], nombre: parts[1] || '' };
        });

        // Refined Regex: Number is optional now.
        const tailRegex3 = /\s+(\d+)?(\s+00)?\s*(g|kg|ml|l|unid|oz|lb)(\s+\d+)?$/i;

        console.log("=== PROBANDO REGEX FINAL (v3) ===");
        let matchCount = 0;
        let samples = [];

        for (const prod of products) {
            if (tailRegex3.test(prod.nombre)) {
                matchCount++;
                if (samples.length < 15) {
                    samples.push({
                        orig: prod.nombre,
                        clean: prod.nombre.replace(tailRegex3, '').trim()
                    });
                }
            } else {
                // Check if it's one of the ones we wanted to catch now
                if (prod.nombre.toLowerCase().endsWith('kg') || prod.nombre.toLowerCase().endsWith('unid')) {
                    // This should be caught by regex3 now
                }
            }
        }

        samples.forEach(s => {
            console.log(`Original: "${s.orig}"`);
            console.log(`Clean   : "${s.clean}"`);
            console.log("-");
        });

        console.log(`\nResultados Finales:`);
        console.log(`Total Productos: ${products.length}`);
        console.log(`Coincidencias: ${matchCount} (${((matchCount / products.length) * 100).toFixed(2)}%)`);

    } catch (err) {
        console.error("Error:", err);
    }
}

testRegex();
