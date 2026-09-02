package com.monstre.overlay

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * Pont entre le jeu et la créature qui marche sur l'écran.
 *
 * Le modèle d'activation est le point important : rien ne tourne en fond. On
 * programme une alarme exacte à l'heure du rappel, le système réveille
 * l'application à ce moment-là, la créature apparaît quelques minutes, puis
 * tout s'éteint. Le coût en batterie entre deux rendez-vous est nul.
 */
@CapacitorPlugin(name = "MonstreOverlay")
class OverlayPlugin : Plugin() {

    private fun alarms(): AlarmManager =
        context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

    // Les valeurs sont lues avec les méthodes `opt*` de org.json, dont JSObject
    // hérite. Elles sont garanties par la plateforme Android et renvoient une
    // valeur par défaut au lieu de lever une exception.
    //
    // `JSObject.getInteger()` n'existe pas — contrairement à `PluginCall`, qui
    // l'expose. Les deux classes se ressemblent assez pour qu'on s'y trompe, et
    // la compilation Kotlin s'arrête net dessus.
    private fun pendingFor(id: String, data: JSObject?): PendingIntent {
        val intent = Intent(context, AlarmReceiver::class.java).apply {
            action = "com.monstre.overlay.RAPPEL.$id"
            putExtra(OverlayService.EXTRA_TEXT, data?.optString("text", "Rendez-vous") ?: "Rendez-vous")
            putExtra(OverlayService.EXTRA_WHEN, data?.optString("when", "") ?: "")
            putExtra(OverlayService.EXTRA_SPRITE, data?.optString("sprite", "") ?: "")
            putExtra(
                OverlayService.EXTRA_TIMEOUT,
                (data?.optInt("timeoutMs", 180000) ?: 180000).toLong()
            )
        }
        return PendingIntent.getBroadcast(
            context,
            id.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    @PluginMethod
    fun isSupported(call: PluginCall) {
        call.resolve(JSObject().put("supported", true))
    }

    @PluginMethod
    fun hasPermission(call: PluginCall) {
        call.resolve(JSObject().put("granted", Settings.canDrawOverlays(context)))
    }

    /**
     * L'autorisation « par-dessus les autres applications » ne se demande pas
     * par une boîte de dialogue : il faut ouvrir les réglages système. On y
     * emmène l'utilisateur, et le jeu vérifiera à son retour.
     */
    @PluginMethod
    fun requestPermission(call: PluginCall) {
        if (Settings.canDrawOverlays(context)) {
            call.resolve(JSObject().put("granted", true))
            return
        }
        val intent = Intent(
            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
            Uri.parse("package:" + context.packageName)
        ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
        call.resolve(JSObject().put("granted", false).put("opened", true))
    }

    @PluginMethod
    fun schedule(call: PluginCall) {
        val id = call.getString("id") ?: return call.reject("id manquant")
        val at = call.data.optLong("at", 0L)
        if (at <= 0L) return call.reject("date manquante")
        if (at <= System.currentTimeMillis()) {
            call.resolve(JSObject().put("scheduled", false).put("reason", "date passee"))
            return
        }

        val pending = pendingFor(id, call.data)
        val manager = alarms()
        try {
            // Alarme exacte, y compris en veille profonde : un rappel qui
            // arrive avec vingt minutes de retard ne sert à rien.
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !manager.canScheduleExactAlarms()) {
                manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending)
                call.resolve(JSObject().put("scheduled", true).put("exact", false))
                return
            }
            manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending)
            call.resolve(JSObject().put("scheduled", true).put("exact", true))
        } catch (e: SecurityException) {
            manager.set(AlarmManager.RTC_WAKEUP, at, pending)
            call.resolve(JSObject().put("scheduled", true).put("exact", false))
        }
    }

    @PluginMethod
    fun cancel(call: PluginCall) {
        val id = call.getString("id") ?: return call.reject("id manquant")
        alarms().cancel(pendingFor(id, call.data))
        call.resolve()
    }

    /** Affiche tout de suite, sans attendre : sert au bouton d'essai. */
    @PluginMethod
    fun show(call: PluginCall) {
        if (!Settings.canDrawOverlays(context)) {
            call.resolve(JSObject().put("shown", false).put("reason", "permission"))
            return
        }
        val intent = Intent(context, OverlayService::class.java).apply {
            putExtra(OverlayService.EXTRA_TEXT, call.data.optString("text", "Coucou"))
            putExtra(OverlayService.EXTRA_WHEN, call.data.optString("when", ""))
            putExtra(OverlayService.EXTRA_SPRITE, call.data.optString("sprite", ""))
            putExtra(OverlayService.EXTRA_TIMEOUT, call.data.optInt("timeoutMs", 60000).toLong())
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(intent)
        else context.startService(intent)
        call.resolve(JSObject().put("shown", true))
    }

    @PluginMethod
    fun hide(call: PluginCall) {
        context.startService(
            Intent(context, OverlayService::class.java).setAction(OverlayService.ACTION_STOP)
        )
        call.resolve()
    }
}
