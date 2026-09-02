package com.monstre.overlay

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

/**
 * Réveillé par l'alarme à l'heure du rappel. Il ne fait qu'une chose : lancer
 * le service d'affichage. C'est ce qui permet de ne rien laisser tourner entre
 * deux rendez-vous — le système se charge du réveil, l'application dort.
 */
class AlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val service = Intent(context, OverlayService::class.java).apply {
            putExtra(OverlayService.EXTRA_TEXT, intent.getStringExtra(OverlayService.EXTRA_TEXT))
            putExtra(OverlayService.EXTRA_WHEN, intent.getStringExtra(OverlayService.EXTRA_WHEN))
            putExtra(OverlayService.EXTRA_SPRITE, intent.getStringExtra(OverlayService.EXTRA_SPRITE))
            putExtra(
                OverlayService.EXTRA_TIMEOUT,
                intent.getLongExtra(OverlayService.EXTRA_TIMEOUT, 180_000L)
            )
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(service)
        } else {
            context.startService(service)
        }
    }
}
