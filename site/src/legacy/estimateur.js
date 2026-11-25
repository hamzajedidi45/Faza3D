(function(){
  var FR_UNITS=1, hudLbl, hudTot, state={ymin:-1.3,ymax:2.0,layers:120,solid:false}, setGeo=null;
  /* ---------- lecture STL / OBJ ---------- */
  function parseSTL(buf){
    var dv=new DataView(buf), n=buf.byteLength>84?dv.getUint32(80,true):0;
    if(buf.byteLength===84+n*50){ var out=new Float32Array(n*9), o=84; for(var i=0;i<n;i++){ for(var k=0;k<9;k++) out[i*9+k]=dv.getFloat32(o+12+k*4,true); o+=50; } return out; }
    var txt=new TextDecoder().decode(buf), re=/vertex\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)/g, arr=[], m; while((m=re.exec(txt))) arr.push(+m[1],+m[2],+m[3]); return new Float32Array(arr);
  }
  function parseOBJ(buf){
    var txt=new TextDecoder().decode(buf), v=[], out=[], lines=txt.split('\n');
    for(var i=0;i<lines.length;i++){ var l=lines[i].trim(); if(l[0]==='v'&&l[1]===' '){ var p=l.split(/\s+/); v.push([+p[1],+p[2],+p[3]]); }
      else if(l[0]==='f'){ var f=l.split(/\s+/).slice(1).map(function(t){var i=parseInt(t,10);return i<0?v.length+i:i-1;}); for(var k=1;k+1<f.length;k++){ [f[0],f[k],f[k+1]].forEach(function(ix){ var q=v[ix]||[0,0,0]; out.push(q[0],q[1],q[2]); }); } } }
    return new Float32Array(out);
  }
  function measure(a){ // mm
    var mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9],vol=0,area=0;
    for(var i=0;i<a.length;i+=9){
      var x1=a[i],y1=a[i+1],z1=a[i+2],x2=a[i+3],y2=a[i+4],z2=a[i+5],x3=a[i+6],y3=a[i+7],z3=a[i+8];
      vol+=(x1*(y2*z3-y3*z2)-y1*(x2*z3-x3*z2)+z1*(x2*y3-x3*y2))/6;
      var ux=x2-x1,uy=y2-y1,uz=z2-z1,vx=x3-x1,vy=y3-y1,vz=z3-z1, cx=uy*vz-uz*vy,cy=uz*vx-ux*vz,cz=ux*vy-uy*vx; area+=Math.sqrt(cx*cx+cy*cy+cz*cz)/2;
      for(var k=0;k<9;k+=3){ for(var d=0;d<3;d++){ var val=a[i+k+d]; if(val<mn[d])mn[d]=val; if(val>mx[d])mx[d]=val; } }
    }
    return {size:[mx[0]-mn[0],mx[1]-mn[1],mx[2]-mn[2]],min:mn,vol:Math.abs(vol),area:area};
  }
  function CFG(){ return typeof CONFIG!=='undefined'?CONFIG:{}; }
  // même calcul que le Calculateur de prix de la plateforme (paramètres envoyés par /api/public/info → CONFIG.calc)
  function estimate(m, extra){ // m : mm, mm³, mm² ; extra : coût ajouté (ex. socle lumineux)
    var volCm=m.vol/1000, shell=Math.min(volCm, m.area/100*0.12), C=CFG().calc; // parois 1,2 mm
    if(C){
      var matCm=shell+(volCm-shell)*C.infill, g=matCm*C.densite, h=g/C.gph+0.25, f=1+C.fail/100;
      var lines=[['Filament',g*f*C.kg/1000],['Machine',h*f*C.machine],['Frais fixes',h*f*C.fixed],['Finition',(C.fin+15)/60*C.tech],['Préparation',C.prep],['Emballage',C.pack]];
      if(extra) lines.push(['Socle',extra]);
      var cost=lines.reduce(function(a,l){return a+l[1];},0), ht=cost*(1+C.margin/100), ttc=ht*(1+C.vat/100);
      return {g:g,h:h*f,prix:Math.max(C.minimum,ttc),volCm:volCm,cost:cost,ht:ht};
    }
    var c=CFG().tarif||{parGramme:0.35,parHeure:4,minimum:15,densite:1.24,remplissage:0.2};
    var matCm2=shell+(volCm-shell)*(c.remplissage||0.2), g2=matCm2*(c.densite||1.24), h2=g2/14+0.25;
    return {g:g2,h:h2,prix:Math.max(c.minimum||15,g2*(c.parGramme||0.35)+h2*(c.parHeure||4))+(extra||0),volCm:volCm};
  }
  function fmt(n,d){ return (Math.round(n*Math.pow(10,d||0))/Math.pow(10,d||0)).toLocaleString('fr-FR'); }
  function showStats(m,e,name,extra){
    document.getElementById('stDim').textContent=fmt(m.size[0])+' × '+fmt(m.size[1])+' × '+fmt(m.size[2])+' mm';
    document.getElementById('stVol').textContent=fmt(e.volCm,e.volCm<10?1:0)+' cm³';
    document.getElementById('stW').textContent='≈ '+fmt(e.g)+' g';
    document.getElementById('stP').textContent='≈ '+fmt(e.prix<50?Math.ceil(e.prix):Math.ceil(e.prix/5)*5)+' DT';
    var note=document.getElementById('estNote'); if(name) note.textContent=(document.documentElement.lang==='ar'?'الملف: ':'Fichier : ')+name+(function(){ var C=CFG().calc, mt=C?C.mat:'PLA', inf=Math.round((C?C.infill:0.2)*100); return document.documentElement.lang==='ar'?' · تقدير بـ '+mt+'، تعبئة '+inf+'٪، السعر بالأداء. عرض سعر دقيق خلال 24 ساعة.':' · estimation en '+mt+', '+inf+' % de remplissage, prix TTC. Devis exact sous 24 h.'; })();
    window.__lastEstimate={name:name,m:m,e:e,extra:extra||0};
    window.__refreshEstimate=function(){ var le=window.__lastEstimate; if(le) showStats(le.m,estimate(le.m,le.extra),le.name,le.extra); };
  }
  /* ---------- image -> relief 3D (lithophane / logo) ---------- */
  var SIZES={litho:[[100,'10 × 7,5 cm (standard)'],[150,'15 × 11 cm'],[200,'20 × 15 cm']],relief:[[40,'Porte-clés 4 cm'],[80,'Plaque 8 cm'],[120,'Plaque 12 cm'],[200,'Plaque 20 cm']],texte:[[60,'Porte-clés 6 cm'],[100,'Plaque 10 cm'],[150,'Plaque 15 cm'],[200,'Plaque 20 cm']]};
  var SIZES_AR={litho:['10 × 7,5 سم (قياسي)','15 × 11 سم','20 × 15 سم'],relief:['ميدالية مفاتيح 4 سم','لوحة 8 سم','لوحة 12 سم','لوحة 20 سم'],texte:['ميدالية مفاتيح 6 سم','لوحة 10 سم','لوحة 15 سم','لوحة 20 سم']};
  var pendingImg=null, lastMode='litho';
  window.__fillSizes=function(){ if(pendingImg) fillSizes(); };
  function fillSizes(){ var mode=document.getElementById('ioMode').value, sel=document.getElementById('ioSize'), ar=document.documentElement.lang==='ar'; sel.innerHTML=SIZES[mode].map(function(o,i){ return '<option value="'+o[0]+'">'+(ar?SIZES_AR[mode][i]:o[1])+'</option>'; }).join(''); }
  // Logos : on sépare le motif du fond par la couleur (et pas seulement la luminosité), pour que les logos
  // en couleur, clairs sur fond sombre ou sur fond de couleur sortent nets ; seuil automatique (Otsu) + nettoyage des pixels isolés.
  function logoGrid(img, cols){
    var iw=img.naturalWidth||img.width, ih=img.naturalHeight||img.height, ratio=ih/iw, rows=Math.max(2,Math.round(cols*ratio)); var c=document.createElement('canvas'); c.width=cols; c.height=rows; var g=c.getContext('2d');
    g.clearRect(0,0,cols,rows); g.drawImage(img,0,0,cols,rows); var d=g.getImageData(0,0,cols,rows).data, n=cols*rows, i, x, y;
    // fond = couleur médiane du bord de l'image (transparent = fond)
    var br=[],bg=[],bb=[]; function edge(k){ if(d[k*4+3]<128) return; br.push(d[k*4]); bg.push(d[k*4+1]); bb.push(d[k*4+2]); }
    for(x=0;x<cols;x++){ edge(x); edge((rows-1)*cols+x); } for(y=0;y<rows;y++){ edge(y*cols); edge(y*cols+cols-1); }
    function med(a){ if(!a.length) return 255; a.sort(function(p,q){return p-q}); return a[a.length>>1]; }
    var R0=med(br),G0=med(bg),B0=med(bb), dist=new Float32Array(n), hist=new Array(256).fill(0);
    for(i=0;i<n;i++){ var al=d[i*4+3]/255; var dv=al<0.5?0:Math.sqrt(Math.pow(d[i*4]-R0,2)*0.3+Math.pow(d[i*4+1]-G0,2)*0.59+Math.pow(d[i*4+2]-B0,2)*0.11)*al; dist[i]=Math.min(255,dv); hist[Math.round(dist[i])]++; }
    // seuil d'Otsu sur la distance au fond (minimum 18 pour ignorer le bruit de compression)
    var sum=0; for(i=0;i<256;i++) sum+=i*hist[i]; var sB=0,wB=0,best=0,thr=40; for(i=0;i<256;i++){ wB+=hist[i]; if(!wB) continue; var wF=n-wB; if(!wF) break; sB+=i*hist[i]; var mB=sB/wB,mF=(sum-sB)/wF,v=wB*wF*(mB-mF)*(mB-mF); if(v>best){best=v;thr=i;} }
    thr=Math.max(18,thr); var m=new Uint8Array(n); for(i=0;i<n;i++) m[i]=dist[i]>thr?1:0;
    // nettoyage : un pixel prend la valeur majoritaire de ses 8 voisins
    var m2=new Uint8Array(n); for(y=0;y<rows;y++) for(x=0;x<cols;x++){ var s=0,t=0; for(var dy=-1;dy<=1;dy++) for(var dx=-1;dx<=1;dx++){ var xx=x+dx,yy=y+dy; if(xx<0||yy<0||xx>=cols||yy>=rows) continue; t++; s+=m[yy*cols+xx]; } m2[y*cols+x]=s*2>t?1:0; }
    var lum=new Float32Array(n); for(i=0;i<n;i++) lum[i]=m2[i]?0:1;
    return {cols:cols,rows:rows,lum:lum,ratio:ratio};
  }
  function imageToGrid(img, cols){
    var iw=img.naturalWidth||img.width, ih=img.naturalHeight||img.height, ratio=ih/iw, rows=Math.max(2,Math.round(cols*ratio)); var c=document.createElement('canvas'); c.width=cols; c.height=rows; var g=c.getContext('2d');
    g.fillStyle='#fff'; g.fillRect(0,0,cols,rows); g.drawImage(img,0,0,cols,rows); var d=g.getImageData(0,0,cols,rows).data, lum=new Float32Array(cols*rows);
    for(var i=0;i<cols*rows;i++){ var a=d[i*4+3]/255; lum[i]=(0.299*d[i*4]+0.587*d[i*4+1]+0.114*d[i*4+2])/255*a+(1-a); }
    return {cols:cols,rows:rows,lum:lum,ratio:ratio};
  }
  // construit les triangles (Float32Array, 9 valeurs par triangle) d'une plaque dont la face avant est un relief
  function reliefMesh(grid, widthMm, hFn, vertical){
    var cols=grid.cols, rows=grid.rows, W=widthMm, H=widthMm*grid.ratio, dx=W/(cols-1), dy=H/(rows-1), tris=[];
    function P(i,j,z){ var x=i*dx-W/2, y=H/2-j*dy; return vertical?[x,-z,y]:[x,y,z]; } // vertical : hauteur en Z (impression debout), épaisseur en Y
    function tri(a,b,c){ tris.push(a[0],a[1],a[2],b[0],b[1],b[2],c[0],c[1],c[2]); }
    var z=new Float32Array(cols*rows); for(var k=0;k<cols*rows;k++) z[k]=hFn(grid.lum[k]);
    for(var j=0;j<rows-1;j++) for(var i=0;i<cols-1;i++){ var a=P(i,j,z[j*cols+i]),b=P(i+1,j,z[j*cols+i+1]),c=P(i+1,j+1,z[(j+1)*cols+i+1]),d=P(i,j+1,z[(j+1)*cols+i]); tri(a,b,c); tri(a,c,d); }
    // dos plat
    var A=P(0,0,0),B=P(cols-1,0,0),C=P(cols-1,rows-1,0),D=P(0,rows-1,0); tri(A,C,B); tri(A,D,C);
    // bords
    for(var i=0;i<cols-1;i++){ tri(P(i,0,0),P(i+1,0,0),P(i+1,0,z[i+1])); tri(P(i,0,0),P(i+1,0,z[i+1]),P(i,0,z[i])); var r=rows-1; tri(P(i,r,0),P(i+1,r,z[r*cols+i+1]),P(i+1,r,0)); tri(P(i,r,0),P(i,r,z[r*cols+i]),P(i+1,r,z[r*cols+i+1])); }
    for(var j=0;j<rows-1;j++){ tri(P(0,j,0),P(0,j+1,z[(j+1)*cols]),P(0,j+1,0)); tri(P(0,j,0),P(0,j,z[j*cols]),P(0,j+1,z[(j+1)*cols])); var c2=cols-1; tri(P(c2,j,0),P(c2,j+1,0),P(c2,j+1,z[(j+1)*cols+c2])); tri(P(c2,j,0),P(c2,j+1,z[(j+1)*cols+c2]),P(c2,j,z[j*cols+c2])); }
    var vsum=0; for(var q=0;q<z.length;q++) vsum+=z[q]; var vol=vsum/z.length*W*H, area=2*W*H+2*(W+H)*(vsum/z.length);
    return {arr:new Float32Array(tris),vol:vol,area:area};
  }
  function stlBlob(arr, name){ var n=arr.length/9, buf=new ArrayBuffer(84+n*50), dv=new DataView(buf); dv.setUint32(80,n,true); var o=84;
    for(var i=0;i<n;i++){ o+=12; for(var k=0;k<9;k++){ dv.setFloat32(o,arr[i*9+k],true); o+=4; } o+=2; } return new File([buf], name, {type:'model/stl'}); }
  function textImage(){
    var t=(document.getElementById('ioTxt').value||'FAZA 3D').trim().slice(0,40)||'FAZA 3D', font=document.getElementById('ioFont').value, c=document.createElement('canvas'), g=c.getContext('2d');
    g.font=font; var w=Math.ceil(g.measureText(t).width)+60; c.width=Math.max(120,w); c.height=150; g=c.getContext('2d');
    g.fillStyle='#fff'; g.fillRect(0,0,c.width,c.height); g.fillStyle='#000'; g.font=font; g.textAlign='center'; g.textBaseline='middle'; g.direction=/[؀-ۿ]/.test(t)?'rtl':'ltr'; g.fillText(t,c.width/2,c.height/2+4);
    return c;
  }
  function syncTextUI(){ var tx=document.getElementById('ioMode').value==='texte'; document.getElementById('ioTxtWrap').hidden=!tx; document.getElementById('ioFontWrap').hidden=!tx; }
  function buildFromImage(){
    if(document.getElementById('ioMode').value==='texte') pendingImg=textImage();
    if(!pendingImg) return; var mode=document.getElementById('ioMode').value, size=Math.max(20,Math.min(300,+document.getElementById('ioW').value||100)), thick=Math.max(1,Math.min(8,+document.getElementById('ioT').value||3)), ar=document.documentElement.lang==='ar';
    var grid=mode==='litho'?imageToGrid(pendingImg,Math.min(220,Math.max(80,Math.round(size*1.6)))):mode==='texte'?imageToGrid(pendingImg,Math.min(200,Math.max(60,Math.round(size*2)))):logoGrid(pendingImg,Math.min(260,Math.max(80,Math.round(size*2.5))));
    var R, arr, label;
    var isTxt=mode==='texte'; if(isTxt) mode='relief';
    if(mode==='litho'){ var tmax=Math.max(1.5,thick); R=reliefMesh(grid,size,function(l){ return 0.8+(1-l)*(tmax-0.8); },true); label=(ar?'ليثوفان ':'Lithophane ')+size+' mm'; }
    else { var baseT=Math.max(1,thick-1.5); R=reliefMesh(grid,size,function(l){ return l<0.5?thick:baseT; },false); label=(isTxt?(ar?'نص بارز ':'Texte en relief '):(ar?'نقش بارز ':'Relief '))+size+' mm'; }
    arr=R.arr; var m=measure(arr); m.vol=R.vol; m.area=R.area; var e=estimate(m);
    var extra=0;
    if(CFG().calc){ if(mode==='litho'){ extra=+CFG().calc.socle||0; e=estimate(m,extra); } }
    else if(mode==='litho'){ var c=CFG().tarif||{}; var areaCm=(size/10)*(size*grid.ratio/10); e.prix=Math.max(+c.lithophane||55, (+c.lithophane||55)*Math.pow(areaCm/75,0.6)); }
    else { e.prix=Math.max(+(CFG().tarif||{}).reliefMin||12, e.prix); }
    showStats(m,e,label,extra); if(setGeo) setGeo(arr,m,mode==='litho'); window.__lastFile=stlBlob(arr,(mode==='litho'?'lithophane':isTxt?'texte':'relief')+'-'+size+'mm.stl'); lastMode=isTxt?'texte':mode;
    var note=document.getElementById('estNote'); var fm=function(v){return String(v).replace('.',',');}; note.textContent=mode==='litho'?(ar?'ليثوفان '+size+' مم: يُطبع واقفاً، سُمك 0,8 إلى '+fm(Math.max(1.5,thick))+' مم، القاعدة المضيئة مشمولة في السعر. عرض سعر دقيق خلال 24 ساعة.':'Lithophane '+size+' mm : imprimé debout, épaisseur 0,8 à '+fm(Math.max(1.5,thick))+' mm, socle lumineux compris dans le prix. Devis exact sous 24 h.'):(ar?'نقش بارز '+size+' مم: قاعدة '+fm(Math.max(1,thick-1.5))+' مم، الرسم '+fm(thick)+' مم. الأسود في الصورة يطلع بارز؛ للميدالية نزيدو الحلقة في الورشة. عرض سعر دقيق خلال 24 ساعة.':'Relief '+size+' mm : base '+fm(Math.max(1,thick-1.5))+' mm, motif '+fm(thick)+' mm. Le noir de l’image ressort en relief ; pour un porte-clés, l’anneau est ajouté à l’atelier. Devis exact sous 24 h.');
  }
  window.__makeFromImage=function(img,opts){ pendingImg=img; document.getElementById('imgOpts').hidden=false; var m=document.getElementById('ioMode'); m.value=opts.mode==='relief'?'relief':'litho'; fillSizes(); if(opts.width) document.getElementById('ioW').value=Math.round(opts.width); if(opts.thickness) document.getElementById('ioT').value=opts.thickness; buildFromImage(); document.querySelector('.scene').scrollIntoView({behavior:'smooth',block:'center'}); };
  function loadImage(file){ var url=URL.createObjectURL(file), img=new Image(); img.onload=function(){ pendingImg=img; document.getElementById('imgOpts').hidden=false; var mm=document.getElementById('ioMode'); if(mm.value==='texte') mm.value='litho'; syncTextUI(); fillSizes(); document.getElementById('ioW').value=document.getElementById('ioSize').value; buildFromImage(); }; img.onerror=function(){ alert(document.documentElement.lang==='ar'?'تعذّر قراءة الصورة.':'Impossible de lire cette image.'); }; img.src=url; }
  (function(){ var m=document.getElementById('ioMode'), sz=document.getElementById('ioSize'), go=document.getElementById('ioGo'); if(!m) return; m.addEventListener('change',function(){ if(m.value!=='texte'&&pendingImg&&pendingImg.tagName==='CANVAS'){ pendingImg=null; document.getElementById('stlIn').click(); } fillSizes(); syncTextUI(); document.getElementById('ioW').value=sz.value; document.getElementById('ioT').value=m.value==='litho'?3:3.5; buildFromImage(); }); var tdeb=null; ['ioTxt','ioFont'].forEach(function(id){ document.getElementById(id).addEventListener(id==='ioTxt'?'input':'change',function(){ clearTimeout(tdeb); tdeb=setTimeout(buildFromImage,350); }); }); sz.addEventListener('change',function(){ document.getElementById('ioW').value=sz.value; buildFromImage(); }); go.addEventListener('click',buildFromImage); document.getElementById('ioW').addEventListener('change',buildFromImage); document.getElementById('ioT').addEventListener('change',buildFromImage); })();
  function loadFile(file){
    if(!file) return; if(/\.(png|jpe?g|webp)$/i.test(file.name)||/^image\//.test(file.type)){ return loadImage(file); }
    document.getElementById('imgOpts').hidden=true; pendingImg=null; var r=new FileReader();
    r.onload=function(){ try{
      var arr=/\.obj$/i.test(file.name)?parseOBJ(r.result):parseSTL(r.result); if(arr.length<9) throw 0;
      var m=measure(arr); if(m.vol<1){ m.vol=m.area*1.2; } // surface ouverte : approximation
      showStats(m,estimate(m),file.name); if(setGeo) setGeo(arr,m); window.__lastFile=file;
    }catch(e){ alert(document.documentElement.lang==='ar'?'تعذّر قراءة الملف. جرّب STL أو OBJ.':'Impossible de lire ce fichier. Essayez un STL ou un OBJ.'); } };
    r.readAsArrayBuffer(file);
  }
  var drop=document.getElementById('drop'), inp=document.getElementById('stlIn');
  if(inp) inp.addEventListener('change',function(){ loadFile(inp.files[0]); });
  if(drop){ ['dragenter','dragover'].forEach(function(ev){ drop.addEventListener(ev,function(e){ e.preventDefault(); drop.classList.add('over'); }); });
    ['dragleave','drop'].forEach(function(ev){ drop.addEventListener(ev,function(e){ e.preventDefault(); drop.classList.remove('over'); }); });
    drop.addEventListener('drop',function(e){ loadFile(e.dataTransfer.files[0]); }); }
  /* ---------- boutons de mode : texte en relief, création par IA ---------- */
  function pressMode(k){ document.querySelectorAll('#modes [data-mode]').forEach(function(b){ b.setAttribute('aria-pressed', b.dataset.mode===k); }); }
  document.querySelectorAll('#modes [data-mode]').forEach(function(b){ b.addEventListener('click',function(){
    var k=b.dataset.mode, ia=document.getElementById('iaBox');
    if(k==='texte'){ ia.hidden=true; document.getElementById('imgOpts').hidden=false; var mm=document.getElementById('ioMode'); mm.value='texte'; fillSizes(); syncTextUI(); document.getElementById('ioW').value=document.getElementById('ioSize').value; document.getElementById('ioT').value=3; buildFromImage(); document.getElementById('ioTxt').focus(); pressMode('texte'); }
    else { var open=ia.hidden; ia.hidden=!open; if(open){ document.getElementById('imgOpts').hidden=true; pressMode('ia'); } else pressMode(''); }
  }); });
  /* ---------- création 3D par IA (Meshy, via la plateforme) ---------- */
  (function(){
    var box=document.getElementById('iaBox'); if(!box) return;
    var kind='texte', img=null, timer=null, AR=function(){ return document.documentElement.lang==='ar'; };
    var PF=function(){ return String(CFG().plateforme||'').replace(/\/+$/,''); };
    var msg=function(fr,ar){ document.getElementById('iaMsg').textContent=AR()?ar:fr; };
    var ph=function(){ document.getElementById('iaTxt').placeholder=AR()?'مثال : كأس كرة قدم فوقها نسر على قاعدة دائرية':'Ex. : trophée de football avec un aigle, sur un socle rond'; };
    ph(); window.addEventListener('faza-lang',ph);
    box.querySelectorAll('[data-ia]').forEach(function(b){ b.addEventListener('click',function(){ kind=b.dataset.ia; box.querySelectorAll('[data-ia]').forEach(function(x){ x.setAttribute('aria-pressed', x===b); }); document.getElementById('iaTxtWrap').hidden=kind!=='texte'; document.getElementById('iaImgWrap').hidden=kind!=='image'; }); });
    document.getElementById('iaImg').addEventListener('change',function(){ var f=this.files[0]; img=null; if(!f) return; var im=new Image(); im.onload=function(){ var c=document.createElement('canvas'), k=Math.min(1,1024/Math.max(im.width,im.height)); c.width=Math.round(im.width*k); c.height=Math.round(im.height*k); c.getContext('2d').drawImage(im,0,0,c.width,c.height); img={type:'image/jpeg',data:c.toDataURL('image/jpeg',0.85).split(',')[1]}; }; im.src=URL.createObjectURL(f); });
    function bar(p){ document.getElementById('iaProg').hidden=false; document.getElementById('iaBar').style.width=Math.max(5,Math.min(100,p))+'%'; }
    function done(btn){ btn.disabled=false; clearInterval(timer); timer=null; }
    async function useModel(url, fmt, heightMm, title){
      var r=await fetch(url); if(!r.ok) throw new Error('modèle'); var buf=await r.arrayBuffer();
      var arr=fmt==='stl'?parseSTL(buf):parseOBJ(buf); if(arr.length<9) throw new Error('vide');
      if(fmt!=='stl'){ for(var i=0;i<arr.length;i+=3){ var y=arr[i+1], z=arr[i+2]; arr[i+1]=-z; arr[i+2]=y; } } // OBJ : Y vers le haut → Z vers le haut (impression)
      var m0=measure(arr), k=heightMm/Math.max(0.001,m0.size[2]);
      for(var j=0;j<arr.length;j+=3){ arr[j]=(arr[j]-m0.min[0])*k; arr[j+1]=(arr[j+1]-m0.min[1])*k; arr[j+2]=(arr[j+2]-m0.min[2])*k; }
      var m=measure(arr); if(m.vol<1) m.vol=m.area*1.2;
      showStats(m,estimate(m),title); if(setGeo) setGeo(arr,m); window.__lastFile=stlBlob(arr,'creation-ia-'+Math.round(heightMm)+'mm.stl');
      document.getElementById('estNote').textContent=AR()?'نموذج صنعو الذكاء الاصطناعي : الورشة تراجعو وتأكّد السعر قبل الطباعة.':'Modèle créé par IA : l’atelier le vérifie (solidité, détails) et confirme le prix avant impression.';
    }
    document.getElementById('iaGo').addEventListener('click',async function(){
      var btn=this, name=document.getElementById('iaName').value.trim(), tel=document.getElementById('iaTel').value.trim(), prompt=document.getElementById('iaTxt').value.trim(), H=Math.max(20,Math.min(300,+document.getElementById('iaH').value||100));
      if(!PF()) return msg('Service indisponible.','الخدمة غير متوفرة.');
      if(name.length<2||tel.replace(/\D/g,'').length<8) return msg('Indiquez votre nom et votre téléphone : l’atelier vous recontacte avec le devis.','اكتب اسمك ورقم هاتفك : الورشة تكلمك بعرض السعر.');
      if(kind==='texte'&&prompt.length<4) return msg('Décrivez l’objet à créer.','اوصف القطعة اللي تحب.');
      if(kind==='image'&&!img) return msg('Choisissez une photo.','اختار صورة.');
      btn.disabled=true; bar(5); msg('Envoi de la demande…','نبعثو في الطلب…');
      try{
        var r=await fetch(PF()+'/api/public/ia3d',{method:'POST',headers:{'Content-Type':'application/json','X-Faza':'1'},body:JSON.stringify({kind:kind,prompt:prompt,image:kind==='image'?img:undefined,name:name,phone:tel,lang:AR()?'ar':'fr'})});
        var j=await r.json().catch(function(){return {};}); if(!r.ok) throw new Error(j.error||'');
        var fn=document.getElementById('f_name'), fp=document.getElementById('f_phone'); if(fn&&!fn.value) fn.value=name; if(fp&&!fp.value) fp.value=tel;
        var t0=Date.now(), id=j.id;
        msg('Création en cours : 1 à 3 minutes, gardez la page ouverte.','الصنع جاري : من 1 إلى 3 دقائق، خلّي الصفحة مفتوحة.');
        timer=setInterval(async function(){
          if(Date.now()-t0>8*60e3){ done(btn); return msg('La création prend trop de temps : votre demande est bien arrivée, l’atelier vous recontacte.','الصنع طوّل : طلبك وصل، الورشة تكلمك.'); }
          try{ var s=await fetch(PF()+'/api/public/ia3d/'+id); var d=await s.json(); if(!s.ok) throw new Error(d.error||'');
            bar(Math.max(8,d.progress||Math.min(90,(Date.now()-t0)/1800)));
            if(d.status==='erreur'){ done(btn); return msg(d.error||'La création a échoué.', 'الصنع ما نجحش : جرّب صورة أخرى ولا وصف أبسط.'); }
            if(d.status==='pret'){ done(btn); bar(100); msg('Modèle prêt ! Ajustez la hauteur si besoin, puis demandez le devis.','النموذج حاضر ! بدّل الطول إذا لزم، ومن بعد اطلب عرض السعر.');
              await useModel(PF()+d.model, d.format||'obj', H, (AR()?'قطعة بالذكاء الاصطناعي ':'Création IA ')+H+' mm'); }
          }catch(e){ /* réseau : on réessaie au prochain tour */ }
        },4000);
      }catch(e){ done(btn); document.getElementById('iaProg').hidden=true; msg(e.message||'Service indisponible pour le moment.', e.message||'الخدمة غير متوفرة توّا.'); }
    });
  })();
  var go=document.getElementById('stGo'); if(go) go.addEventListener('click',function(){
    var d=document.getElementById('f_details'), le=window.__lastEstimate; if(d){ var ar=document.documentElement.lang==='ar';
      d.value=(le&&le.name?(ar?'ملف: ':'Fichier : ')+le.name+'\n':'')+(ar?'الأبعاد: ':'Dimensions : ')+document.getElementById('stDim').textContent+' · '+(ar?'الحجم: ':'volume : ')+document.getElementById('stVol').textContent+' · '+(ar?'تقدير: ':'estimation : ')+document.getElementById('stP').textContent+'\n'; }
    var t=document.getElementById('devisForm')||document.getElementById('devis'); if(t) t.scrollIntoView({behavior:'smooth',block:'start'}); setTimeout(function(){ var n=document.getElementById('f_name'); if(n) n.focus(); },600);
  });
  /* ---------- scène 3D ---------- */
  function start(){
    var cv=document.getElementById('scene3d'); if(!cv||!window.THREE) return fail();
    var R;try{R=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true});}catch(e){return fail();}
    R.setPixelRatio(Math.min(devicePixelRatio,2)); R.localClippingEnabled=true; R.toneMapping=THREE.ACESFilmicToneMapping; R.toneMappingExposure=1.15;
    var sc=new THREE.Scene(); var cam=new THREE.PerspectiveCamera(34,1,0.1,100); cam.position.set(0,1.7,7.9); cam.lookAt(0,0.3,0);
    sc.add(new THREE.HemisphereLight(0x9fd4ff,0x061a3a,1.1));
    var key=new THREE.DirectionalLight(0xffffff,1.6); key.position.set(3,5,4); sc.add(key);
    var rim=new THREE.PointLight(0x3bc4ff,40,20); rim.position.set(-4,2,-3); sc.add(rim);
    var fill=new THREE.PointLight(0x1e7bff,25,20); fill.position.set(4,0.5,3); sc.add(fill);
    var clip=new THREE.Plane(new THREE.Vector3(0,-1,0),0);
    var mat=new THREE.MeshPhysicalMaterial({color:0x1e7bff,metalness:0.35,roughness:0.22,clearcoat:0.8,clearcoatRoughness:0.2,clippingPlanes:[clip],side:THREE.DoubleSide});
    var wmat=new THREE.LineBasicMaterial({color:0x5cc8ff,transparent:true,opacity:0.22});
    var group=new THREE.Group(); sc.add(group); var mesh=null, wire=null;
    function place(geo){
      if(mesh){ group.remove(mesh); group.remove(wire); mesh.geometry.dispose(); wire.geometry.dispose(); }
      geo.computeBoundingBox(); var bb=geo.boundingBox, sz=new THREE.Vector3(); bb.getSize(sz); var c=new THREE.Vector3(); bb.getCenter(c);
      var k=3.4/Math.max(sz.x,sz.y,sz.z); geo.translate(-c.x,-bb.min.y,-c.z); geo.scale(k,k,k);
      mesh=new THREE.Mesh(geo,mat); wire=new THREE.LineSegments(new THREE.EdgesGeometry(geo,25),wmat); mesh.position.y=wire.position.y=-1.3; group.add(mesh); group.add(wire);
      state.ymin=-1.3; state.ymax=-1.3+sz.y*k;
    }
    // pièce de démonstration : la lettre F
    var f=new THREE.Shape(), u=1; [[0,0],[48,0],[48,12],[14,12],[14,26],[40,26],[40,38],[14,38],[14,64],[0,64]].forEach(function(p,i){ i?f.lineTo(p[0],64-p[1]):f.moveTo(p[0],64-p[1]); });
    var demo=new THREE.ExtrudeGeometry(f,{depth:24,bevelEnabled:true,bevelThickness:1.5,bevelSize:1.5,bevelSegments:3}); demo.rotateX(0); place(demo);
    (function(){ var m={size:[48,64,24],vol:48*64*24*0.47,area:2*(48*64*0.47)+24*(2*64+2*48+4*26)}; showStats(m,estimate(m),null); })();
    var matStd=mat, matLitho=new THREE.MeshPhysicalMaterial({color:0xdfe9ff,metalness:0,roughness:0.55,transmission:0.35,thickness:1.5,clippingPlanes:[clip],side:THREE.DoubleSide});
    setGeo=function(arr,m,litho){
      var g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(arr,3)); g.computeVertexNormals();
      mat=litho?matLitho:matStd;
      // STL : Z vers le haut → Y vers le haut
      g.rotateX(-Math.PI/2); place(g); state.layers=Math.max(1,Math.round(m.size[2]/0.2)); hudTot.textContent=state.layers; t0=performance.now();
    };
    hudTot=document.getElementById('layerTot'); hudLbl=document.getElementById('layerNo');
    var layer=new THREE.Mesh(new THREE.PlaneGeometry(3.8,3.8),new THREE.MeshBasicMaterial({color:0x5cc8ff,transparent:true,opacity:0.16,side:THREE.DoubleSide,depthWrite:false})); layer.rotation.x=-Math.PI/2; sc.add(layer);
    var ring=new THREE.Mesh(new THREE.RingGeometry(1.95,2.02,64),new THREE.MeshBasicMaterial({color:0x9fe2ff,transparent:true,opacity:0.5,side:THREE.DoubleSide})); ring.rotation.x=-Math.PI/2; sc.add(ring);
    var plate=new THREE.Mesh(new THREE.CylinderGeometry(2.6,2.6,0.12,96),new THREE.MeshPhysicalMaterial({color:0x0b1a36,metalness:0.6,roughness:0.35,clearcoat:1})); plate.position.y=-1.4; sc.add(plate);
    var grid=new THREE.GridHelper(5.2,13,0x5cc8ff,0x1e7bff); grid.position.y=-1.33; grid.material.transparent=true; grid.material.opacity=0.18; sc.add(grid);
    var N=160,pos=new Float32Array(N*3); for(var i=0;i<N;i++){pos[i*3]=(Math.random()-0.5)*8;pos[i*3+1]=Math.random()*5-1.5;pos[i*3+2]=(Math.random()-0.5)*6;}
    var pg=new THREE.BufferGeometry(); pg.setAttribute('position',new THREE.BufferAttribute(pos,3)); var pts=new THREE.Points(pg,new THREE.PointsMaterial({color:0x9fe2ff,size:0.035,transparent:true,opacity:0.7})); sc.add(pts);
    var t0=performance.now(), reduce=matchMedia('(prefers-reduced-motion: reduce)').matches, drag=null, rot={x:0,y:0}, auto=true;
    function size(){ var w=cv.clientWidth||400,h=cv.clientHeight||400; R.setSize(w,h,false); cam.aspect=w/h; cam.updateProjectionMatrix(); }
    size(); addEventListener('resize',size);
    cv.addEventListener('pointerdown',function(e){ drag={x:e.clientX,y:e.clientY,rx:rot.x,ry:rot.y}; auto=false; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove',function(e){ if(!drag) return; rot.y=drag.ry+(e.clientX-drag.x)*0.01; rot.x=Math.max(-0.6,Math.min(0.6,drag.rx+(e.clientY-drag.y)*0.006)); });
    cv.addEventListener('pointerup',function(){ drag=null; setTimeout(function(){auto=true;},4000); });
    function frame(now){
      var t=(now-t0)/1000, cyc=reduce?1:((t%14)/14), p=cyc<0.8?cyc/0.8:1, h=state.ymin+(state.ymax-state.ymin)*p;
      clip.constant=h; layer.position.y=h; ring.position.y=h; layer.material.opacity=cyc<0.8?0.16:0.04; ring.material.opacity=cyc<0.8?0.5:0.12;
      if(hudLbl) hudLbl.textContent=Math.round(p*state.layers);
      if(auto&&!drag) rot.y+=0.004; group.rotation.y=rot.y; group.rotation.x=rot.x;
      pts.rotation.y=t*0.03; R.render(sc,cam); requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  function fail(){ var c=document.getElementById('scene3d'); var f=document.querySelector('.scene .fallback'); if(c)c.hidden=true; if(f)f.hidden=false; }
  window.addEventListener('load',function(){ setTimeout(start,0); });
})();
