'use strict';
// Devis et factures en PDF (pdfkit)
const fs = require('fs');
const path = require('path');
let PDFDocument = null;
try { PDFDocument = require('pdfkit'); } catch { /* module absent */ }

const FONT_DIR = path.join(__dirname, '..', 'polices');
const TEAL = '#0A6CF0', INK = '#0B1830', INK2 = '#4A5A78', LINE = '#D6DEEC', SOFT = '#EEF3FB';

// Nombres : 1 234,500 (espace normale, compatible avec toutes les polices)
function fmt(n, d = 3) {
  const v = Math.round((+n || 0) * 10 ** d) / 10 ** d;
  const [i, f] = Math.abs(v).toFixed(d).split('.');
  return (v < 0 ? '-' : '') + i.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + (d ? ',' + f : '');
}
function dateFR(t) {
  const d = new Date(t);
  return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
}

/* ---------- Montant en lettres ---------- */
const U = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize'];
const T = { 20: 'vingt', 30: 'trente', 40: 'quarante', 50: 'cinquante', 60: 'soixante' };
function below100(n, tail = true) {
  if (n <= 16) return U[n];
  if (n < 20) return 'dix-' + U[n - 10];
  if (n < 70) { const t = Math.floor(n / 10) * 10, u = n % 10; return T[t] + (u === 0 ? '' : u === 1 ? ' et un' : '-' + U[u]); }
  if (n < 80) { const r = n - 60; return 'soixante' + (r === 11 ? ' et onze' : '-' + below100(r)); }
  const r = n - 80; return r === 0 ? (tail ? 'quatre-vingts' : 'quatre-vingt') : 'quatre-vingt-' + below100(r);
}
function below1000(n, tail) {
  const c = Math.floor(n / 100), r = n % 100;
  let s = '';
  if (c) s = (c > 1 ? U[c] + ' ' : '') + 'cent' + (c > 1 && r === 0 && tail ? 's' : '');
  if (r) s += (s ? ' ' : '') + below100(r, tail);
  return s;
}
function enLettres(n) {
  n = Math.floor(n);
  if (n === 0) return 'zéro';
  const parts = [];
  const mds = Math.floor(n / 1e9), mns = Math.floor((n % 1e9) / 1e6), ms = Math.floor((n % 1e6) / 1000), r = n % 1000;
  if (mds) parts.push(below1000(mds, true) + ' milliard' + (mds > 1 ? 's' : ''));
  if (mns) parts.push(below1000(mns, true) + ' million' + (mns > 1 ? 's' : ''));
  if (ms) parts.push(ms === 1 ? 'mille' : below1000(ms, false) + ' mille');
  if (r) parts.push(below1000(r, true));
  return parts.join(' ');
}
function montantEnLettres(v) {
  const tot = Math.round((+v || 0) * 1000);
  const d = Math.floor(tot / 1000), m = tot % 1000;
  let s = enLettres(d) + (d > 1 ? (d % 1e6 === 0 ? ' de dinars' : ' dinars') : ' dinar');
  if (m) s += ' et ' + enLettres(m) + (m > 1 ? ' millimes' : ' millime');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ---------- Calcul des totaux ---------- */
function totals(doc) {
  const lines = (doc.lines || []).map(l => ({ label: String(l.label || ''), qty: +l.qty || 0, pu: +l.pu || 0 }));
  const brut = lines.reduce((a, l) => a + l.qty * l.pu, 0);
  const remise = brut * (+doc.discountPct || 0) / 100;
  const ht = brut - remise;
  const tva = ht * (+doc.vat || 0) / 100;
  const timbre = +doc.timbre || 0;
  const ttc = ht + tva + timbre;
  return { lines, brut, remise, ht, tva, timbre, ttc };
}

const KIND = {
  facture: { title: 'Facture', head: 'FACTURE', to: 'FACTURÉ À', stop: 'Arrêtée la présente facture' },
  devis:   { title: 'Devis', head: 'DEVIS', to: 'DEVIS ÉTABLI POUR', stop: 'Arrêté le présent devis' },
  avoir:   { title: 'Avoir', head: 'AVOIR', to: 'AVOIR ÉTABLI POUR', stop: 'Arrêté le présent avoir' },
  bon:     { title: 'Bon de commande', head: 'BON DE COMMANDE', to: 'FOURNISSEUR', stop: 'Arrêté le présent bon de commande' },
};

/* ---------- Mise en page ---------- */
function render(doc) {
  if (!PDFDocument) throw new Error('Module pdfkit absent : relancez l\'installation.');
  const pdf = new PDFDocument({ size: 'A4', margin: 48, bufferPages: true, info: { Title: `${KIND[doc.kind || 'facture'].title} ${doc.no}`, Author: doc.company.brand || 'FAZA 3D' } });
  const R = path.join(FONT_DIR, 'Inter-Regular.otf'), B = path.join(FONT_DIR, 'Inter-SemiBold.otf');
  const hasFonts = fs.existsSync(R) && fs.existsSync(B);
  if (hasFonts) { pdf.registerFont('R', R); pdf.registerFont('B', B); } else { pdf.registerFont('R', 'Helvetica'); pdf.registerFont('B', 'Helvetica-Bold'); }
  const chunks = [];
  pdf.on('data', c => chunks.push(c));
  const done = new Promise(ok => pdf.on('end', () => ok(Buffer.concat(chunks))));

  const co = doc.company || {}, cl = doc.client || {};
  const t = totals(doc);
  const W = pdf.page.width, L = 48, Rr = W - 48, CW = Rr - L;
  const K = KIND[doc.kind || 'facture'];
  const isDevis = doc.kind === 'devis', isBon = doc.kind === 'bon', isAvoir = doc.kind === 'avoir';

  // En-tête
  pdf.rect(0, 0, W, 6).fill(TEAL);
  let y = 40;
  if (doc.logo && fs.existsSync(doc.logo)) { try { pdf.image(doc.logo, L, y, { fit: [120, 48] }); y += 54; } catch {} }
  else {
    const def = path.join(__dirname, '..', 'public', 'icones', 'icone-512.png');
    let tx = L;
    if (fs.existsSync(def)) { try { pdf.image(def, L, y - 6, { fit: [40, 40] }); tx = L + 48; } catch {} }
    pdf.font('B').fontSize(22).fillColor(INK).text('FAZA ', tx, y, { continued: true }).fillColor(TEAL).text('3D');
    y += 36;
  }
  pdf.font('B').fontSize(10).fillColor(INK).text(co.name || '', L, y); y += 14;
  pdf.font('R').fontSize(9).fillColor(INK2);
  const coLines = [co.address, co.mf ? 'Matricule fiscal : ' + co.mf : '', co.rc ? 'RNE : ' + co.rc : '', [co.phone ? 'Tél. ' + co.phone : '', co.email].filter(Boolean).join('  ·  ')].filter(Boolean);
  for (const s of coLines) { pdf.text(s, L, y, { width: 260 }); y = pdf.y + 1; }

  pdf.font('B').fontSize(20).fillColor(INK).text(K.head, 320, 40, { width: Rr - 320, align: 'right' });
  pdf.font('B').fontSize(11).fillColor(TEAL).text('N° ' + doc.no, 320, 68, { width: Rr - 320, align: 'right' });
  pdf.font('R').fontSize(9).fillColor(INK2);
  const meta = ['Date : ' + dateFR(doc.at)];
  if (isDevis) meta.push('Valable ' + (doc.validityDays || 30) + ' jours, jusqu\'au ' + dateFR(doc.at + (doc.validityDays || 30) * 864e5));
  if (doc.ref) meta.push(doc.ref);
  let my = 86; for (const s of meta) { pdf.text(s, 320, my, { width: Rr - 320, align: 'right' }); my += 12; }

  // Client
  y = Math.max(y, my) + 16;
  const boxH = 22 + 13 * [cl.address, cl.mf, cl.phone || cl.email].filter(Boolean).length + 20;
  pdf.roundedRect(320, y, Rr - 320, boxH, 4).fill(SOFT);
  pdf.font('R').fontSize(8).fillColor(INK2).text(K.to, 332, y + 9);
  pdf.font('B').fontSize(10.5).fillColor(INK).text(cl.name || '—', 332, y + 21, { width: Rr - 344 });
  pdf.font('R').fontSize(9).fillColor(INK2);
  let cy = pdf.y + 1;
  for (const s of [cl.address, cl.mf ? 'MF : ' + cl.mf : '', [cl.phone, cl.email].filter(Boolean).join('  ·  ')].filter(Boolean)) { pdf.text(s, 332, cy, { width: Rr - 344 }); cy = pdf.y + 1; }
  y += boxH + 22;

  // Tableau
  const cols = [{ k: 'label', w: CW - 60 - 85 - 95, a: 'left', h: 'Désignation' }, { k: 'qty', w: 60, a: 'right', h: 'Qté' }, { k: 'pu', w: 85, a: 'right', h: 'P.U. HT' }, { k: 'tot', w: 95, a: 'right', h: 'Total HT' }];
  const header = () => {
    pdf.rect(L, y, CW, 22).fill(INK);
    let x = L; pdf.font('B').fontSize(8.5).fillColor('#FFFFFF');
    for (const c of cols) { pdf.text(c.h, x + 8, y + 7, { width: c.w - 16, align: c.a }); x += c.w; }
    y += 22;
  };
  header();
  pdf.font('R').fontSize(9.5).fillColor(INK);
  t.lines.forEach((l, i) => {
    const h = Math.max(20, pdf.heightOfString(l.label, { width: cols[0].w - 16 }) + 10);
    if (y + h > pdf.page.height - 230) { pdf.addPage(); y = 48; header(); pdf.font('R').fontSize(9.5).fillColor(INK); }
    if (i % 2) pdf.rect(L, y, CW, h).fill('#F7FAF9');
    pdf.fillColor(INK);
    let x = L;
    const vals = [l.label, fmt(l.qty, Number.isInteger(l.qty) ? 0 : 2), fmt(l.pu), fmt(l.qty * l.pu)];
    cols.forEach((c, j) => { pdf.text(vals[j], x + 8, y + 5, { width: c.w - 16, align: c.a }); x += c.w; });
    y += h;
    pdf.moveTo(L, y).lineTo(Rr, y).lineWidth(0.5).strokeColor(LINE).stroke();
  });

  // Totaux
  y += 12;
  if (y + 250 > pdf.page.height - 70) { pdf.addPage(); y = 48; }
  const TX = 330, TW = Rr - TX;
  const row = (label, val, bold) => {
    pdf.font(bold ? 'B' : 'R').fontSize(bold ? 11 : 9.5).fillColor(bold ? INK : INK2).text(label, TX, y, { width: TW - 110 });
    pdf.fillColor(INK).text(val, TX + TW - 120, y, { width: 120, align: 'right' }); y += bold ? 20 : 16;
  };
  if (t.remise) { row('Total brut HT', fmt(t.brut) + ' DT'); row(`Remise ${fmt(doc.discountPct, 0)} %`, '-' + fmt(t.remise) + ' DT'); }
  row('Total HT', fmt(t.ht) + ' DT');
  row(`TVA ${fmt(doc.vat, 0)} %`, fmt(t.tva) + ' DT');
  if (t.timbre) row('Timbre fiscal', fmt(t.timbre) + ' DT');
  pdf.moveTo(TX, y).lineTo(Rr, y).lineWidth(1.2).strokeColor(INK).stroke(); y += 6;
  row('Total TTC', fmt(t.ttc) + ' DT', true);
  if (doc.kind === 'facture' && doc.paid) { row('Déjà réglé', fmt(doc.paid) + ' DT'); row('Reste à payer', fmt(Math.max(0, t.ttc - doc.paid)) + ' DT', true); }

  y += 8;
  pdf.font('R').fontSize(9).fillColor(INK2).text(K.stop + ' à la somme de :', L, y, { width: CW });
  pdf.font('B').fontSize(9.5).fillColor(INK).text(montantEnLettres(t.ttc) + ' TTC.', L, pdf.y + 2, { width: CW });
  y = pdf.y + 14;

  // Conditions
  pdf.font('R').fontSize(8.8).fillColor(INK2);
  const cond = [];
  if (isDevis) {
    if (doc.leadText) cond.push('Délai de réalisation estimé : ' + doc.leadText + ' après validation du devis et du fichier.');
    cond.push(doc.terms || 'Acompte de 50 % à la commande, solde à la livraison.');
    if (doc.acceptUrl) cond.push('Pour accepter ce devis en ligne : ' + doc.acceptUrl);
  } else if (isAvoir) {
    cond.push('Avoir sur la facture ' + (doc.ref || '') + (doc.reason ? ' : ' + doc.reason : '') + '.');
  } else if (isBon) {
    cond.push(doc.terms || 'Merci de confirmer la disponibilité et le délai de livraison.');
    if (doc.deliverTo) cond.push('Livraison à : ' + doc.deliverTo);
  } else {
    cond.push(doc.terms || 'Paiement à réception de la facture.');
  }
  if (doc.notes) cond.push(doc.notes);
  for (const s of cond) { pdf.text(s, L, y, { width: CW }); y = pdf.y + 3; }

  // Cachet et signature de l'atelier (image PNG) + mention de signature électronique
  const hasStamp = doc.stamp && fs.existsSync(doc.stamp);
  if (hasStamp || isDevis) {
    y += 16;
    if (y + 110 > pdf.page.height - 70) { pdf.addPage(); y = 48; }
    const SX = isDevis ? L : TX, SW = isDevis ? CW / 2 - 10 : TW;
    if (hasStamp) {
      pdf.font('R').fontSize(8.5).fillColor(INK2).text((isDevis ? 'Pour l’atelier' : 'Cachet et signature') + (doc.company.name ? ' · ' + doc.company.name : ''), SX, y, { width: SW });
      try { pdf.image(doc.stamp, SX, y + 12, { fit: [Math.min(150, SW), 80] }); } catch {}
    }
    if (isDevis) {
      pdf.roundedRect(TX, y, TW, 92, 4).lineWidth(0.7).strokeColor(LINE).stroke();
      pdf.font('R').fontSize(8.5).fillColor(INK2).text('Bon pour accord : date, signature et cachet du client', TX + 10, y + 8, { width: TW - 20 });
    }
    y += 100;
  }
  if (doc.qr && doc.verifyUrl) {
    if (y + 80 > pdf.page.height - 70) { pdf.addPage(); y = 48; }
    try { pdf.image(doc.qr, L, y, { fit: [64, 64] }); } catch {}
    pdf.font('B').fontSize(8.5).fillColor(INK).text('Vérifier l’authenticité de ce document', L + 74, y + 6, { width: CW - 74 });
    pdf.font('R').fontSize(8).fillColor(INK2).text('Scannez le code ou ouvrez ' + doc.verifyUrl + ' : vous verrez le numéro, la date, le client et le montant enregistrés chez ' + (doc.company.name || 'l’atelier') + '. Si la page ne correspond pas au document, il a été modifié.', L + 74, pdf.y + 2, { width: CW - 74 });
    y = Math.max(y + 70, pdf.y + 6);
  }
  if (doc.signedNote) {
    pdf.font('R').fontSize(7.8).fillColor(INK2).text('PDF signé électroniquement par ' + (doc.company.name || 'l’atelier') + ' le ' + new Date(doc.signedAt || Date.now()).toLocaleDateString('fr-TN') + ' : toute modification du fichier invalide la signature (panneau Signatures d’Adobe Reader).', L, y, { width: CW });
    y = pdf.y + 4;
  }

  // Pied de page (sur chaque page)
  const range = pdf.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    pdf.switchToPage(i);
    pdf.page.margins.bottom = 0;
    const fy = pdf.page.height - 62;
    pdf.moveTo(L, fy).lineTo(Rr, fy).lineWidth(0.5).strokeColor(LINE).stroke();
    pdf.font('R').fontSize(7.8).fillColor(INK2);
    const bank = [co.bank, co.rib ? 'RIB : ' + co.rib : ''].filter(Boolean).join('  ·  ');
    pdf.text([co.name, co.mf ? 'MF ' + co.mf : '', bank].filter(Boolean).join('  ·  '), L, fy + 8, { width: CW, align: 'center', lineBreak: true });
    pdf.text(`Page ${i - range.start + 1} / ${range.count}`, L, fy + 32, { width: CW, align: 'center' });
  }
  pdf.end();
  return done;
}


/* ---------- Rapport mensuel ---------- */
function renderRapport(R) {
  if (!PDFDocument) throw new Error('Module pdfkit absent.');
  const pdf = new PDFDocument({ size: 'A4', margin: 48, bufferPages: true, info: { Title: 'Rapport ' + R.title, Author: R.company.brand || 'FAZA 3D' } });
  const Rf = path.join(FONT_DIR, 'Inter-Regular.otf'), Bf = path.join(FONT_DIR, 'Inter-SemiBold.otf');
  if (fs.existsSync(Rf) && fs.existsSync(Bf)) { pdf.registerFont('R', Rf); pdf.registerFont('B', Bf); } else { pdf.registerFont('R', 'Helvetica'); pdf.registerFont('B', 'Helvetica-Bold'); }
  const chunks = []; pdf.on('data', c => chunks.push(c));
  const done = new Promise(ok => pdf.on('end', () => ok(Buffer.concat(chunks))));
  const W = pdf.page.width, L = 48, Rr = W - 48, CW = Rr - L;
  let y = 44;
  const ensure = (h) => { if (y + h > pdf.page.height - 70) { pdf.addPage(); y = 48; } };
  const h1 = (t) => { ensure(40); pdf.font('B').fontSize(13).fillColor(TEAL).text(t, L, y, { width: CW }); y = pdf.y + 6; };
  const p = (t, size = 9.5, color = INK) => { ensure(20); pdf.font('R').fontSize(size).fillColor(color).text(t, L, y, { width: CW }); y = pdf.y + 4; };
  const table = (cols, rows) => {
    const widths = cols.map(c => c.w * CW);
    ensure(24);
    pdf.rect(L, y, CW, 18).fill(INK); let x = L; pdf.font('B').fontSize(8.2).fillColor('#FFFFFF');
    cols.forEach((c, i) => { pdf.text(c.h, x + 6, y + 5, { width: widths[i] - 12, align: c.a || 'left' }); x += widths[i]; }); y += 18;
    pdf.font('R').fontSize(8.8).fillColor(INK);
    rows.forEach((r, ri) => {
      const hh = Math.max(16, ...r.map((v, i) => pdf.heightOfString(String(v ?? ''), { width: widths[i] - 12 }) + 6));
      ensure(hh);
      if (ri % 2) pdf.rect(L, y, CW, hh).fill('#F7FAF9');
      pdf.fillColor(INK); x = L;
      r.forEach((v, i) => { pdf.text(String(v ?? ''), x + 6, y + 3, { width: widths[i] - 12, align: cols[i].a || 'left' }); x += widths[i]; }); y += hh;
    });
    if (!rows.length) { pdf.font('R').fontSize(8.8).fillColor(INK2).text('Rien sur la période.', L + 6, y + 3); y += 16; }
    y += 8;
  };
  const kpis = (items) => {
    ensure(60); const n = items.length, w = (CW - 8 * (n - 1)) / n;
    items.forEach((k, i) => { const x = L + i * (w + 8); pdf.roundedRect(x, y, w, 46, 5).fill(SOFT); pdf.font('B').fontSize(14).fillColor(INK).text(k.v, x + 8, y + 7, { width: w - 16 }); pdf.font('R').fontSize(7.8).fillColor(INK2).text(k.l, x + 8, y + 27, { width: w - 16 }); });
    y += 56;
  };
  pdf.rect(0, 0, W, 6).fill(TEAL);
  pdf.font('B').fontSize(20).fillColor(INK).text((R.company.brand || 'FAZA 3D') + ' : rapport mensuel', L, y); y = pdf.y + 2;
  pdf.font('R').fontSize(10).fillColor(INK2).text(R.title + ' · généré le ' + dateFR(Date.now()), L, y); y = pdf.y + 14;
  for (const sec of R.sections) {
    if (sec.h1) h1(sec.h1);
    if (sec.kpis) kpis(sec.kpis);
    if (sec.p) for (const t of [].concat(sec.p)) p(t);
    if (sec.table) table(sec.table.cols, sec.table.rows);
  }
  const range = pdf.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    pdf.switchToPage(i); pdf.page.margins.bottom = 0;
    pdf.font('R').fontSize(7.8).fillColor(INK2).text(`${R.company.name || ''} · document interne · page ${i - range.start + 1} / ${range.count}`, L, pdf.page.height - 40, { width: CW, align: 'center' });
  }
  pdf.end();
  return done;
}

module.exports = { render, renderRapport, totals, fmt, montantEnLettres, enLettres };
