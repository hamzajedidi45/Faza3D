'use strict';
// Rapport mensuel : chiffres du mois à partir de la base, puis PDF (lib/pdf.js)
const fs = require('fs');
const path = require('path');
const pdf = require('./pdf');
const xlsx = require('./xlsx');

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const STAGE = { cmd: 'Commande reçue', cao: 'Conception', val: 'Validation client', prod: 'Impression / laser', fin: 'Finition', qc: 'Contrôle qualité', pack: 'Emballage', done: 'Livré' };
const PLAN2027 = [2500, 3500, 4000, 4500, 6000, 8000, 6500, 4000, 5500, 6000, 6500, 8500];
const planFor = (y, m) => PLAN2027[m] * (y <= 2027 ? 1 : y === 2028 ? 1.4 : 1.75);
const stageOf = (o) => o.hist && o.hist.length ? o.hist[o.hist.length - 1].stage : 'cmd';
const enteredAt = (o) => o.hist && o.hist.length ? o.hist[o.hist.length - 1].at : o.created;
const paidOf = (o) => (o.payments || []).reduce((a, p) => a + (+p.amount || 0), 0);
const f0 = (n) => pdf.fmt(n, 0), f3 = (n) => pdf.fmt(n, 3);
const D = 864e5;

// Données du mois (y, m = 0..11)
function monthData(base, y, m, printersHours) {
  const a = new Date(y, m, 1).getTime(), b = new Date(y, m + 1, 1).getTime();
  const inM = (t) => t >= a && t < b;
  const params = base.setting('params', {}) || {};
  const vat = +(params.rates && params.rates.vat) || 19;
  const ht = (o) => (+o.price || 0) / (1 + vat / 100);
  const orders = base.all('orders'), clients = base.all('clients'), leads = base.all('leads'), quotes = base.all('quotes');
  const expenses = base.all('expenses'), stock = base.all('stock'), social = base.all('social'), failures = base.all('failures');

  const delivered = orders.filter(o => stageOf(o) === 'done' && inM(enteredAt(o)));
  const ca = delivered.reduce((s, o) => s + ht(o), 0);
  const invoiced = orders.filter(o => o.invoice && inM(o.invoice.at));
  const caFact = invoiced.reduce((s, o) => s + ht(o), 0) - orders.filter(o => o.creditNote && inM(o.creditNote.at)).reduce((s, o) => s + (+o.creditNote.amount || 0) / (1 + vat / 100), 0);
  const payments = orders.flatMap(o => (o.payments || []).map(p => ({ ...p, o }))).filter(p => inM(p.at));
  const encaisse = payments.filter(p => p.mode !== 'Retenue à la source').reduce((s, p) => s + (+p.amount || 0), 0);
  const retenue = payments.filter(p => p.mode === 'Retenue à la source').reduce((s, p) => s + (+p.amount || 0), 0);
  const dueAll = orders.reduce((s, o) => s + Math.max(0, (+o.price || 0) - paidOf(o)), 0);
  const exp = expenses.filter(e => inM(e.at));
  const byCat = {}; for (const e of exp) byCat[e.category || 'Autre'] = (byCat[e.category || 'Autre'] || 0) + (+e.amount || 0);
  const expTotal = exp.reduce((s, e) => s + (+e.amount || 0), 0);
  const expHT = exp.reduce((s, e) => s + (+e.amount || 0) / (1 + (+e.vat || 0) / 100), 0);
  const expPaid = exp.filter(e => e.paid).reduce((s, e) => s + (+e.amount || 0), 0);
  const result = ca - expHT;
  const newOrders = orders.filter(o => inM(o.created));
  const late = delivered.filter(o => enteredAt(o) > o.due).length;
  const otd = delivered.length ? Math.round((delivered.length - late) / delivered.length * 100) : null;
  const topClients = Object.entries(delivered.reduce((acc, o) => { acc[o.client] = (acc[o.client] || 0) + ht(o); return acc; }, {})).sort((x, y2) => y2[1] - x[1]).slice(0, 5);
  const newLeads = leads.filter(l => inM(l.created));
  const bySrc = {}; for (const l of newLeads) { const k = l.source || 'Non renseignée'; bySrc[k] = bySrc[k] || { n: 0, won: 0 }; bySrc[k].n++; if (l.stage === 'gagne') bySrc[k].won++; }
  const won = leads.filter(l => l.closedAt && inM(l.closedAt) && l.stage === 'gagne').length, lost = leads.filter(l => l.closedAt && inM(l.closedAt) && l.stage === 'perdu').length;
  const qSent = quotes.filter(q => q.sentAt && inM(q.sentAt)), qAcc = quotes.filter(q => q.acceptedAt ? inM(q.acceptedAt) : (q.status === 'accepte' && q.sentAt && inM(q.sentAt)));
  const socialRows = ['instagram', 'facebook', 'tiktok'].map(n => {
    const recs = social.filter(s => s.network === n && s.followers != null).sort((x, y2) => x.day.localeCompare(y2.day));
    const end = recs.filter(s => new Date(s.day) < new Date(b)).slice(-1)[0], start = recs.filter(s => new Date(s.day) < new Date(a)).slice(-1)[0] || recs.filter(s => new Date(s.day) >= new Date(a)).slice(0, 1)[0];
    return { n, start: start ? start.followers : null, end: end ? end.followers : null };
  });
  const lowStock = stock.filter(s => +s.qty <= +s.min);
  const fails = failures.filter(x => inM(x.at));
  const plan = planFor(y, m);
  return { y, m, a, b, vat, ca, caFact, plan, encaisse, retenue, dueAll, expTotal, expHT, expPaid, byCat, result, delivered, newOrders, otd, late, topClients, newLeads, bySrc, won, lost, qSent, qAcc, socialRows, lowStock, fails, printersHours: printersHours || {}, params };
}

function buildSections(d) {
  const brand = d.params.company || {};
  const sections = [];
  sections.push({ h1: 'Résultat du mois', kpis: [
    { v: f0(d.ca) + ' DT', l: 'CA HT livré' }, { v: Math.round(d.ca / d.plan * 100) + ' %', l: 'du plan (' + f0(d.plan) + ' DT)' },
    { v: f0(d.expHT) + ' DT', l: 'dépenses HT' }, { v: (d.result >= 0 ? '+' : '') + f0(d.result) + ' DT', l: 'résultat avant impôts (approx.)' }, { v: f0(d.encaisse) + ' DT', l: 'encaissé' }],
    p: [`Commandes livrées : ${d.delivered.length} · nouvelles commandes : ${d.newOrders.length} · livrées à l'heure : ${d.otd != null ? d.otd + ' %' : '—'}${d.late ? ' (' + d.late + ' en retard)' : ''}.`,
        `CA facturé HT (factures moins avoirs) : ${f0(d.caFact)} DT · retenue à la source subie : ${f3(d.retenue)} DT · reste à encaisser toutes commandes : ${f0(d.dueAll)} DT TTC.`] });
  sections.push({ h1: 'Dépenses par catégorie', table: { cols: [{ h: 'Catégorie', w: .6 }, { h: 'Montant TTC', w: .4, a: 'right' }], rows: Object.entries(d.byCat).sort((x, y) => y[1] - x[1]).map(([k, v]) => [k, f3(v) + ' DT']) } });
  sections.push({ h1: 'Meilleurs clients du mois', table: { cols: [{ h: 'Client', w: .6 }, { h: 'CA HT', w: .4, a: 'right' }], rows: d.topClients.map(([c, v]) => [c, f0(v) + ' DT']) } });
  sections.push({ h1: 'Demandes et prospection', kpis: [{ v: String(d.newLeads.length), l: 'nouvelles demandes et prospects' }, { v: String(d.won), l: 'gagnés' }, { v: String(d.lost), l: 'perdus' }, { v: `${d.qSent.length} / ${d.qAcc.length}`, l: 'devis envoyés / acceptés' }],
    table: { cols: [{ h: 'Origine', w: .5 }, { h: 'Demandes', w: .25, a: 'right' }, { h: 'Gagnées', w: .25, a: 'right' }], rows: Object.entries(d.bySrc).sort((x, y) => y[1].n - x[1].n).map(([k, v]) => [k, v.n, v.won]) } });
  sections.push({ h1: 'Réseaux sociaux', table: { cols: [{ h: 'Réseau', w: .4 }, { h: 'Début du mois', w: .2, a: 'right' }, { h: 'Fin du mois', w: .2, a: 'right' }, { h: 'Évolution', w: .2, a: 'right' }],
    rows: d.socialRows.filter(r => r.end != null).map(r => [{ instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok' }[r.n], r.start != null ? f0(r.start) : '—', f0(r.end), r.start != null ? (r.end - r.start >= 0 ? '+' : '') + f0(r.end - r.start) : '—']) } });
  sections.push({ h1: 'Atelier', p: [`Échecs d'impression : ${d.fails.length} (${f0(d.fails.reduce((s, x) => s + (+x.g || 0), 0))} g de filament et ${pdf.fmt(d.fails.reduce((s, x) => s + (+x.h || 0), 0), 1)} h perdus).`,
    Object.keys(d.printersHours).length ? 'Heures d\'impression cumulées : ' + Object.entries(d.printersHours).map(([k, v]) => `${k} ${pdf.fmt(v, 0)} h`).join(', ') + '.' : 'Heures d\'impression : imprimantes non reliées.',
    d.lowStock.length ? 'Stock sous le seuil : ' + d.lowStock.map(s => s.name).join(', ') + '.' : 'Stock : aucune matière sous le seuil.'] });
  sections.push({ h1: 'À retenir', p: [
    d.ca >= d.plan ? 'Objectif du plan atteint ce mois-ci.' : `Il manque ${f0(d.plan - d.ca)} DT pour atteindre le plan : intensifier la prospection du segment qui rapporte le plus (voir Réseaux).`,
    d.dueAll > 0 ? `Relancer les ${f0(d.dueAll)} DT restant à encaisser.` : 'Tout est encaissé.',
    d.otd != null && d.otd < 90 ? 'Moins de 90 % de livraisons à l\'heure : revoir le planning et le goulot dans Flux.' : 'Délais tenus.',
    'Chiffres indicatifs calculés par la plateforme ; la comptabilité officielle reste celle du comptable.'] });
  return { title: `${MONTHS[d.m]} ${d.y}`, company: brand, sections };
}

async function generate(base, dir, y, m, printersHours) {
  const d = monthData(base, y, m, printersHours);
  const buf = await pdf.renderRapport(buildSections(d));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const name = `rapport-${y}-${String(m + 1).padStart(2, '0')}.pdf`;
  fs.writeFileSync(path.join(dir, name), buf);
  return { name, buf, data: d };
}
function list(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => /^rapport-\d{4}-\d{2}\.pdf$/.test(f)).sort().reverse().map(f => ({ name: f, size: fs.statSync(path.join(dir, f)).size, at: fs.statSync(path.join(dir, f)).mtimeMs }));
}


/* ---------- Classeur Excel du mois ---------- */
const STAGE_FR = (id) => STAGE[id] || id || '';
function monthWorkbook(base, y, m) {
  const a = new Date(y, m, 1).getTime(), b = new Date(y, m + 1, 1).getTime(), inM = (t) => t >= a && t < b;
  const params = base.setting('params', {}) || {}; const vat = +(params.rates && params.rates.vat) || 19;
  const orders = base.all('orders'), clients = base.all('clients'), expenses = base.all('expenses'), quotes = base.all('quotes'), leads = base.all('leads');
  const purchases = base.all('purchases'), stock = base.all('stock'), failures = base.all('failures'), maint = base.all('maintenance'), social = base.all('social'), tasks = base.all('tasks');
  const d = monthData(base, y, m);
  const cname = (id) => (clients.find(c => c.id === id) || {}).name || '';
  const sheets = [
    { name: 'Résumé', cols: [{ h: 'Indicateur', key: 'k', w: 44 }, { h: 'Valeur', key: 'v', type: 'money', w: 18 }], rows: [
      { k: 'Mois', v: null, t: `${MONTHS[m]} ${y}` }, { k: 'CA HT livré (DT)', v: d.ca }, { k: 'CA prévu au plan (DT)', v: d.plan }, { k: 'CA facturé HT, factures moins avoirs (DT)', v: d.caFact },
      { k: 'Encaissé (DT)', v: d.encaisse }, { k: 'Retenue à la source subie (DT)', v: d.retenue }, { k: 'Dépenses TTC (DT)', v: d.expTotal }, { k: 'Dépenses HT (DT)', v: d.expHT }, { k: 'Dépenses payées TTC (DT)', v: d.expPaid },
      { k: 'Résultat avant impôts, approx. (DT)', v: d.result }, { k: 'Reste à encaisser, toutes commandes TTC (DT)', v: d.dueAll }, { k: 'Commandes livrées', v: d.delivered.length }, { k: 'Nouvelles commandes', v: d.newOrders.length },
      { k: 'Livrées à l\'heure (%)', v: d.otd }, { k: 'Nouvelles demandes et prospects', v: d.newLeads.length }, { k: 'Demandes gagnées', v: d.won }, { k: 'Devis envoyés', v: d.qSent.length }, { k: 'Devis acceptés', v: d.qAcc.length }] },
    { name: 'Commandes', cols: [{ h: 'N°', key: 'id', w: 10 }, { h: 'Client', key: 'client', w: 26 }, { h: 'Produit', key: 'product', w: 30 }, { h: 'Qté', key: 'qty', type: 'num', w: 8 }, { h: 'Procédé', key: 'proc', w: 10 }, { h: 'Imprimante', key: 'printer', w: 12 }, { h: 'Étape', key: o => STAGE_FR(stageOf(o)), w: 18 }, { h: 'Créée le', key: 'created', type: 'date', w: 17 }, { h: 'Date promise', key: 'due', type: 'date', w: 17 }, { h: 'Livrée le', key: o => stageOf(o) === 'done' ? enteredAt(o) : null, type: 'date', w: 17 }, { h: 'Prix TTC', key: 'price', type: 'money', w: 12 }, { h: 'Prix HT', key: o => o.price ? (+o.price) / (1 + vat / 100) : null, type: 'money', w: 12 }, { h: 'Payé', key: o => paidOf(o), type: 'money', w: 12 }, { h: 'Reste', key: o => Math.max(0, (+o.price || 0) - paidOf(o)), type: 'money', w: 12 }, { h: 'Facture', key: o => o.invoice && o.invoice.no, w: 16 }, { h: 'Avoir', key: o => o.creditNote && o.creditNote.no, w: 14 }, { h: 'Devis', key: 'quoteNo', w: 14 }, { h: 'Origine', key: 'source', w: 14 }, { h: 'Notes', key: 'notes', w: 30 }],
      rows: orders.filter(o => inM(o.created) || (stageOf(o) === 'done' && inM(enteredAt(o))) || (o.invoice && inM(o.invoice.at)) || stageOf(o) !== 'done').sort((x, y2) => (x.created || 0) - (y2.created || 0)) },
    { name: 'Paiements', cols: [{ h: 'Date', key: 'at', type: 'date', w: 17 }, { h: 'Commande', key: 'id', w: 10 }, { h: 'Client', key: 'client', w: 26 }, { h: 'Mode', key: 'mode', w: 20 }, { h: 'Montant', key: 'amount', type: 'money', w: 12 }, { h: 'Facture', key: 'inv', w: 16 }, { h: 'Saisi par', key: 'by', w: 12 }],
      rows: orders.flatMap(o => (o.payments || []).filter(p => inM(p.at)).map(p => ({ at: p.at, id: o.id, client: o.client, mode: p.mode, amount: p.amount, inv: o.invoice && o.invoice.no, by: p.by }))).sort((x, y2) => x.at - y2.at) },
    { name: 'Factures et avoirs', cols: [{ h: 'Type', key: 'type', w: 10 }, { h: 'Numéro', key: 'no', w: 16 }, { h: 'Date', key: 'at', type: 'date', w: 17 }, { h: 'Client', key: 'client', w: 26 }, { h: 'Matricule fiscal client', key: 'mf', w: 18 }, { h: 'Commande', key: 'id', w: 10 }, { h: 'HT', key: 'ht', type: 'money', w: 12 }, { h: 'TVA', key: 'tva', type: 'money', w: 12 }, { h: 'Timbre', key: 'timbre', type: 'money', w: 10 }, { h: 'TTC', key: 'ttc', type: 'money', w: 12 }, { h: 'Motif', key: 'reason', w: 30 }],
      rows: [...orders.filter(o => o.invoice && inM(o.invoice.at)).map(o => { const ttc = +o.price || 0, ht = ttc / (1 + vat / 100), tb = +(params.rates && params.rates.timbre) || 0; return { type: 'Facture', no: o.invoice.no, at: o.invoice.at, client: o.client, mf: (clients.find(c => c.id === o.clientId) || {}).mf, id: o.id, ht, tva: ttc - ht, timbre: tb, ttc: ttc + tb }; }),
             ...orders.filter(o => o.creditNote && inM(o.creditNote.at)).map(o => { const ttc = -(+o.creditNote.amount || 0), ht = ttc / (1 + vat / 100); return { type: 'Avoir', no: o.creditNote.no, at: o.creditNote.at, client: o.client, mf: (clients.find(c => c.id === o.clientId) || {}).mf, id: o.id, ht, tva: ttc - ht, timbre: 0, ttc, reason: o.creditNote.reason }; })].sort((x, y2) => x.at - y2.at) },
    { name: 'Dépenses', cols: [{ h: 'Date', key: 'at', type: 'date', w: 17 }, { h: 'Catégorie', key: 'category', w: 28 }, { h: 'Libellé', key: 'label', w: 32 }, { h: 'Fournisseur', key: 'supplier', w: 18 }, { h: 'TTC', key: 'amount', type: 'money', w: 12 }, { h: 'TVA %', key: 'vat', type: 'num', w: 8 }, { h: 'HT', key: e => (+e.amount || 0) / (1 + (+e.vat || 0) / 100), type: 'money', w: 12 }, { h: 'Payée', key: 'paid', w: 8 }, { h: 'Mode', key: 'mode', w: 14 }, { h: 'Bon de commande', key: 'purchaseId', w: 14 }, { h: 'Notes', key: 'notes', w: 28 }], rows: expenses.filter(e => inM(e.at)).sort((x, y2) => x.at - y2.at) },
    { name: 'Devis', cols: [{ h: 'Numéro', key: 'no', w: 14 }, { h: 'Date', key: 'at', type: 'date', w: 17 }, { h: 'Client', key: 'client', w: 26 }, { h: 'Contenu', key: q => (q.lines || []).map(l => `${l.label} × ${l.qty}`).join(' ; '), w: 40 }, { h: 'Total HT', key: 'totalHT', type: 'money', w: 12 }, { h: 'Total TTC', key: 'totalTTC', type: 'money', w: 12 }, { h: 'Statut', key: 'status', w: 10 }, { h: 'Envoyé le', key: 'sentAt', type: 'date', w: 17 }, { h: 'Accepté le', key: 'acceptedAt', type: 'date', w: 17 }, { h: 'Accepté par', key: 'acceptedBy', w: 18 }, { h: 'Commande', key: 'orderId', w: 10 }], rows: quotes.filter(q => inM(q.at) || (q.sentAt && inM(q.sentAt)) || (q.acceptedAt && inM(q.acceptedAt))).sort((x, y2) => (x.at || 0) - (y2.at || 0)) },
    { name: 'Demandes', cols: [{ h: 'Créée le', key: 'created', type: 'date', w: 17 }, { h: 'Nom', key: 'name', w: 22 }, { h: 'Entreprise', key: 'company', w: 22 }, { h: 'Segment', key: 'segment', w: 24 }, { h: 'Origine', key: 'source', w: 14 }, { h: 'Étape', key: 'stage', w: 12 }, { h: 'Valeur', key: 'value', type: 'money', w: 10 }, { h: 'Suivi par', key: 'assignee', w: 12 }, { h: 'Téléphone', key: 'phone', w: 14 }, { h: 'E-mail', key: 'email', w: 22 }, { h: 'Clôturée le', key: 'closedAt', type: 'date', w: 17 }, { h: 'Commande', key: 'orderId', w: 10 }, { h: 'Notes', key: 'notes', w: 30 }], rows: leads.filter(l => inM(l.created) || (l.closedAt && inM(l.closedAt)) || !['gagne', 'perdu'].includes(l.stage)).sort((x, y2) => (x.created || 0) - (y2.created || 0)) },
    { name: 'Clients', cols: [{ h: 'Nom', key: 'name', w: 26 }, { h: 'Type', key: 'kind', w: 20 }, { h: 'Téléphone', key: 'phone', w: 14 }, { h: 'E-mail', key: 'email', w: 24 }, { h: 'Matricule fiscal', key: 'mf', w: 18 }, { h: 'Adresse', key: 'address', w: 26 }, { h: 'Origine', key: 'source', w: 14 }, { h: 'Événement', key: 'event', w: 20 }, { h: 'Mois', key: 'month', type: 'num', w: 6 }, { h: 'Commandes (total)', key: c => orders.filter(o => o.clientId === c.id).length, type: 'num', w: 10 }, { h: 'CA TTC (total)', key: c => orders.filter(o => o.clientId === c.id).reduce((s, o) => s + (+o.price || 0), 0), type: 'money', w: 12 }], rows: clients.sort((x, y2) => String(x.name).localeCompare(String(y2.name))) },
    { name: 'Achats', cols: [{ h: 'Numéro', key: 'no', w: 14 }, { h: 'Date', key: 'at', type: 'date', w: 17 }, { h: 'Fournisseur', key: a => (a.supplier || {}).name, w: 20 }, { h: 'Contenu', key: a => (a.lines || []).map(l => `${l.label} × ${l.qty} ${l.unit || ''}`).join(' ; '), w: 40 }, { h: 'Total HT', key: 'total', type: 'money', w: 12 }, { h: 'Statut', key: 'status', w: 10 }, { h: 'Reçu le', key: 'receivedAt', type: 'date', w: 17 }], rows: purchases.filter(a => inM(a.at) || (a.receivedAt && inM(a.receivedAt))) },
    { name: 'Stock', cols: [{ h: 'Matière', key: 'name', w: 28 }, { h: 'Type', key: 'kind', w: 10 }, { h: 'Quantité', key: 'qty', type: 'num', w: 12 }, { h: 'Unité', key: s2 => s2.kind === 'fil' ? 'g' : s2.kind === 'plaque' ? 'm²' : 'u.', w: 8 }, { h: 'Seuil', key: 'min', type: 'num', w: 10 }, { h: 'Sous le seuil', key: s2 => +s2.qty <= +s2.min, w: 12 }], rows: stock },
    { name: 'Échecs et entretien', cols: [{ h: 'Type', key: 'type', w: 10 }, { h: 'Date', key: 'at', type: 'date', w: 17 }, { h: 'Machine', key: 'machine', w: 14 }, { h: 'Détail', key: 'detail', w: 40 }, { h: 'Filament perdu (g)', key: 'g', type: 'num', w: 12 }, { h: 'Heures perdues', key: 'h', type: 'num', w: 12 }, { h: 'Coût (DT)', key: 'cost', type: 'money', w: 10 }, { h: 'Par', key: 'by', w: 12 }],
      rows: [...failures.filter(f => inM(f.at)).map(f => ({ type: 'Échec', at: f.at, machine: f.printer, detail: f.cause + (f.order ? ' · ' + f.order : ''), g: f.g, h: f.h, by: f.by })), ...maint.filter(x => inM(x.at)).map(x => ({ type: 'Entretien', at: x.at, machine: x.machine, detail: x.task + (x.notes ? ' · ' + x.notes : ''), cost: x.cost, by: x.by }))].sort((x, y2) => x.at - y2.at) },
    { name: 'Réseaux', cols: [{ h: 'Réseau', key: 'network', w: 12 }, { h: 'Jour', key: 'day', w: 12 }, { h: 'Abonnés', key: 'followers', type: 'num', w: 10 }, { h: 'Portée', key: 'reach', type: 'num', w: 10 }, { h: 'Vues', key: 'views', type: 'num', w: 10 }, { h: 'Interactions', key: 'engagement', type: 'num', w: 12 }, { h: 'Automatique', key: s2 => !!s2.auto, w: 10 }], rows: social.filter(s2 => s2.day && s2.day.startsWith(`${y}-${String(m + 1).padStart(2, '0')}`)).sort((x, y2) => x.day.localeCompare(y2.day)) },
    { name: 'Tâches', cols: [{ h: 'Date', key: 'date', w: 12 }, { h: 'Heure', key: 'time', w: 8 }, { h: 'Pour', key: 'assignee', w: 12 }, { h: 'Type', key: 'kind', w: 12 }, { h: 'Tâche', key: 'title', w: 40 }, { h: 'Faite', key: t => t.status === 'done', w: 8 }, { h: 'Faite par', key: 'doneBy', w: 12 }], rows: tasks.filter(t => t.date && t.date.startsWith(`${y}-${String(m + 1).padStart(2, '0')}`)).sort((x, y2) => (x.date + x.time).localeCompare(y2.date + y2.time)) },
  ];
  sheets[0].cols.push({ h: 'Détail', key: 't', w: 24 });
  return xlsx.workbook(sheets);
}
function generateExcel(base, dir, y, m) {
  const buf = monthWorkbook(base, y, m);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const name = `donnees-${y}-${String(m + 1).padStart(2, '0')}.xlsx`;
  fs.writeFileSync(path.join(dir, name), buf);
  return { name, buf };
}
function listAll(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => /^(rapport|donnees)-\d{4}-\d{2}\.(pdf|xlsx)$/.test(f)).sort().reverse().map(f => ({ name: f, size: fs.statSync(path.join(dir, f)).size, at: fs.statSync(path.join(dir, f)).mtimeMs }));
}

module.exports = { monthData, buildSections, generate, generateExcel, monthWorkbook, list: listAll, MONTHS };
