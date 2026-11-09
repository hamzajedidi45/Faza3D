package tn.faza3d.atelier;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.text.InputType;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.webkit.CookieManager;
import android.webkit.PermissionRequest;
import android.webkit.SslErrorHandler;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

public class MainActivity extends Activity {
  static final String PREFS = "faza";
  static final int FILE_REQ = 11;
  WebView web;
  FrameLayout root;
  View setup;
  ValueCallback<Uri[]> fileCb;
  View loading;
  boolean loaded;
  String lastJsError = "";
  android.os.Handler handler = new android.os.Handler();
  Runnable timeoutRun;
  PermissionRequest pendingPerm;

  @Override protected void onCreate(Bundle b) {
    super.onCreate(b);
    root = new FrameLayout(this);
    root.setBackgroundColor(Color.parseColor("#050C18"));
    setContentView(root);
    if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED)
      requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 1);
    String url = prefs().getString("url", null);
    if (url == null) showSetup("https://atelier.faza3d.tn", null); else open(url);
  }

  SharedPreferences prefs() { return getSharedPreferences(PREFS, MODE_PRIVATE); }

  int dp(int v) { return (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, getResources().getDisplayMetrics()); }

  /* ---------- écran de réglage de l'adresse ---------- */
  void showSetup(String current, String error) {
    if (web != null) web.setVisibility(View.GONE);
    if (loading != null) loading.setVisibility(View.GONE);
    if (timeoutRun != null) handler.removeCallbacks(timeoutRun);
    if (setup != null) root.removeView(setup);
    LinearLayout box = new LinearLayout(this);
    box.setOrientation(LinearLayout.VERTICAL);
    box.setPadding(dp(28), dp(64), dp(28), dp(28));
    TextView t = new TextView(this);
    t.setText("FAZA 3D Atelier");
    t.setTextSize(28); t.setTextColor(Color.parseColor("#E8EEF8")); t.setTypeface(null, android.graphics.Typeface.BOLD);
    box.addView(t);
    TextView s = new TextView(this);
    s.setText("Adresse de la plateforme. Laissez celle proposée, sauf si l’atelier vous en donne une autre.");
    s.setTextSize(15); s.setTextColor(Color.parseColor("#AEBBD3")); s.setPadding(0, dp(12), 0, dp(20));
    box.addView(s);
    final EditText e = new EditText(this);
    e.setHint("https://…"); e.setText(current); e.setSingleLine(true);
    e.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
    e.setTextSize(17);
    box.addView(e);
    if (error != null) {
      TextView er = new TextView(this);
      er.setText(error); er.setTextColor(Color.parseColor("#B42318")); er.setTextSize(14); er.setPadding(0, dp(10), 0, 0);
      box.addView(er);
      Button ch = new Button(this);
      ch.setText("Tester l’adresse dans Chrome"); ch.setAllCaps(false);
      ch.setOnClickListener(new View.OnClickListener() { @Override public void onClick(View v) {
        String u = e.getText().toString().trim(); if (u.isEmpty()) return;
        if (!u.startsWith("http")) u = "https://" + u;
        try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(u))); } catch (Exception ex) { }
      } });
      box.addView(ch);
    }
    Button ok = new Button(this);
    ok.setText("Se connecter");
    ok.setAllCaps(false); ok.setTextSize(17); ok.setTextColor(Color.WHITE);
    ok.setBackgroundColor(Color.parseColor("#1E7BFF"));
    LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(52));
    lp.topMargin = dp(20);
    ok.setLayoutParams(lp);
    ok.setOnClickListener(new View.OnClickListener() { @Override public void onClick(View v) {
      String u = e.getText().toString().trim();
      if (u.isEmpty()) return;
      if (!u.startsWith("http://") && !u.startsWith("https://")) u = "https://" + u;
      while (u.endsWith("/")) u = u.substring(0, u.length() - 1);
      if (u.endsWith("/poste")) u = u.substring(0, u.length() - 6);
      prefs().edit().putString("url", u).apply();
      PollJob.schedule(MainActivity.this);
      open(u);
    } });
    box.addView(ok);
    TextView n = new TextView(this);
    n.setText("Connectez-vous avec votre compte d’équipe (le même que sur le PC). Appui long sur Retour pour changer l’adresse plus tard.");
    n.setTextSize(13); n.setTextColor(Color.parseColor("#7D8AA6")); n.setPadding(0, dp(20), 0, 0);
    box.addView(n);
    setup = box;
    root.addView(setup, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
  }

  /* ---------- la plateforme ---------- */
  @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
  void open(String url) {
    if (setup != null) { root.removeView(setup); setup = null; }
    if (loading == null) {
      // écran d'ouverture : logo, nom, et petit texte pendant le chargement de la plateforme
      LinearLayout sp = new LinearLayout(this);
      sp.setOrientation(LinearLayout.VERTICAL); sp.setGravity(Gravity.CENTER); sp.setBackgroundColor(Color.parseColor("#050C18"));
      android.widget.ImageView logo = new android.widget.ImageView(this);
      logo.setImageResource(R.drawable.splash_logo); logo.setAdjustViewBounds(true);
      sp.addView(logo, new LinearLayout.LayoutParams(dp(112), dp(140)));
      TextView name = new TextView(this);
      name.setText("FAZA 3D"); name.setTextSize(26); name.setTextColor(Color.parseColor("#E8EEF8"));
      name.setTypeface(null, android.graphics.Typeface.BOLD); name.setGravity(Gravity.CENTER); name.setPadding(0, dp(18), 0, 0);
      sp.addView(name);
      TextView sub = new TextView(this);
      sub.setText("Connexion à la plateforme…"); sub.setTextSize(14); sub.setTextColor(Color.parseColor("#7D8AA6"));
      sub.setGravity(Gravity.CENTER); sub.setPadding(0, dp(8), 0, 0);
      sp.addView(sub);
      loading = sp;
      root.addView(loading, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
    }
    loading.setVisibility(View.VISIBLE); loaded = false;
    if (timeoutRun != null) handler.removeCallbacks(timeoutRun);
    final String target = url;
    timeoutRun = new Runnable() { @Override public void run() {
      if (!loaded) {
        if (web != null) web.stopLoading();
        showSetup(target, "Pas de réponse de " + target + " après 25 secondes. Le téléphone n’arrive pas à joindre le PC : vérifiez que le PC est allumé, que la plateforme y marche (https://localhost:8787 sur le PC) et que le téléphone est sur le même Wi-Fi que le PC (pas en 4G). Testez aussi l’adresse dans Chrome sur le téléphone." + (lastJsError.isEmpty() ? "" : "\n\nDétail : " + lastJsError));
      }
    } };
    handler.postDelayed(timeoutRun, 25000);
    if (web == null) {
      WebView.setWebContentsDebuggingEnabled(true);
      web = new WebView(this);
      root.addView(web, 0, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
      WebSettings st = web.getSettings();
      st.setJavaScriptEnabled(true);
      st.setDomStorageEnabled(true);
      st.setDatabaseEnabled(true);
      st.setMediaPlaybackRequiresUserGesture(false);
      st.setLoadWithOverviewMode(true);
      st.setUseWideViewPort(true);
      st.setSupportZoom(false);
      st.setTextZoom(100);
      st.setBuiltInZoomControls(false);
      st.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
      st.setCacheMode(WebSettings.LOAD_DEFAULT);
      st.setUserAgentString(st.getUserAgentString() + " FAZA3DApp/4.6");
      CookieManager.getInstance().setAcceptCookie(true);
      CookieManager.getInstance().setAcceptThirdPartyCookies(web, false);
      web.setWebViewClient(new WebViewClient() {
        @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
          Uri u = r.getUrl();
          String sch = u.getScheme() == null ? "" : u.getScheme();
          if (sch.equals("http") || sch.equals("https")) {
            if (sameHost(u)) return false;
            try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ex) { }
            return true;
          }
          try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ex) { Toast.makeText(MainActivity.this, "Aucune application pour ouvrir ce lien", Toast.LENGTH_SHORT).show(); }
          return true;
        }
        @Override public void onReceivedSslError(WebView v, SslErrorHandler h, SslError err) {
          // Certificat de l'atelier (auto-signé) : accepté uniquement pour l'adresse enregistrée.
          if (sameHost(Uri.parse(err.getUrl()))) { h.proceed(); return; }
          h.cancel();
          if (err.getUrl() != null && err.getUrl().startsWith(prefs().getString("url", "§"))) showSetup(prefs().getString("url", ""), "Certificat refusé pour " + err.getUrl());
        }
        @Override public void onPageFinished(WebView v, String u) {
          loaded = true;
          CookieManager.getInstance().flush();   // la connexion est écrite sur le téléphone tout de suite
          String ck = CookieManager.getInstance().getCookie(u);
          if (ck != null && ck.contains("sid=")) { FcmService.register(MainActivity.this); PushService.start(MainActivity.this); if (!FcmService.active(MainActivity.this)) askBatteryOnce(); }
          if (loading != null) loading.setVisibility(View.GONE);
        }
        @Override public void onReceivedHttpError(WebView v, WebResourceRequest r, android.webkit.WebResourceResponse rs) {
          if (r.isForMainFrame() && rs.getStatusCode() >= 500) showSetup(prefs().getString("url", ""), "La plateforme répond une erreur " + rs.getStatusCode() + ". Regardez le journal sur le PC (journal.bat).");
        }
        @Override public void onReceivedError(WebView v, WebResourceRequest r, WebResourceError e) {
          if (r.isForMainFrame()) {
            loaded = true;
            String msg = "Impossible de joindre la plateforme (" + e.getDescription() + "). Vérifiez que le PC de l’atelier est allumé et que le téléphone est sur le même Wi-Fi, puis réessayez.";
            v.loadData("", "text/html", "utf-8");
            showSetup(prefs().getString("url", ""), msg);
          }
        }
      });
      web.setWebChromeClient(new WebChromeClient() {
        @Override public boolean onConsoleMessage(android.webkit.ConsoleMessage m) {
          if (m.messageLevel() == android.webkit.ConsoleMessage.MessageLevel.ERROR) lastJsError = m.message() + " (" + m.sourceId() + ":" + m.lineNumber() + ")";
          return true;
        }
        @Override public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
          if (fileCb != null) fileCb.onReceiveValue(null);
          fileCb = cb;
          Intent i = new Intent(Intent.ACTION_GET_CONTENT);
          i.addCategory(Intent.CATEGORY_OPENABLE);
          i.setType("*/*");
          if (p.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE) i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
          try { startActivityForResult(Intent.createChooser(i, "Choisir un fichier"), FILE_REQ); } catch (Exception ex) { fileCb = null; return false; }
          return true;
        }
        @Override public void onPermissionRequest(PermissionRequest req) {
          // caméra pour les photos de qualité / imprimantes
          for (String r : req.getResources()) if (r.equals(PermissionRequest.RESOURCE_VIDEO_CAPTURE)) {
            if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) { req.grant(req.getResources()); return; }
            pendingPerm = req; requestPermissions(new String[]{Manifest.permission.CAMERA}, 2); return;
          }
          req.deny();
        }
      });
      web.setDownloadListener(new android.webkit.DownloadListener() { @Override public void onDownloadStart(String u, String ua, String cd, String mime, long len) {
        try {
          DownloadManager.Request rq = new DownloadManager.Request(Uri.parse(u));
          String cookies = CookieManager.getInstance().getCookie(u);
          if (cookies != null) rq.addRequestHeader("Cookie", cookies);
          rq.addRequestHeader("User-Agent", ua);
          String name = URLUtil.guessFileName(u, cd, mime);
          rq.setTitle(name);
          rq.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
          rq.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, name);
          ((DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE)).enqueue(rq);
          Toast.makeText(MainActivity.this, "Téléchargement : " + name, Toast.LENGTH_SHORT).show();
        } catch (Exception ex) {
          try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(u))); } catch (Exception e2) { }
        }
      } });
    }
    web.setVisibility(View.VISIBLE);
    String path = getIntent() != null && getIntent().hasExtra("path") ? getIntent().getStringExtra("path") : "/";
    web.loadUrl(url + (path == null ? "/" : path));
  }

  boolean sameHost(Uri u) {
    String base = prefs().getString("url", "");
    try {
      Uri b = Uri.parse(base);
      return u.getHost() != null && u.getHost().equalsIgnoreCase(b.getHost());
    } catch (Exception e) { return false; }
  }

  @Override protected void onNewIntent(Intent i) {
    super.onNewIntent(i);
    setIntent(i);
    String url = prefs().getString("url", null);
    if (url != null && web != null && i.hasExtra("path")) web.loadUrl(url + i.getStringExtra("path"));
  }

  @Override protected void onActivityResult(int req, int res, Intent data) {
    if (req == FILE_REQ && fileCb != null) {
      Uri[] out = null;
      if (res == RESULT_OK && data != null) {
        if (data.getClipData() != null) {
          int n = data.getClipData().getItemCount(); out = new Uri[n];
          for (int k = 0; k < n; k++) out[k] = data.getClipData().getItemAt(k).getUri();
        } else if (data.getData() != null) out = new Uri[]{data.getData()};
      }
      fileCb.onReceiveValue(out); fileCb = null;
      return;
    }
    super.onActivityResult(req, res, data);
  }

  @Override public void onRequestPermissionsResult(int code, String[] perms, int[] res) {
    if (code == 2 && pendingPerm != null) {
      if (res.length > 0 && res[0] == PackageManager.PERMISSION_GRANTED) pendingPerm.grant(pendingPerm.getResources()); else pendingPerm.deny();
      pendingPerm = null;
    }
    if (code == 1) PollJob.schedule(this);
  }

  @Override public void onBackPressed() {
    if (setup != null && prefs().getString("url", null) != null) { open(prefs().getString("url", "")); return; }
    if (web == null || web.getVisibility() != View.VISIBLE) { moveTaskToBack(true); return; }
    web.evaluateJavascript("(window.__fazaBackKey&&window.__fazaBackKey())?1:0", new android.webkit.ValueCallback<String>() {
      @Override public void onReceiveValue(String r) {
        if ("1".equals(r)) return;
        if (web.canGoBack()) web.goBack(); else moveTaskToBack(true);
      }
    });
  }

  @Override protected void onResume() {
    super.onResume();
    PollJob.schedule(this);
    PollJob.clearShown(this);
    PushService.start(this);   // connexion en direct (notifications instantanées)
    if (web != null) try { web.evaluateJavascript("window.__fazaBack&&window.__fazaBack()", null); } catch (Exception e) { }
  }

  /** Une seule fois, après la première connexion : sans cette autorisation, Android coupe la connexion en direct quand l'écran est éteint. */
  void askBatteryOnce() {
    if (Build.VERSION.SDK_INT < 23 || prefs().getBoolean("askedBattery", false)) return;
    android.os.PowerManager pm = (android.os.PowerManager) getSystemService(Context.POWER_SERVICE);
    if (pm == null || pm.isIgnoringBatteryOptimizations(getPackageName())) return;
    prefs().edit().putBoolean("askedBattery", true).apply();
    new android.app.AlertDialog.Builder(this)
      .setTitle("Notifications instantanées")
      .setMessage("Pour recevoir les messages et les demandes à la seconde, même écran éteint, autorisez FAZA 3D Atelier à fonctionner en arrière-plan.")
      .setPositiveButton("Autoriser", new android.content.DialogInterface.OnClickListener() { @Override public void onClick(android.content.DialogInterface d, int w) {
        try { startActivity(new Intent(android.provider.Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:" + getPackageName()))); }
        catch (Exception e) { try { startActivity(new Intent(android.provider.Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)); } catch (Exception e2) { } }
      } })
      .setNegativeButton("Plus tard", null).show();
  }

  // Appui long sur le logo n'existe pas : l'adresse se change depuis le menu système de l'app.
  // Ici : triple appui "retour" rapide depuis la page de connexion ramène à l'écran d'adresse.
  long lastBack = 0; int backCount = 0;
  @Override public boolean onKeyLongPress(int keyCode, android.view.KeyEvent ev) {
    if (keyCode == android.view.KeyEvent.KEYCODE_BACK) {
      new AlertDialog.Builder(this).setTitle("Changer l’adresse de la plateforme ?")
        .setPositiveButton("Changer", new android.content.DialogInterface.OnClickListener() { @Override public void onClick(android.content.DialogInterface d, int w) { showSetup(prefs().getString("url", ""), null); } })
        .setNegativeButton("Annuler", null).show();
      return true;
    }
    return super.onKeyLongPress(keyCode, ev);
  }
  @Override public boolean onKeyDown(int keyCode, android.view.KeyEvent ev) {
    if (keyCode == android.view.KeyEvent.KEYCODE_BACK) { ev.startTracking(); return true; }
    return super.onKeyDown(keyCode, ev);
  }
  @Override public boolean onKeyUp(int keyCode, android.view.KeyEvent ev) {
    if (keyCode == android.view.KeyEvent.KEYCODE_BACK && !ev.isCanceled()) { onBackPressed(); return true; }
    return super.onKeyUp(keyCode, ev);
  }

  @Override protected void onPause() {
    // l'app passe en arrière-plan : la plateforme vous compte « absent » et envoie donc les notifications sur le téléphone
    if (web != null) try { web.evaluateJavascript("window.__fazaAway&&window.__fazaAway()", null); } catch (Exception e) { }
    super.onPause();
    CookieManager.getInstance().flush();   // garder la connexion quand l'app passe en arrière-plan ou est fermée
  }
}
