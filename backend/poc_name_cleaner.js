const NameCleaningService = require('./nameCleaningService');

async function test() {
    console.log("=== INICIANDO PRUEBA DE LIMPIEZA HÍBRIDA ===");
    const service = new NameCleaningService(null); // No DB needed for this test

    const catalog = [
        { id: 1, nombre: 'ARROZ T PELON 99' },
        { id: 2, nombre: 'LECHE PINOS CAJA' },
        { id: 3, nombre: 'ATUN TESORO DEL MAR' }
    ];

    const testCases = [
        // 1. Exact Match / High score (Should be FUZZY MERGE without LLM)
        "Arroz Tio Pelon 99%",

        // 2. Gray Area (Should be sent to LLM)
        "Leche Pinito",

        // 3. New Product (Low score, Should be NEW)
        "Galletas Chiky Chocolate"
    ];

    for (const newName of testCases) {
        console.log(`\nProbando: "${newName}"`);
        const result = await service.findBestMatch(newName, catalog);
        console.log("Resultado final:", result);
    }
}

test();
