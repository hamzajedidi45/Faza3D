// Calendrier des événements utilisés par les « Propositions du jour » (plateforme et serveur).
// Les dates des fêtes religieuses bougent chaque année : elles sont approximatives, ajustez-les dans Paramètres › Événements de l'année.
(function (root) {
  'use strict';
  const EVENEMENTS = [
    { id: 'nouvel-an', label: 'Nouvel An et cadeaux d’entreprise', month: 1, day: 1, lead: 30, idea: 'Agendas et plaques de bureau gravés, coffrets logo pour les entreprises : prospecter les banques, assurances et cabinets en novembre.' },
    { id: 'valentin', label: 'Saint-Valentin', month: 2, day: 14, lead: 20, idea: 'Collection lithophane photo + prénom en relief, porte-clés couple : annoncer 10 jours avant sur Instagram.' },
    { id: 'ramadan', label: 'Ramadan (date variable)', month: 2, day: 18, lead: 25, idea: 'Lanternes et calligraphies en PLA bois, plaques « Ramadan Kareem » pour les commerces et restaurants.' },
    { id: 'aid-fitr', label: 'Aïd el-Fitr (date variable)', month: 3, day: 20, lead: 20, idea: 'Boîtes de gâteaux gravées, cadeaux Aïd personnalisés pour les entreprises et les familles.' },
    { id: 'independance', label: 'Fête de l’Indépendance (20 mars)', month: 3, day: 20, lead: 15, idea: 'Plaques commémoratives et trophées pour les institutions, écoles et municipalités.' },
    { id: 'fin-trimestre', label: 'Fin du 2e trimestre scolaire', month: 3, day: 25, lead: 25, idea: 'Trophées et médailles de fin de trimestre pour les écoles privées et les clubs.' },
    { id: 'martyrs', label: 'Fête des Martyrs (9 avril)', month: 4, day: 9, lead: 10, idea: 'Plaques et stèles gravées pour les cérémonies officielles.' },
    { id: 'aid-adha', label: 'Aïd el-Adha (date variable)', month: 5, day: 27, lead: 20, idea: 'Cadeaux Aïd pour les entreprises, décorations de table gravées.' },
    { id: 'fete-meres', label: 'Fête des mères (dernier dimanche de mai)', month: 5, day: 31, lead: 20, idea: 'Lampes lithophanes, plaques prénom, bijoux imprimés : campagne 2 semaines avant.' },
    { id: 'fin-annee-scolaire', label: 'Fin d’année scolaire et remises de diplômes', month: 6, day: 15, lead: 45, idea: 'Trophées, plaques de diplômes, médailles : contacter les écoles et universités dès début mai.' },
    { id: 'fin-saison-clubs', label: 'Fin de saison des clubs sportifs', month: 6, day: 30, lead: 40, idea: 'Trophées de fin de saison, plaques des sponsors, médailles des tournois.' },
    { id: 'mariages', label: 'Saison des mariages', month: 7, day: 15, lead: 30, idea: 'Décorations de mariage, numéros de table, cadeaux d’invités gravés, cake toppers.' },
    { id: 'republique', label: 'Fête de la République (25 juillet)', month: 7, day: 25, lead: 10, idea: 'Plaques et trophées institutionnels.' },
    { id: 'femme', label: 'Fête de la femme (13 août)', month: 8, day: 13, lead: 15, idea: 'Cadeaux personnalisés pour les entreprises (plaques, bijoux imprimés, coffrets).' },
    { id: 'rentree', label: 'Rentrée scolaire et universitaire', month: 9, day: 15, lead: 35, idea: 'Plaques de porte, signalétique, trophées de rentrée, badges : prospecter les écoles en août.' },
    { id: 'evacuation', label: 'Fête de l’Évacuation (15 octobre)', month: 10, day: 15, lead: 10, idea: 'Plaques commémoratives pour les administrations et municipalités.' },
    { id: 'salons', label: 'Saison des salons et séminaires d’entreprise', month: 10, day: 20, lead: 30, idea: 'Trophées de séminaire, présentoirs et signalétique en plexiglas, goodies logo.' },
    { id: 'revolution', label: 'Fête de la Révolution (17 décembre)', month: 12, day: 17, lead: 10, idea: 'Plaques commémoratives, trophées associatifs.' },
    { id: 'fin-annee', label: 'Fêtes de fin d’année et bilans', month: 12, day: 25, lead: 45, idea: 'Cadeaux de fin d’année pour les clients des entreprises : coffrets gravés, calendriers, trophées internes. Relancer les entreprises dès le 10 novembre.' }
  ];
  // Événements actifs : défauts non désactivés + événements ajoutés dans la plateforme
  function actifs(params) {
    const off = new Set((params && params.eventsOff) || []);
    const custom = ((params && params.events) || []).filter(e => e && e.label && +e.month >= 1 && +e.month <= 12).map(e => ({ id: e.id || 'c' + e.label, label: e.label, month: +e.month, day: Math.min(31, Math.max(1, +e.day || 1)), lead: Math.max(0, +e.lead || 15), idea: e.idea || '', custom: true }));
    return EVENEMENTS.filter(e => !off.has(e.id)).concat(custom);
  }
  // Prochaine occurrence (en jours à partir de `now`) : négatif = passé cette année → on prend l'an prochain
  function dansJours(e, now) {
    const d = new Date(now || Date.now()); let t = new Date(d.getFullYear(), e.month - 1, e.day);
    if (t < d - 864e5) t = new Date(d.getFullYear() + 1, e.month - 1, e.day);
    return Math.round((t - d) / 864e5);
  }
  // Événements à préparer maintenant : dans les `lead` jours à venir
  function proches(params, now) {
    return actifs(params).map(e => ({ ...e, dans: dansJours(e, now) })).filter(e => e.dans >= 0 && e.dans <= e.lead).sort((a, b) => a.dans - b.dans);
  }
  const api = { EVENEMENTS, actifs, proches, dansJours };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.EVENEMENTS_API = api;
})(typeof window !== 'undefined' ? window : globalThis);
