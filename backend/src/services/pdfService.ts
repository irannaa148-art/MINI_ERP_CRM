import PDFDocument from 'pdfkit';
import { Challan, ChallanItem, Customer, User } from '@prisma/client';

type FullChallan = Challan & {
  customer: Customer;
  createdBy: User;
  items: ChallanItem[];
};

export const generateInvoicePDF = (challan: FullChallan): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      // Header Banner
      doc
        .fillColor('#1E293B')
        .fontSize(22)
        .font('Helvetica-Bold')
        .text('MINI ERP + CRM OPERATIONS PORTAL', { align: 'left' });
      
      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#64748B')
        .text('Wholesale & Distribution Division | Official Sales Challan Invoice', { align: 'left' });

      doc.moveDown(1.5);

      // Invoice & Customer Info Grid
      const startY = doc.y;

      // Left Column - Customer Details
      doc
        .fillColor('#0F172A')
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('BILLED TO:', 40, startY);
      
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(challan.customer.businessName || challan.customer.name);
      
      doc
        .font('Helvetica')
        .fillColor('#475569')
        .text(`Contact: ${challan.customer.name}`)
        .text(`Mobile: ${challan.customer.mobile}`)
        .text(`Email: ${challan.customer.email || 'N/A'}`)
        .text(`GST No: ${challan.customer.gstNumber || 'N/A'}`)
        .text(`Address: ${challan.customer.address}`);

      // Right Column - Invoice Details
      doc
        .fillColor('#0F172A')
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('CHALLAN DETAILS:', 320, startY);

      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('#2563EB')
        .text(`Challan #: ${challan.challanNumber}`, 320, startY + 15);
      
      doc
        .font('Helvetica')
        .fillColor('#475569')
        .text(`Status: ${challan.status}`, 320)
        .text(`Date: ${new Date(challan.createdAt).toLocaleDateString('en-US', { dateStyle: 'medium' })}`, 320)
        .text(`Created By: ${challan.createdBy.name}`, 320);

      doc.moveDown(2);

      // Line Items Table Header
      const tableTop = doc.y + 10;
      doc.rect(40, tableTop, 515, 24).fill('#F1F5F9');

      doc
        .fillColor('#0F172A')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('#', 50, tableTop + 7)
        .text('SKU', 80, tableTop + 7)
        .text('PRODUCT NAME', 170, tableTop + 7)
        .text('UNIT PRICE', 340, tableTop + 7, { width: 60, align: 'right' })
        .text('QTY', 410, tableTop + 7, { width: 40, align: 'right' })
        .text('TOTAL ($)', 460, tableTop + 7, { width: 85, align: 'right' });

      let position = tableTop + 30;

      // Table Rows
      challan.items.forEach((item, index) => {
        if (position > 720) {
          doc.addPage();
          position = 50;
        }

        doc
          .fillColor('#334155')
          .fontSize(9)
          .font('Helvetica')
          .text(`${index + 1}`, 50, position)
          .text(item.productSku, 80, position)
          .text(item.productName, 170, position, { width: 160 })
          .text(`$${Number(item.unitPrice).toFixed(2)}`, 340, position, { width: 60, align: 'right' })
          .text(`${item.quantity}`, 410, position, { width: 40, align: 'right' })
          .text(`$${Number(item.lineTotal).toFixed(2)}`, 460, position, { width: 85, align: 'right' });

        doc
          .moveTo(40, position + 18)
          .lineTo(555, position + 18)
          .strokeColor('#E2E8F0')
          .stroke();

        position += 24;
      });

      // Totals Box
      position += 10;
      doc.rect(340, position, 215, 60).fill('#F8FAFC');

      doc
        .fillColor('#475569')
        .fontSize(10)
        .font('Helvetica')
        .text(`Total Quantity: ${challan.totalQuantity}`, 350, position + 10, { align: 'left' });

      doc
        .fillColor('#0F172A')
        .fontSize(12)
        .font('Helvetica-Bold')
        .text(`Grand Total: $${Number(challan.totalAmount).toFixed(2)}`, 350, position + 32, { align: 'left' });

      // Footer
      doc
        .fontSize(9)
        .font('Helvetica-Oblique')
        .fillColor('#94A3B8')
        .text('This is a computer-generated challan invoice. No signature required.', 40, 780, {
          align: 'center',
        });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
