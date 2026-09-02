package com.monstre.overlay

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Android efface les alarmes au redémarrage du téléphone. On ne peut pas les
 * reprogrammer ici — seule l'application connaît la liste des rendez-vous — mais
 * on note qu'un redémarrage a eu lieu : au prochain lancement, l'application
 * reprogramme tout. C'est aussi ce que fait `rescheduleAll` côté notifications.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return
        context
            .getSharedPreferences("monstre_overlay", Context.MODE_PRIVATE)
            .edit()
            .putBoolean("redemarrage", true)
            .apply()
    }
}
