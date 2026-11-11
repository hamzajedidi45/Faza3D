// Modèles des messages automatiques (WhatsApp, e-mails). Un seul fichier pour la plateforme et le serveur.
// Chaque modèle se modifie dans Paramètres › Modèles de messages ; les {variables} sont remplacées à l'envoi.
// Une variable « phrase » ({reste_phrase}, {lien_phrase}, {paiement}) est vide quand l'information manque : pas de texte à trous.
(function (root) {
  'use strict';
  const G = { devis: 'Devis', commande: 'Commandes', relance: 'Relances automatiques', avis: 'Avis Google', prospection: 'Prospection' };
  const MODELES = {
    devis_mail_objet: { g: 'devis', label: 'E-mail du devis — objet', vars: ['devis', 'societe'], text: 'Devis {devis} · {societe}' },
    devis_mail: { g: 'devis', label: 'E-mail du devis — texte (le PDF est joint)', vars: ['client', 'devis', 'total', 'delai_phrase', 'signataire', 'societe', 'telephone'],
      text: 'Bonjour {client},\n\nVeuillez trouver ci-joint notre devis {devis} d’un montant de {total} TND TTC{delai_phrase}.\n\nNous restons à votre disposition pour toute question.\n\nCordialement,\n{signataire}\n{societe}\n{telephone}' },
    devis_wa: { g: 'devis', label: 'WhatsApp — envoi du devis', vars: ['client', 'devis', 'lignes', 'total', 'delai_phrase', 'lien_phrase', 'societe'],
      text: 'Bonjour {client}, voici notre devis {devis} : {lignes}. Total {total} TND TTC{delai_phrase}.{lien_phrase} {societe}' },
    facture_mail_objet: { g: 'commande', label: 'E-mail de la facture — objet', vars: ['facture', 'societe'], text: 'Facture {facture} · {societe}' },
    facture_mail: { g: 'commande', label: 'E-mail de la facture — texte (le PDF est joint)', vars: ['client', 'facture', 'produit', 'societe', 'telephone'],
      text: 'Bonjour {client},\n\nVeuillez trouver ci-joint la facture {facture} pour votre commande « {produit} ».\n\nMerci de votre confiance.\n{societe}\n{telephone}' },
    prete_wa: { g: 'commande', label: 'WhatsApp — commande prête', vars: ['client', 'produit', 'commande', 'societe', 'reste_phrase'],
      text: 'Bonjour {client}, votre commande « {produit} » ({commande}) est prête chez {societe}.{reste_phrase} Merci de votre confiance !' },
    impaye_wa: { g: 'commande', label: 'WhatsApp — rappel de solde (bouton du tableau de bord)', vars: ['client', 'societe', 'reste', 'commande', 'produit'],
      text: 'Bonjour {client}, c’est {societe}. Petit rappel : il reste {reste} TND à régler pour la commande {commande} ({produit}). Vous pouvez payer par D17, virement ou en espèces à l’atelier. Merci !' },
    relance_devis_wa: { g: 'relance', label: 'Relance devis (J+3, J+7) — WhatsApp', vars: ['client', 'societe', 'devis', 'total_phrase', 'jours', 'lien_phrase'],
      text: 'Bonjour {client}, c’est {societe}. Avez-vous pu regarder notre devis {devis}{total_phrase} ? S’il y a un point à ajuster (quantité, délai, budget), dites-le-nous, on s’adapte.{lien_phrase} Merci !' },
    relance_devis_mail_objet: { g: 'relance', label: 'Relance devis — e-mail, objet', vars: ['societe', 'devis'], text: '{societe} : votre devis {devis}' },
    relance_devis_mail: { g: 'relance', label: 'Relance devis — e-mail, texte', vars: ['client', 'societe', 'devis', 'total_phrase', 'jours', 'lien_phrase', 'telephone'],
      text: 'Bonjour {client},\n\nNous revenons vers vous au sujet de notre devis {devis}{total_phrase} envoyé il y a {jours} jours.\n\nAvez-vous pu le consulter ? Si un point mérite d’être ajusté (quantité, délai, budget), nous nous adaptons volontiers.{lien_phrase}\n\nBien cordialement,\n{societe} · {telephone}' },
    relance_impaye_wa: { g: 'relance', label: 'Relance impayé (tous les 15 jours) — WhatsApp', vars: ['client', 'societe', 'reste', 'commande', 'produit', 'jours', 'paiement'],
      text: 'Bonjour {client}, c’est {societe}. Petit rappel : il reste {reste} TND à régler pour la commande {commande} ({produit}), livrée il y a {jours} jours.{paiement} Ou en espèces à l’atelier. Merci beaucoup !' },
    relance_impaye_mail_objet: { g: 'relance', label: 'Relance impayé — e-mail, objet', vars: ['societe', 'commande'], text: '{societe} : solde de la commande {commande}' },
    relance_impaye_mail: { g: 'relance', label: 'Relance impayé — e-mail, texte', vars: ['client', 'societe', 'reste', 'commande', 'produit', 'jours', 'paiement', 'telephone'],
      text: 'Bonjour {client},\n\nSauf erreur de notre part, il reste {reste} TND à régler pour la commande {commande} ({produit}), livrée il y a {jours} jours.{paiement}\nOu en espèces à l’atelier.\n\nMerci de votre confiance,\n{societe} · {telephone}' },
    avis_wa: { g: 'avis', label: 'Demande d’avis Google — WhatsApp', vars: ['client', 'societe', 'produit', 'commande', 'lien_avis'],
      text: 'Bonjour {client}, c’est {societe}. Merci pour votre commande ({produit}) ! Si vous êtes satisfait, un avis Google de 30 secondes nous aide énormément : {lien_avis} Et si quelque chose n’allait pas, dites-le-nous d’abord, on corrige. Merci !' },
    avis_mail_objet: { g: 'avis', label: 'Demande d’avis — e-mail, objet', vars: ['societe'], text: '{societe} : votre avis compte' },
    avis_mail: { g: 'avis', label: 'Demande d’avis — e-mail, texte', vars: ['client', 'societe', 'produit', 'commande', 'lien_avis', 'telephone'],
      text: 'Bonjour {client},\n\nMerci pour votre commande ({produit}, {commande}).\n\nSi vous êtes satisfait, un avis Google de 30 secondes nous aide énormément à faire connaître l’atelier :\n{lien_avis}\n\nEt si quelque chose n’allait pas, répondez simplement à cet e-mail : on corrige.\n\nMerci de votre confiance,\n{societe} · {telephone}' },
    premier_contact_wa: { g: 'prospection', label: 'WhatsApp — premier contact (fiche demande)', vars: ['prenom', 'societe'],
      text: 'Bonjour {prenom}, ici {societe} (impression 3D et découpe laser). ' },
    evenement_wa: { g: 'prospection', label: 'WhatsApp — événement du client qui approche', vars: ['client', 'societe', 'evenement'],
      text: 'Bonjour {client}, ici {societe}. Votre {evenement} approche : nous pouvons préparer vos trophées, plaques ou cadeaux sur mesure. Souhaitez-vous un devis ?' },
    retour_wa: { g: 'prospection', label: 'WhatsApp — client à rappeler (sans commande depuis longtemps)', vars: ['client', 'societe'],
      text: 'Bonjour {client}, c’est {societe}. Ça fait un moment ! Nous avons de nouvelles réalisations (trophées, plaques gravées, cadeaux personnalisés). Dites-nous si vous avez un projet, on vous prépare un devis gratuit.' },
    anniversaire_wa: { g: 'prospection', label: 'WhatsApp — commande de l’an dernier à renouveler', vars: ['client', 'societe', 'produit'],
      text: 'Bonjour {client}, c’est {societe}. Il y a un an, nous réalisions {produit} pour vous. On renouvelle cette année ? On vous garde le même prix.' }
  };
  const VARS = { client: 'nom du client', prenom: 'prénom du contact', societe: 'nom de l’atelier', telephone: 'téléphone de l’atelier', signataire: 'votre nom', devis: 'numéro du devis', commande: 'numéro de la commande', facture: 'numéro de la facture', produit: 'produit commandé', lignes: 'lignes du devis (« Trophée × 20, Plaque × 2 »)', total: 'total TTC', total_phrase: '« (450 TND TTC) » ou rien', reste: 'reste à payer (TND)', reste_phrase: '« Reste à payer : 120 TND. » ou rien', delai_phrase: '« , réalisable en 5 jours » ou rien', lien_phrase: 'phrase avec le lien d’acceptation, ou rien', lien_avis: 'lien de la fiche Google', jours: 'nombre de jours écoulés', paiement: 'coordonnées D17 / RIB réglées dans Société, ou rien', evenement: 'événement noté sur la fiche client' };
  // Remplace {var} ; une variable inconnue reste visible pour être repérée. Nettoie les doubles espaces laissés par les phrases vides.
  function rendre(text, vars) {
    return String(text || '').replace(/\{([a-z_]+)\}/g, (m, k) => (vars && vars[k] != null ? String(vars[k]) : m)).replace(/[ \t]{2,}/g, ' ').replace(/ \n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  }
  const api = { MODELES, GROUPES: G, VARS, rendre, defaut: (k) => (MODELES[k] || {}).text || '' };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.MODELES_API = api;
})(typeof window !== 'undefined' ? window : globalThis);
