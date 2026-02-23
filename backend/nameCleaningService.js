const fuzzball = require('fuzzball');
const axios = require('axios');

class NameCleaningService {
    constructor(db, ollamaUrl = 'http://10.10.103.241:11434', ollamaModel = 'qwen2.5-coder:14b') {
        this.db = db;
        this.ollamaUrl = ollamaUrl;
        this.ollamaModel = ollamaModel;

        // Thresholds
        this.EXACT_MATCH_THRESHOLD = 92; // >= 92% is considered an exact match
        this.GRAY_AREA_THRESHOLD = 65;   // Between 65% and 91% goes to LLM
    }

    /**
     * Uses the local LLM to cleanly format a product name, preserving weight/units.
     * @param {string} name 
     * @param {number} cantidad Optional quantity context from invoice
     * @param {string} unidadMedida Optional unit context from invoice
     * @returns {Promise<string>}
     */
    async beautifyName(name, cantidad = null, unidadMedida = null) {
        if (!name) return '';

        let extraContext = "";
        if (cantidad !== null && unidadMedida !== null) {
            extraContext = `\nCONTEXTO ADICIONAL DE LA FACTURA: El sistema indica que la cantidad facturada es "${cantidad}" en unidad "${unidadMedida}". 
Si el nombre original tiene números como "100" pero el contexto dice "1", asume que "100" son en realidad decimales "1.00" y usa el valor del contexto (1).`;
        }

        const prompt = `
Actúa como un experto formateador de datos comerciales. Tengo un nombre de producto "sucio" con ruidos técnicos al final.
Tu tarea es devolverme el nombre LIMPIO Y LEGIBLE en español.

REGLAS CRÍTICAS:
1. MANTÉN los espacios entre las palabras (ej. "Arroz Tio Pelon").
2. MANTÉN el peso o volumen real del producto (ej. 500g, 1kg, 350ml). 
3. REGLA DE ORO PARA PESOS: Si ves un número seguido de espacios y ceros (ej. "1 00 kg" o "1 0 0 g"), interpreta los ceros como decimales. "1 00 kg" es "1kg", NO "100kg".
4. Une el número a su unidad (ej: "500g" es correcto, "500 g" no).
5. Usa Mayúsculas y Minúsculas correctamente para legibilidad.
6. NO inventes pesos si no estás seguro.
${extraContext}

Nombre Original: "${name}"

Devuelve ÚNICAMENTE el nombre limpio final corregido. Sin comillas ni explicaciones adicionales.`;

        try {
            const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
                model: this.ollamaModel,
                prompt: prompt,
                stream: false,
                options: { temperature: 0.1 }
            }, { timeout: 10000 });

            return response.data.response.trim();
        } catch (error) {
            console.warn(`[Beautify Error] Falló LLM para "${name}": ${error.message}`);
            return name; // Fallback to original if LLM fails
        }
    }

    /**
     * Pre-process a string to improve matching accuracy.
     * Removes extra spaces, special chars, and normalizes case/accents.
     * @param {string} name 
     * @returns {string}
     */
    normalize(name) {
        if (!name) return '';
        return name
            .toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
            .replace(/[^\w\s\d]/g, ' ') // Replace symbols with spaces
            .replace(/\s+/g, ' ') // Collapse multiple spaces
            .trim();
    }

    /**
     * Ask the local LLM (Ollama) if two product names refer to the exact same item.
     * @param {string} name1 
     * @param {string} name2 
     * @returns {Promise<boolean>}
     */
    async askLlmIfSameProduct(name1, name2) {
        const prompt = `
Actúa como un experto cajero de un supermercado en Costa Rica.
Tengo dos descripciones de productos extraídas de diferentes facturas.
Dime si se refieren al EXACTAMENTE MISMO producto físico (misma marca, mismo ítem, mismo peso/tamaño si se indica).
Ten en cuenta que a veces se abrevian palabras (ej. "T." por "TÍO", "g" por "gramos", etc).

Producto 1: "${name1}"
Producto 2: "${name2}"

Responde ÚNICAMENTE con la palabra "SI" o "NO". No agregues ninguna otra palabra.`;

        try {
            console.log(`[LLM] Preguntando a Ollama (${this.ollamaModel}) sobre: "${name1}" vs "${name2}"...`);
            const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
                model: this.ollamaModel,
                prompt: prompt,
                stream: false,
                options: {
                    temperature: 0.1 // Keep it deterministic
                }
            }, { timeout: 15000 }); // 15 seconds timeout

            const answer = response.data.response.trim().toUpperCase();
            console.log(`[LLM Respuesta]: ${answer}`);

            return answer.includes('SI');
        } catch (error) {
            console.error(`[LLM ERROR] Fallo al consultar Ollama: ${error.message}`);
            return false; // Safely assume they are different if LLM fails
        }
    }

    /**
     * Analyzes a new product name against the existing catalog.
     * Uses fuzzy matching and falls back to LLM if in the gray area.
     * @param {string} newProductName 
     * @param {Array<{id: number, nombre: string}>} catalog 
     * @returns {Promise<{action: 'MERGE'|'NEW', targetId?: number, confidence?: number}>}
     */
    async findBestMatch(newProductName, catalog) {
        if (!catalog || catalog.length === 0) {
            return { action: 'NEW' };
        }

        // We don't beautify here because findBestMatch is called multiple times
        // during searching. We should beautify the name ONCE before saving or matching.
        const normNew = this.normalize(newProductName);

        // Prepare array of normalized catalog names for Fuzzball
        const choices = catalog.map(p => this.normalize(p.nombre));

        // Use token_set_ratio which handles out-of-order words well
        // Example: "Arroz Tio Pelon" matches "Tio Pelon Arroz"
        const result = fuzzball.extract(normNew, choices, {
            scorer: fuzzball.token_set_ratio,
            limit: 1
        });

        if (result.length === 0) {
            return { action: 'NEW' };
        }

        const [bestMatchText, score, index] = result[0];
        const bestCatalogItem = catalog[index];

        console.log(`[Fuzzy] "${newProductName}" vs "${bestCatalogItem.nombre}" (Score: ${score})`);

        if (score >= this.EXACT_MATCH_THRESHOLD) {
            // It's a mathematically safe match
            return {
                action: 'MERGE',
                targetId: bestCatalogItem.id,
                confidence: score,
                method: 'FUZZY'
            };
        } else if (score >= this.GRAY_AREA_THRESHOLD) {
            // It's close, but we are not sure. Ask the LLM.
            const isSame = await this.askLlmIfSameProduct(newProductName, bestCatalogItem.nombre);

            if (isSame) {
                return {
                    action: 'MERGE',
                    targetId: bestCatalogItem.id,
                    confidence: score,
                    method: 'LLM'
                };
            } else {
                return { action: 'NEW', confidence: score, method: 'LLM_REJECTED' };
            }
        }

        // Score below gray area, it's definitely a new product
        return { action: 'NEW', confidence: score, method: 'FUZZY' };
    }
}

module.exports = NameCleaningService;
