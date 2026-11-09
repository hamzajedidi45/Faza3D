package tn.faza3d.atelier;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Au démarrage du téléphone et après une mise à jour de l'app : relance la connexion en direct. */
public class BootReceiver extends BroadcastReceiver {
  @Override public void onReceive(Context c, Intent i) {
    PollJob.schedule(c);
    PushService.start(c);
  }
}
