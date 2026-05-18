const express = require('express');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');
const db = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const { status, client_id } = req.query;
  let query = `
    SELECT i.*, c.name as client_name, c.email as client_email
    FROM invoices i
    LEFT JOIN clients c ON c.id = i.client_id
    WHERE 1=1
  `;
  const params = [];
  if (status)    { query += ' AND i.status = ?'; params.push(status); }
  if (client_id) { query += ' AND i.client_id = ?'; params.push(client_id); }
  query += ' ORDER BY i.created_at DESC';
  res.json(db.prepare(query).all(...params));
});

router.get('/:id', (req, res) => {
  const inv = db.prepare(`
    SELECT i.*, c.name as client_name, c.email as client_email, c.address as client_address,
           c.phone as client_phone
    FROM invoices i
    LEFT JOIN clients c ON c.id = i.client_id
    WHERE i.id = ?
  `).get(req.params.id);
  if (!inv) return res.status(404).json({ error: 'Not found' });
  inv.line_items = JSON.parse(inv.line_items || '[]');
  res.json(inv);
});

router.post('/', (req, res) => {
  const { booking_id, client_id, line_items, subtotal, total, status } = req.body;
  if (!client_id) return res.status(400).json({ error: 'client_id required' });
  const result = db.prepare(
    'INSERT INTO invoices (booking_id, client_id, line_items, subtotal, total, status) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(booking_id || null, client_id, JSON.stringify(line_items || []), subtotal || 0, total || 0, status || 'unpaid');
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const { line_items, subtotal, total, status } = req.body;
  db.prepare('UPDATE invoices SET line_items=?, subtotal=?, total=?, status=? WHERE id=?')
    .run(JSON.stringify(line_items || []), subtotal, total, status, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM invoices WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

router.get('/:id/pdf', (req, res) => {
  const inv = db.prepare(`
    SELECT i.*, c.name as client_name, c.email as client_email, c.address as client_address, c.phone as client_phone
    FROM invoices i LEFT JOIN clients c ON c.id = i.client_id WHERE i.id = ?
  `).get(req.params.id);
  if (!inv) return res.status(404).json({ error: 'Not found' });

  const lineItems = JSON.parse(inv.line_items || '[]');
  const bizName = (db.prepare("SELECT value FROM settings WHERE key='business_name'").get() || {}).value || 'Relive Mobile Detailing';
  const bizPhone = (db.prepare("SELECT value FROM settings WHERE key='business_phone'").get() || {}).value || '(562) 292-1545';
  const bizEmail = (db.prepare("SELECT value FROM settings WHERE key='business_email'").get() || {}).value || '';

  const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="invoice-${inv.id}.pdf"`);
  doc.pipe(res);

  // Header background
  doc.rect(0, 0, 612, 120).fill('#0D1B2A');
  doc.fillColor('#C9A84C').fontSize(26).font('Helvetica-Bold')
     .text(bizName, 50, 35);
  doc.fillColor('#F8F4EE').fontSize(10).font('Helvetica')
     .text(`${bizPhone}  •  ${bizEmail}`, 50, 68)
     .text('Lynchburg, Virginia', 50, 82);
  doc.fillColor('#C9A84C').fontSize(18).font('Helvetica-Bold')
     .text('INVOICE', 450, 45, { align: 'right', width: 110 });

  doc.fillColor('#0D1B2A').fontSize(10).font('Helvetica');

  // Invoice meta
  doc.moveDown(3);
  const metaY = 140;
  doc.text(`Invoice #: ${String(inv.id).padStart(4, '0')}`, 50, metaY);
  doc.text(`Date: ${new Date(inv.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`, 50, metaY + 15);
  doc.text(`Status: ${inv.status.toUpperCase()}`, 50, metaY + 30);

  // Client info
  doc.font('Helvetica-Bold').text('Bill To:', 350, metaY);
  doc.font('Helvetica')
     .text(inv.client_name || '', 350, metaY + 15)
     .text(inv.client_address || '', 350, metaY + 30)
     .text(inv.client_phone || '', 350, metaY + 45);

  // Divider
  doc.moveTo(50, 215).lineTo(562, 215).strokeColor('#C9A84C').lineWidth(1).stroke();

  // Table header
  const tableY = 230;
  doc.rect(50, tableY, 512, 22).fill('#0D1B2A');
  doc.fillColor('#F8F4EE').font('Helvetica-Bold').fontSize(9)
     .text('DESCRIPTION', 58, tableY + 7)
     .text('AMOUNT', 480, tableY + 7, { width: 75, align: 'right' });

  // Line items
  doc.fillColor('#0D1B2A').font('Helvetica').fontSize(10);
  let rowY = tableY + 30;
  lineItems.forEach((item, i) => {
    if (i % 2 === 0) doc.rect(50, rowY - 4, 512, 22).fill('#F8F4EE');
    doc.fillColor('#0D1B2A')
       .text(item.description || '', 58, rowY)
       .text(`$${Number(item.amount || 0).toFixed(2)}`, 480, rowY, { width: 75, align: 'right' });
    rowY += 24;
  });

  // Totals
  rowY += 10;
  doc.moveTo(350, rowY).lineTo(562, rowY).strokeColor('#ddd').lineWidth(0.5).stroke();
  rowY += 10;
  doc.font('Helvetica').fillColor('#555')
     .text('Subtotal', 350, rowY)
     .text(`$${Number(inv.subtotal).toFixed(2)}`, 480, rowY, { width: 75, align: 'right' });
  rowY += 20;
  doc.rect(350, rowY - 4, 212, 26).fill('#0D1B2A');
  doc.font('Helvetica-Bold').fillColor('#C9A84C').fontSize(12)
     .text('TOTAL', 358, rowY + 2)
     .text(`$${Number(inv.total).toFixed(2)}`, 480, rowY + 2, { width: 75, align: 'right' });

  // Footer
  doc.fillColor('#888').font('Helvetica').fontSize(9)
     .text('Thank you for choosing Relive Mobile Detailing. We appreciate your business!',
           50, 700, { align: 'center', width: 512 });
  doc.moveTo(50, 715).lineTo(562, 715).strokeColor('#C9A84C').lineWidth(0.5).stroke();

  doc.end();
});

router.post('/:id/send', async (req, res) => {
  const inv = db.prepare(`
    SELECT i.*, c.name as client_name, c.email as client_email
    FROM invoices i LEFT JOIN clients c ON c.id = i.client_id WHERE i.id = ?
  `).get(req.params.id);
  if (!inv) return res.status(404).json({ error: 'Not found' });
  if (!inv.client_email) return res.status(400).json({ error: 'Client has no email address' });

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
  });

  try {
    await transporter.sendMail({
      from: `Relive Mobile Detailing <${process.env.GMAIL_USER}>`,
      to: inv.client_email,
      subject: `Invoice #${String(inv.id).padStart(4,'0')} from Relive Mobile Detailing`,
      text: `Hi ${inv.client_name},\n\nPlease find your invoice attached.\n\nTotal due: $${Number(inv.total).toFixed(2)}\n\nThank you!\n— Relive Mobile Detailing`
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
