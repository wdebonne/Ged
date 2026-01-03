import PDFDocument from 'pdfkit';
import { PDFDocument as PDFLibDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

// Générer un rapport PDF des courriers
export const generateMailReport = async (mails, options = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const {
        exportType = 'list',
        includeFields = ['reference', 'subject', 'senderName', 'receivedDate'],
        dateFrom,
        dateTo,
        generatedBy = 'Système'
      } = options;

      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: 'Export des courriers',
          Author: 'GED Courrier',
          Creator: 'Service Informatique de Pavilly'
        }
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // En-tête
      doc.fontSize(20).font('Helvetica-Bold').text('GED Courrier', { align: 'center' });
      doc.fontSize(14).font('Helvetica').text('Export des courriers', { align: 'center' });
      doc.moveDown();

      // Informations du rapport
      doc.fontSize(10).fillColor('#666');
      doc.text(`Généré le : ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`);
      doc.text(`Par : ${generatedBy}`);
      
      if (dateFrom || dateTo) {
        let periodText = 'Période : ';
        if (dateFrom && dateTo) {
          periodText += `du ${new Date(dateFrom).toLocaleDateString('fr-FR')} au ${new Date(dateTo).toLocaleDateString('fr-FR')}`;
        } else if (dateFrom) {
          periodText += `à partir du ${new Date(dateFrom).toLocaleDateString('fr-FR')}`;
        } else {
          periodText += `jusqu'au ${new Date(dateTo).toLocaleDateString('fr-FR')}`;
        }
        doc.text(periodText);
      }

      doc.moveDown();
      doc.fillColor('#000');

      // Type d'export
      if (exportType === 'count') {
        // Export comptage uniquement
        doc.fontSize(16).font('Helvetica-Bold').text('Résumé', { underline: true });
        doc.moveDown();
        doc.fontSize(12).font('Helvetica');
        doc.text(`Nombre total de courriers : ${mails.length}`);
        
        // Compter par statut
        const pending = mails.filter(m => m.status === 'pending').length;
        const processed = mails.filter(m => m.status === 'processed').length;
        const archived = mails.filter(m => m.status === 'archived').length;
        
        doc.moveDown();
        doc.text(`• En attente : ${pending}`);
        doc.text(`• Traités : ${processed}`);
        doc.text(`• Archivés : ${archived}`);

      } else {
        // Export liste
        doc.fontSize(16).font('Helvetica-Bold').text(`Liste des courriers (${mails.length})`, { underline: true });
        doc.moveDown();

        // En-têtes de tableau
        const tableTop = doc.y;
        const tableHeaders = [];
        const colWidths = [];
        
        if (includeFields.includes('reference')) {
          tableHeaders.push('Réf.');
          colWidths.push(80);
        }
        if (includeFields.includes('receivedDate')) {
          tableHeaders.push('Date');
          colWidths.push(70);
        }
        if (includeFields.includes('senderName')) {
          tableHeaders.push('Expéditeur');
          colWidths.push(120);
        }
        if (includeFields.includes('subject')) {
          tableHeaders.push('Objet');
          colWidths.push(150);
        }
        if (includeFields.includes('processedDate')) {
          tableHeaders.push('Traité le');
          colWidths.push(70);
        }

        // Dessiner les en-têtes
        doc.fontSize(9).font('Helvetica-Bold');
        let xPos = 50;
        tableHeaders.forEach((header, i) => {
          doc.text(header, xPos, tableTop, { width: colWidths[i], ellipsis: true });
          xPos += colWidths[i];
        });

        // Ligne de séparation
        doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

        // Données
        doc.font('Helvetica').fontSize(8);
        let yPos = tableTop + 20;

        for (const mail of mails) {
          // Vérifier s'il faut une nouvelle page
          if (yPos > 750) {
            doc.addPage();
            yPos = 50;
          }

          xPos = 50;

          if (includeFields.includes('reference')) {
            doc.text(mail.reference || '-', xPos, yPos, { width: colWidths[0] - 5, ellipsis: true });
            xPos += colWidths[0];
          }
          if (includeFields.includes('receivedDate')) {
            const date = mail.receivedDate ? new Date(mail.receivedDate).toLocaleDateString('fr-FR') : '-';
            doc.text(date, xPos, yPos, { width: colWidths[1] - 5 });
            xPos += colWidths[1];
          }
          if (includeFields.includes('senderName')) {
            const senderName = mail.sender?.name || mail.senderName || '-';
            doc.text(senderName, xPos, yPos, { width: colWidths[2] - 5, ellipsis: true });
            xPos += colWidths[2];
          }
          if (includeFields.includes('subject')) {
            doc.text(mail.subject || '-', xPos, yPos, { width: colWidths[3] - 5, ellipsis: true });
            xPos += colWidths[3];
          }
          if (includeFields.includes('processedDate')) {
            const pDate = mail.processedDate ? new Date(mail.processedDate).toLocaleDateString('fr-FR') : '-';
            doc.text(pDate, xPos, yPos, { width: colWidths[4] - 5 });
          }

          yPos += 15;
        }
      }

      // Pied de page
      doc.fontSize(8).fillColor('#888');
      doc.text(
        'Fait avec ❤️ par le Service Informatique de Pavilly',
        50,
        doc.page.height - 50,
        { align: 'center' }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

// Générer un PDF de détail d'un courrier
export const generateMailDetailPDF = async (mail) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // En-tête
      doc.fontSize(18).font('Helvetica-Bold').text('Fiche Courrier', { align: 'center' });
      doc.fontSize(12).text(mail.reference, { align: 'center' });
      doc.moveDown(2);

      // Informations
      doc.fontSize(12).font('Helvetica-Bold').text('Informations générales', { underline: true });
      doc.moveDown();
      doc.font('Helvetica').fontSize(11);

      const info = [
        ['Référence', mail.reference],
        ['Objet', mail.subject],
        ['Expéditeur', mail.sender?.name || mail.senderName],
        ['Service', mail.service?.name || '-'],
        ['Destinataire', mail.recipient ? `${mail.recipient.firstName} ${mail.recipient.lastName}` : '-'],
        ['Date de réception', mail.receivedDate ? new Date(mail.receivedDate).toLocaleDateString('fr-FR') : '-'],
        ['Statut', mail.status === 'pending' ? 'En attente' : mail.status === 'processed' ? 'Traité' : 'Archivé'],
        ['Importé par', mail.importedBy ? `${mail.importedBy.firstName} ${mail.importedBy.lastName}` : '-'],
        ['Date d\'import', mail.importedDate ? new Date(mail.importedDate).toLocaleDateString('fr-FR') : '-']
      ];

      info.forEach(([label, value]) => {
        doc.font('Helvetica-Bold').text(`${label} : `, { continued: true });
        doc.font('Helvetica').text(value || '-');
      });

      // Réponses
      if (mail.responses && mail.responses.length > 0) {
        doc.moveDown(2);
        doc.fontSize(12).font('Helvetica-Bold').text('Réponses', { underline: true });
        doc.moveDown();

        mail.responses.forEach((response, index) => {
          doc.font('Helvetica-Bold').text(`Réponse ${index + 1}`);
          doc.font('Helvetica').fontSize(10);
          doc.text(`Type : ${response.type}`);
          doc.text(`Date : ${new Date(response.date).toLocaleDateString('fr-FR')}`);
          if (response.content) {
            doc.text(`Contenu : ${response.content}`);
          }
          doc.moveDown();
        });
      }

      // Pied de page
      doc.fontSize(8).fillColor('#888');
      doc.text(
        `Généré le ${new Date().toLocaleDateString('fr-FR')} - GED Courrier`,
        50,
        doc.page.height - 50,
        { align: 'center' }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

// Generer un PDF de l'historique d'un courrier
export const generateMailHistoryPDF = async (mail, options = {}) => {
  // Options par défaut - toutes activées
  const exportOptions = {
    creation: true,
    service: true,
    recipient: true,
    readLogs: true,
    processed: true,
    responses: true,
    archived: true,
    ...options
  };

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: 'Historique - ' + (mail.reference || 'Courrier'),
          Author: 'GED Courrier',
          Creator: 'Service Informatique de Pavilly'
        }
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));

      // En-tête avec cadre
      doc.rect(40, 40, 515, 130).stroke('#e5e7eb');
      
      // Titre
      doc.fontSize(18).font('Helvetica-Bold').fillColor('#1f2937');
      doc.text('HISTORIQUE DU COURRIER', 50, 55, { align: 'center', width: 495 });
      
      // Référence
      if (mail.reference) {
        doc.fontSize(12).font('Helvetica').fillColor('#6b7280');
        doc.text(mail.reference, 50, 80, { align: 'center', width: 495 });
      }
      
      doc.moveDown();
      
      // Informations principales dans un tableau
      const startY = 110;
      doc.fontSize(10).font('Helvetica').fillColor('#374151');
      
      // Colonne gauche
      doc.font('Helvetica-Bold').text('Expéditeur :', 50, startY);
      doc.font('Helvetica').text(mail.sender?.name || mail.senderName || '-', 130, startY);
      
      doc.font('Helvetica-Bold').text('Objet :', 50, startY + 18);
      doc.font('Helvetica').text(mail.subject || '-', 130, startY + 18, { width: 160 });
      
      // Colonne droite - Service (conditionnel)
      if (exportOptions.service) {
        doc.font('Helvetica-Bold').text('Service :', 310, startY);
        doc.font('Helvetica').text(mail.service?.name || '-', 375, startY);
      }
      
      doc.font('Helvetica-Bold').text('Reçu le :', 310, startY + 18);
      doc.font('Helvetica').text(mail.receivedDate ? new Date(mail.receivedDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '-', 375, startY + 18);
      
      // Destinataire (conditionnel)
      if (exportOptions.recipient) {
        doc.font('Helvetica-Bold').text('Destinataire :', 50, startY + 40);
        const recipientName = mail.recipient ? `${mail.recipient.firstName} ${mail.recipient.lastName}` : '-';
        doc.font('Helvetica').text(recipientName, 130, startY + 40);
        
        // Destinataires en copie
        if (mail.recipientsCopy && mail.recipientsCopy.length > 0) {
          doc.font('Helvetica-Bold').text('En copie :', 310, startY + 40);
          const copyNames = mail.recipientsCopy.map(r => `${r.firstName} ${r.lastName}`).join(', ');
          doc.font('Helvetica').text(copyNames, 375, startY + 40, { width: 170 });
        }
      }
      
      // Section Historique
      doc.moveDown(4);
      let currentY = 200;
      
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1f2937');
      doc.text('Historique des actions', 50, currentY);
      currentY += 25;
      
      // Ligne de temps
      const events = [];
      
      // Création/Import (conditionnel)
      if (exportOptions.creation && (mail.createdAt || mail.importedDate)) {
        const importDate = mail.importedDate || mail.createdAt;
        events.push({
          date: new Date(importDate),
          type: 'creation',
          title: 'Courrier importe',
          description: mail.importedBy ? `Par ${mail.importedBy.firstName} ${mail.importedBy.lastName}` : 'Import automatique',
          symbol: '[+]'
        });
      }
      
      // Attribution au service (conditionnel) - juste après la création
      if (exportOptions.service && mail.service) {
        const serviceDate = mail.importedDate || mail.createdAt;
        events.push({
          date: new Date(new Date(serviceDate).getTime() + 1000), // +1s pour trier après création
          type: 'service',
          title: 'Attribue au service',
          description: mail.service.name || '-',
          symbol: '[S]'
        });
      }
      
      // Destinataire (conditionnel) - juste après le service
      if (exportOptions.recipient && mail.recipient) {
        const recipientDate = mail.importedDate || mail.createdAt;
        const recipientName = `${mail.recipient.firstName} ${mail.recipient.lastName}`;
        const recipientEmail = mail.recipient.email || '';
        events.push({
          date: new Date(new Date(recipientDate).getTime() + 2000), // +2s pour trier après service
          type: 'recipient',
          title: 'Destinataire',
          description: recipientEmail ? `${recipientName} (${recipientEmail})` : recipientName,
          symbol: '[D]'
        });
        
        // Destinataires en copie
        if (mail.recipientsCopy && mail.recipientsCopy.length > 0) {
          const copyNames = mail.recipientsCopy.map(r => `${r.firstName} ${r.lastName}`).join(', ');
          events.push({
            date: new Date(new Date(recipientDate).getTime() + 3000), // +3s pour trier après destinataire
            type: 'copy',
            title: `Destinataires en copie (${mail.recipientsCopy.length})`,
            description: copyNames,
            symbol: '[C]'
          });
        }
      }
      
      // Lecture(s) (conditionnel)
      if (exportOptions.readLogs && mail.readLogs && mail.readLogs.length > 0) {
        mail.readLogs.forEach(log => {
          events.push({
            date: new Date(log.readAt),
            type: 'read',
            title: 'Lu',
            description: log.user ? `Par ${log.user.firstName} ${log.user.lastName}` : '',
            symbol: '[o]'
          });
        });
      }
      
      // Traitement (conditionnel)
      if (exportOptions.processed && mail.processedDate) {
        events.push({
          date: new Date(mail.processedDate),
          type: 'processed',
          title: 'Courrier traite',
          description: mail.processedBy ? `Par ${mail.processedBy.firstName} ${mail.processedBy.lastName}` : '',
          symbol: '[v]'
        });
      }
      
      // Réponses (conditionnel)
      if (exportOptions.responses && mail.responses && mail.responses.length > 0) {
        mail.responses.forEach((response, index) => {
          const typeLabel = response.type === 'courrier' ? 'Reponse (Courrier)' :
                           response.type === 'email' ? 'Reponse (Email)' :
                           response.type === 'telephone' ? 'Reponse (Telephone)' :
                           response.type === 'appel' ? 'Reponse (Telephone)' :
                           response.type === 'note' ? 'Note interne' : 'Reponse';
          events.push({
            date: new Date(response.date),
            type: 'response',
            title: typeLabel,
            description: response.respondedBy ? `Par ${response.respondedBy.firstName} ${response.respondedBy.lastName}` : '',
            content: response.content,
            hasFile: !!response.filePath,
            fileName: response.fileName,
            symbol: response.type === 'email' ? '[@]' : (response.type === 'telephone' || response.type === 'appel') ? '[T]' : response.type === 'note' ? '[N]' : '[>]'
          });
        });
      }
      
      // Archivage (conditionnel)
      if (exportOptions.archived && mail.archivedDate) {
        events.push({
          date: new Date(mail.archivedDate),
          type: 'archived',
          title: 'Courrier archive',
          description: mail.archivedBy ? `Par ${mail.archivedBy.firstName} ${mail.archivedBy.lastName}` : '',
          symbol: '[A]'
        });
      }
      
      // Trier par date
      events.sort((a, b) => a.date - b.date);
      
      // Dessiner les événements
      doc.fontSize(10).fillColor('#374151');
      
      for (const event of events) {
        // Vérifier si on a besoin d'une nouvelle page
        if (currentY > 700) {
          doc.addPage();
          currentY = 50;
        }
        
        // Point de la timeline
        doc.circle(60, currentY + 6, 4).fill(
          event.type === 'creation' ? '#3b82f6' :
          event.type === 'service' ? '#f59e0b' :
          event.type === 'recipient' ? '#8b5cf6' :
          event.type === 'copy' ? '#06b6d4' :
          event.type === 'read' ? '#6b7280' :
          event.type === 'processed' ? '#10b981' :
          event.type === 'archived' ? '#8b5cf6' :
          event.type === 'response' ? '#f59e0b' :
          '#6b7280'
        );
        
        // Ligne verticale
        if (events.indexOf(event) < events.length - 1) {
          doc.moveTo(60, currentY + 12).lineTo(60, currentY + 50).stroke('#e5e7eb');
        }
        
        // Contenu
        doc.font('Helvetica-Bold').fillColor('#1f2937');
        doc.text(event.title, 80, currentY);
        
        doc.font('Helvetica').fillColor('#6b7280').fontSize(9);
        const dateStr = event.date.toLocaleDateString('fr-FR', { 
          day: '2-digit', 
          month: 'long', 
          year: 'numeric'
        }) + ' a ' + event.date.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit'
        });
        doc.text(dateStr, 80, currentY + 14);
        
        if (event.description) {
          doc.text(event.description, 250, currentY + 14);
        }
        
        currentY += 35;
        
        // Contenu de la réponse
        if (event.content) {
          doc.font('Helvetica').fillColor('#4b5563').fontSize(9);
          doc.text(event.content, 80, currentY, { width: 450 });
          currentY += doc.heightOfString(event.content, { width: 450 }) + 10;
        }
        
        // Fichier joint
        if (event.hasFile && event.fileName) {
          doc.font('Helvetica').fillColor('#2563eb').fontSize(9);
          doc.text('Piece jointe : ' + event.fileName, 80, currentY);
          currentY += 15;
        }
        
        currentY += 15;
      }

      // Collecter les chemins des PDFs de reponse
      const responsePdfPaths = [];
      const uploadPath = process.env.UPLOAD_PATH || './uploads';
      
      if (mail.responses && mail.responses.length > 0) {
        for (const response of mail.responses) {
          if (response.filePath) {
            const fullPath = path.join(uploadPath, response.filePath);
            if (fs.existsSync(fullPath)) {
              // Verifier si c'est un PDF
              const ext = path.extname(response.filePath).toLowerCase();
              if (ext === '.pdf') {
                responsePdfPaths.push(fullPath);
              }
            }
          }
        }
      }

      // Finaliser le document PDFKit
      doc.end();
      
      // Attendre que le buffer soit pret
      doc.on('end', async () => {
        try {
          const historyPdfBuffer = Buffer.concat(buffers);
          
          // Si pas de PDFs de reponse, retourner directement l'historique
          if (responsePdfPaths.length === 0) {
            resolve(historyPdfBuffer);
            return;
          }
          
          // Fusionner avec les PDFs de reponse
          const mergedPdf = await PDFLibDocument.create();
          
          // Ajouter l'historique
          const historyDoc = await PDFLibDocument.load(historyPdfBuffer);
          const historyPages = await mergedPdf.copyPages(historyDoc, historyDoc.getPageIndices());
          historyPages.forEach(page => mergedPdf.addPage(page));
          
          // Ajouter chaque PDF de reponse
          for (const pdfPath of responsePdfPaths) {
            try {
              const pdfBytes = fs.readFileSync(pdfPath);
              const responsePdf = await PDFLibDocument.load(pdfBytes, { ignoreEncryption: true });
              const responsePages = await mergedPdf.copyPages(responsePdf, responsePdf.getPageIndices());
              responsePages.forEach(page => mergedPdf.addPage(page));
            } catch (pdfErr) {
              console.error('Erreur chargement PDF reponse:', pdfPath, pdfErr.message);
            }
          }
          
          const mergedPdfBytes = await mergedPdf.save();
          resolve(Buffer.from(mergedPdfBytes));
        } catch (mergeErr) {
          console.error('Erreur fusion PDFs:', mergeErr);
          // En cas d'erreur de fusion, retourner juste l'historique
          resolve(Buffer.concat(buffers));
        }
      });
    } catch (error) {
      reject(error);
    }
  });
};

export default {
  generateMailReport,
  generateMailDetailPDF,
  generateMailHistoryPDF
};
