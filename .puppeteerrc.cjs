/**
 * Configuración de Puppeteer para localhost (Windows)
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
    // En localhost NO necesitamos descargar Chromium por separado.
    // whatsapp-web.js usará el Chromium bundled con Puppeteer automáticamente.
    cacheDirectory: __dirname + '/.cache/puppeteer',
};
