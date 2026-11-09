package tn.faza3d.atelier;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.job.JobInfo;
import android.app.job.JobParameters;
import android.app.job.JobScheduler;
import android.app.job.JobService;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.webkit.CookieManager;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.cert.X509Certificate;

import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;

/** Toutes les 15 minutes : vérifie les notifications en attente (secours) et relance la connexion en direct. */
public class PollJob extends JobService {
  static final int JOB_ID = 3101;
  static final String CH = "faza3d";

  public static void schedule(Context c) {
    JobScheduler js = (JobScheduler) c.getSystemService(Context.JOB_SCHEDULER_SERVICE);
    if (js == null) return;
    if (js.getPendingJob(JOB_ID) != null) return;
    JobInfo.Builder b = new JobInfo.Builder(JOB_ID, new ComponentName(c, PollJob.class))
      .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
      .setPersisted(true)
      .setPeriodic(15 * 60 * 1000L);
    js.schedule(b.build());
  }

  public static void clearShown(Context c) {
    NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
    if (nm != null) nm.cancelAll();
  }

  @Override public boolean onStartJob(final JobParameters p) {
    new Thread(new Runnable() { @Override public void run() {
      try { pollOnce(PollJob.this, false); } catch (Exception e) { }
      PushService.start(PollJob.this);   // relance la connexion en direct si Android l'a arrêtée
      jobFinished(p, false);
    } }).start();
    return true;
  }

  @Override public boolean onStopJob(JobParameters p) { return true; }

  static final Object LOCK = new Object();

  /** Lit les notifications en attente. wait = true : la plateforme garde la requête ouverte jusqu'à la prochaine notification (45 s max).
   *  Renvoie le code HTTP (401 = pas connecté). */
  static int pollOnce(Context c, boolean wait) throws Exception {
    SharedPreferences sp = c.getSharedPreferences(MainActivity.PREFS, MODE_PRIVATE);
    String base = sp.getString("url", null);
    if (base == null) return 401;
    String cookies = CookieManager.getInstance().getCookie(base);
    if (cookies == null || !cookies.contains("sid=")) return 401;
    long since = sp.getLong("last", 0);
    URL u = new URL(base + (wait ? "/api/push/wait?since=" : "/api/push/poll?since=") + since);
    HttpURLConnection con = (HttpURLConnection) u.openConnection();
    if (con instanceof HttpsURLConnection) relax((HttpsURLConnection) con, Uri.parse(base).getHost());
    con.setConnectTimeout(10000); con.setReadTimeout(wait ? 70000 : 10000);
    con.setRequestProperty("Cookie", cookies);
    con.setRequestProperty("X-Faza", "1");
    con.setRequestProperty("User-Agent", "FAZA3DApp/4.6");
    int code = con.getResponseCode();
    if (code != 200) { con.disconnect(); return code; }
    BufferedReader r = new BufferedReader(new InputStreamReader(con.getInputStream(), "UTF-8"));
    StringBuilder sb = new StringBuilder(); String line;
    while ((line = r.readLine()) != null) sb.append(line);
    r.close();
    JSONObject o = new JSONObject(sb.toString());
    JSONArray items = o.optJSONArray("items");
    synchronized (LOCK) {   // la connexion en direct et la vérification périodique ne montrent jamais deux fois la même notification
      long cur = sp.getLong("last", 0), max = cur;
      if (items != null) for (int i = 0; i < items.length(); i++) {
        JSONObject it = items.getJSONObject(i);
        long id = it.optLong("id", 0);
        if (id <= cur) continue;
        show(c, (int) id, it.optString("title", "FAZA 3D Atelier"), it.optString("body", ""), it.optString("url", "/"));
        if (id > max) max = id;
      }
      long last = Math.max(max, o.optLong("last", cur));
      if (last > cur) sp.edit().putLong("last", last).apply();
    }
    return 200;
  }

  /** Le certificat de l'atelier est auto-signé : on l'accepte seulement pour l'adresse enregistrée. */
  static void relax(HttpsURLConnection con, final String host) {
    try {
      SSLContext ctx = SSLContext.getInstance("TLS");
      ctx.init(null, new TrustManager[]{new X509TrustManager() {
        public void checkClientTrusted(X509Certificate[] c, String a) { }
        public void checkServerTrusted(X509Certificate[] c, String a) { }
        public X509Certificate[] getAcceptedIssuers() { return new X509Certificate[0]; }
      }}, null);
      con.setSSLSocketFactory(ctx.getSocketFactory());
      con.setHostnameVerifier(new javax.net.ssl.HostnameVerifier() { @Override public boolean verify(String h, javax.net.ssl.SSLSession s) { return h.equalsIgnoreCase(host); } });
    } catch (Exception e) { }
  }

  static void show(Context c, int id, String title, String body, String path) {
    NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
    if (nm == null) return;
    if (Build.VERSION.SDK_INT >= 26) {
      NotificationChannel ch = new NotificationChannel(CH, "FAZA 3D Atelier", NotificationManager.IMPORTANCE_HIGH);
      ch.setDescription("Messages, impressions terminées, nouvelles demandes");
      nm.createNotificationChannel(ch);
    }
    Intent i = new Intent(c, MainActivity.class);
    i.putExtra("path", path.startsWith("/") ? path : "/");
    i.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
    PendingIntent pi = PendingIntent.getActivity(c, id, i, PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0));
    Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(c, CH) : new Notification.Builder(c);
    b.setSmallIcon(R.drawable.ic_notif).setContentTitle(title).setContentText(body)
      .setStyle(new Notification.BigTextStyle().bigText(body))
      .setAutoCancel(true).setContentIntent(pi);
    if (Build.VERSION.SDK_INT < 26) b.setPriority(Notification.PRIORITY_HIGH).setDefaults(Notification.DEFAULT_ALL);
    nm.notify(id, b.build());
  }
}
