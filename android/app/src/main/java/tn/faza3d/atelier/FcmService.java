package tn.faza3d.atelier;

import android.content.Context;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.webkit.CookieManager;

import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.Task;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.RemoteMessage;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Map;

import javax.net.ssl.HttpsURLConnection;

/**
 * Notifications par le service de Google (Firebase Cloud Messaging), comme WhatsApp :
 * le téléphone garde une seule connexion partagée avec Google, et l'app est réveillée seulement quand
 * une notification arrive. Quand la plateforme confirme qu'elle envoie par Google, la connexion directe
 * (PushService) n'est plus lancée. Sans services Google sur le téléphone, l'ancien système reste en place.
 */
public class FcmService extends com.google.firebase.messaging.FirebaseMessagingService {

  /** Après connexion : récupère le jeton du téléphone et le donne à la plateforme. */
  public static void register(final Context c) {
    try {
      FirebaseMessaging.getInstance().getToken().addOnCompleteListener(new OnCompleteListener<String>() {
        @Override public void onComplete(Task<String> t) {
          if (!t.isSuccessful() || t.getResult() == null) { setActive(c, false); return; }
          send(c, t.getResult());
        }
      });
    } catch (Exception e) { setActive(c, false); }
  }

  /** Envoie le jeton à la plateforme (en arrière-plan). Réponse : la plateforme envoie-t-elle par Google ? */
  static void send(final Context c, final String token) {
    new Thread(new Runnable() { @Override public void run() {
      SharedPreferences sp = c.getSharedPreferences(MainActivity.PREFS, Context.MODE_PRIVATE);
      String base = sp.getString("url", null);
      if (base == null) return;
      String cookies = CookieManager.getInstance().getCookie(base);
      if (cookies == null || !cookies.contains("sid=")) return;
      try {
        URL u = new URL(base + "/api/push/fcm");
        HttpURLConnection con = (HttpURLConnection) u.openConnection();
        if (con instanceof HttpsURLConnection) PollJob.relax((HttpsURLConnection) con, Uri.parse(base).getHost());
        con.setConnectTimeout(10000); con.setReadTimeout(10000);
        con.setRequestMethod("POST"); con.setDoOutput(true);
        con.setRequestProperty("Cookie", cookies);
        con.setRequestProperty("Content-Type", "application/json");
        con.setRequestProperty("X-Faza", "1");
        con.setRequestProperty("User-Agent", "FAZA3DApp/4.6");
        JSONObject body = new JSONObject();
        body.put("token", token);
        body.put("device", (Build.MANUFACTURER + " " + Build.MODEL).trim());
        OutputStream os = con.getOutputStream(); os.write(body.toString().getBytes("UTF-8")); os.close();
        int code = con.getResponseCode();
        boolean actif = false;
        if (code == 200) {
          java.io.BufferedReader r = new java.io.BufferedReader(new java.io.InputStreamReader(con.getInputStream(), "UTF-8"));
          StringBuilder sb = new StringBuilder(); String line; while ((line = r.readLine()) != null) sb.append(line); r.close();
          actif = new JSONObject(sb.toString()).optBoolean("actif", false);
        }
        con.disconnect();
        sp.edit().putString("fcmToken", token).apply();
        setActive(c, actif);
      } catch (Exception e) { }
    } }, "faza3d-fcm").start();
  }

  static void setActive(Context c, boolean on) {
    SharedPreferences sp = c.getSharedPreferences(MainActivity.PREFS, Context.MODE_PRIVATE);
    boolean was = sp.getBoolean("fcm", false);
    sp.edit().putBoolean("fcm", on).apply();
    if (on) PushService.stop(c);              // plus besoin de la connexion directe ni de sa barre
    else if (was) PushService.start(c);       // retour à l'ancien système
  }

  static boolean active(Context c) {
    return c.getSharedPreferences(MainActivity.PREFS, Context.MODE_PRIVATE).getBoolean("fcm", false);
  }

  @Override public void onNewToken(String token) { send(this, token); }

  @Override public void onMessageReceived(RemoteMessage msg) {
    Map<String, String> d = msg.getData();
    if (d == null || d.isEmpty()) return;
    long id = 0; try { id = Long.parseLong(d.get("id")); } catch (Exception e) { }
    String title = d.get("title") != null ? d.get("title") : "FAZA 3D Atelier";
    String body = d.get("body") != null ? d.get("body") : "";
    String url = d.get("url") != null ? d.get("url") : "/";
    SharedPreferences sp = getSharedPreferences(MainActivity.PREFS, MODE_PRIVATE);
    synchronized (PollJob.LOCK) {   // jamais deux fois la même notification, même si la vérification périodique la relit
      long cur = sp.getLong("last", 0);
      if (id > 0 && id <= cur) return;
      PollJob.show(this, id > 0 ? (int) id : (int) (System.currentTimeMillis() % 100000), title, body, url);
      if (id > cur) sp.edit().putLong("last", id).apply();
    }
  }
}
