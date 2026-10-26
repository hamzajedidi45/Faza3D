// Applique le thème choisi (clair par défaut) avant l'affichage de la page
(function(){try{var t=localStorage.getItem('faza_theme')||'light';if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();
