package tn.faza3d.atelier;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.IBinder;

/** Connexion en direct avec la plateforme : les notifications arrivent tout de suite, même app fermée.
 *  Android impose une petite notification permanente pour un service qui tourne en arrière-plan. */
public class PushService extends Service {
  static final int FG_ID = 3201;
  static final String CH_SVC = "faza3d_direct";
  private volatile boolean running;
  private Thread worker;

  public static void start(Context c) {
    SharedPreferences sp = c.getSharedPreferences(MainActivity.PREFS, Context.MODE_PRIVATE);
    if (sp.getString("url", null) == null) return;
    if (sp.getBoolean("fcm", false)) return;   // les notifications passent par Google : pas de connexion directe
    Intent i = new Intent(c, PushService.class);
    try { if (Build.VERSION.SDK_INT >= 26) c.startForegroundService(i); else c.startService(i); }
    catch (Exception e) { }   // Android refuse parfois un démarrage en arrière-plan : la vérification toutes les 15 min prend le relais
  }

  public static void stop(Context c) {
    try { c.stopService(new Intent(c, PushService.class)); } catch (Exception e) { }
  }

  @Override public int onStartCommand(Intent intent, int flags, int startId) {
    goForeground();
    if (FcmService.active(this)) { running = false; stopForeground(true); stopSelf(); return START_NOT_STICKY; }
    if (worker == null || !worker.isAlive()) {
      running = true;
      worker = new Thread(new Runnable() { @Override public void run() { loop(); } }, "faza3d-direct");
      worker.start();
    }
    return START_STICKY;
  }

  private void goForeground() {
    NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
    if (Build.VERSION.SDK_INT >= 26 && nm != null) {
      NotificationChannel ch = new NotificationChannel(CH_SVC, "Connexion en direct", NotificationManager.IMPORTANCE_MIN);
      ch.setDescription("Notification fixe imposée par Android : vous pouvez la masquer ici sans couper les notifications.");
      ch.setShowBadge(false);
      ch.setLockscreenVisibility(Notification.VISIBILITY_SECRET);
      ch.setSound(null, null); ch.enableVibration(false);
      nm.createNotificationChannel(ch);
    }
    Intent i = new Intent(this, MainActivity.class);
    i.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
    PendingIntent pi = PendingIntent.getActivity(this, 0, i, PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0));
    Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(this, CH_SVC) : new Notification.Builder(this);
    b.setSmallIcon(R.drawable.ic_notif).setContentTitle("FAZA 3D Atelier").setContentText("Notifications instantanées actives")
      .setOngoing(false).setShowWhen(false).setOnlyAlertOnce(true).setVisibility(Notification.VISIBILITY_SECRET).setContentIntent(pi);
    if (Build.VERSION.SDK_INT < 26) b.setPriority(Notification.PRIORITY_MIN);
    Notification n = b.build();
    if (Build.VERSION.SDK_INT >= 34) startForeground(FG_ID, n, 0x40000000 /* ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE */);
    else startForeground(FG_ID, n);
  }

  private void loop() {
    long backoff = 2000;
    while (running) {
      int code;
      try { code = PollJob.pollOnce(this, true); } catch (Exception e) { code = -1; }
      if (!running) break;
      try {
        if (code == 200) { backoff = 2000; continue; }            // réponse reçue : on se remet tout de suite en attente
        if (code == 401 || code == 403) Thread.sleep(5 * 60000L);  // déconnecté : on réessaie dans 5 minutes
        else { Thread.sleep(backoff); backoff = Math.min(backoff * 2, 60000); }   // pas de réseau / serveur en redémarrage
      } catch (InterruptedException ie) { break; }
    }
  }

  // l'app est balayée des applications récentes : on relance la connexion en direct 1 seconde après
  @Override public void onTaskRemoved(Intent rootIntent) {
    if (!FcmService.active(this)) scheduleRestart(this, 1000);
    super.onTaskRemoved(rootIntent);
  }

  static void scheduleRestart(Context c, long delay) {
    try {
      Intent i = new Intent(c, PushService.class);
      int fl = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
      PendingIntent pi = Build.VERSION.SDK_INT >= 26 ? PendingIntent.getForegroundService(c, 7, i, fl) : PendingIntent.getService(c, 7, i, fl);
      android.app.AlarmManager am = (android.app.AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
      if (am != null) am.set(android.app.AlarmManager.ELAPSED_REALTIME_WAKEUP, android.os.SystemClock.elapsedRealtime() + delay, pi);
    } catch (Exception e) { }
  }

  @Override public void onDestroy() {
    if (running && !FcmService.active(this)) scheduleRestart(this, 5000);   // arrêté par le système : nouvel essai dans 5 s
    running = false;
    if (worker != null) worker.interrupt();
    super.onDestroy();
  }

  @Override public IBinder onBind(Intent intent) { return null; }
}
