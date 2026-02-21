/**
 * Google Apps Script para Comparatico
 * 
 * Este script busca correos electrónicos no leídos con archivos XML (Facturas Electrónicas de CR),
 * los envía a la API de Comparatico y marca los correos como leídos.
 */

const API_URL = "https://TU-URL-DE-CLOUDFLARE.trycloudflare.com/api/upload-xml"; // Actualiza con tu URL pública

function procesarCorreosNuevos() {
    // Busca correos no leídos que contengan archivos XML
    const threads = GmailApp.search('is:unread has:attachment filename:xml');

    if (threads.length === 0) {
        Logger.log("No se encontraron correos nuevos con adjuntos XML.");
        return;
    }

    for (const thread of threads) {
        const messages = thread.getMessages();
        for (const message of messages) {
            if (message.isUnread()) {
                const attachments = message.getAttachments();
                for (const attachment of attachments) {
                    if (attachment.getContentType() === "text/xml" || attachment.getName().toLowerCase().endsWith(".xml")) {

                        Logger.log("Procesando adjunto: " + attachment.getName());

                        const options = {
                            'method': 'post',
                            'payload': {
                                'factura': attachment.copyBlob()
                            },
                            'muteHttpExceptions': true
                        };

                        try {
                            const response = UrlFetchApp.fetch(API_URL, options);
                            Logger.log("Respuesta servidor: " + response.getContentText());

                            if (response.getResponseCode() === 200) {
                                // Éxito
                            }
                        } catch (e) {
                            Logger.log("Error enviando factura: " + e.toString());
                        }
                    }
                }
                // Marca el mensaje como leído para no procesarlo de nuevo
                message.markRead();
            }
        }
    }
}
