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

        const tailRegex2 = /\s+\d+(\s+00)?\s*(g|kg|ml|l|unid|oz|lb|G|KG|ML|L|UNID|OZ|LB)(\s+[01])?$/i;

        console.log("=== PRODUCTOS QUE NO COINCIDIERON CON REGEX 2 ===");
        let nonMatchCount = 0;
        for (const prod of products) {
            if (!tailRegex2.test(prod.nombre)) {
                console.log(`- "${prod.nombre}"`);
                nonMatchCount++;
            }
        }
        console.log(`\nTotal no coincidencias: ${nonMatchCount}`);

    } catch (err) {
        console.error("Error:", err);
    }
}

testRegex();
