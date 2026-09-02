package com.monstre.overlay

import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Color
import android.graphics.PixelFormat
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.Settings
import android.view.Gravity
import android.view.MotionEvent
import android.view.WindowManager
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewClientCompat
import kotlin.math.abs
import kotlin.random.Random

/**
 * La créature vient marcher sur l'écran, par-dessus les autres applications,
 * pour rappeler un rendez-vous.
 *
 * Point essentiel : ce service **ne tourne pas en permanence**. Il est démarré
 * par une alarme à l'heure du rappel, et il s'arrête tout seul — quand on
 * touche la créature, ou au bout de quelques minutes si personne ne réagit.
 * Entre deux rendez-vous, il n'existe pas, et ne consomme donc rien.
 */
class OverlayService : Service() {

    companion object {
        @Volatile var isRunning: Boolean = false
        const val ACTION_STOP = "com.monstre.overlay.STOP"
        const val EXTRA_TEXT = "texte"
        const val EXTRA_WHEN = "quand"
        const val EXTRA_SPRITE = "sprite"
        const val EXTRA_TIMEOUT = "duree"
        private const val CHANNEL_ID = "monstre_rappel"
        private const val NOTIF_ID = 4243
        private const val TICK_MS = 33L
        private const val ARRIVE = 12.0
        // Durée maximale par défaut. Un rappel qui resterait indéfiniment à
        // l'écran serait une gêne, et une dépense de batterie pour rien.
        private const val DEFAULT_TIMEOUT_MS = 180_000L
    }

    private lateinit var windowManager: WindowManager
    private var petView: WebView? = null
    private lateinit var params: WindowManager.LayoutParams
    private val handler = Handler(Looper.getMainLooper())

    private var posX = 0f
    private var posY = 0f
    private var sizePx = 0
    private var dragging = false
    private var idleUntil = 0L
    private var nextDecision = 0L
    private var facingLeft = false
    private var ready = false
    private var speed = 3.4f
    private var targetX = 0f
    private var targetY = 0f
    private var hasTarget = false

    private var reminderText = ""
    private var reminderWhen = ""
    private var spritePath = ""

    override fun onBind(intent: Intent?): IBinder? = null

    @SuppressLint("SetJavaScriptEnabled", "ClickableViewAccessibility")
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            stopSelf()
            return START_NOT_STICKY
        }

        reminderText = intent?.getStringExtra(EXTRA_TEXT) ?: "Rendez-vous"
        reminderWhen = intent?.getStringExtra(EXTRA_WHEN) ?: ""
        spritePath = intent?.getStringExtra(EXTRA_SPRITE) ?: ""
        val timeout = intent?.getLongExtra(EXTRA_TIMEOUT, DEFAULT_TIMEOUT_MS) ?: DEFAULT_TIMEOUT_MS

        if (isRunning) {
            // Déjà affiché : on met simplement le texte à jour.
            pushMessage()
            return START_NOT_STICKY
        }

        if (!Settings.canDrawOverlays(this)) {
            stopSelf()
            return START_NOT_STICKY
        }

        isRunning = true
        startInForeground()
        buildView()

        // Filet de sécurité : au-delà du délai, la créature rentre d'elle-même.
        handler.postDelayed({ stopSelf() }, timeout)
        // START_NOT_STICKY : si le système tue le service, il ne le relance pas.
        // Un rappel manqué vaut mieux qu'un service qui ressuscite sans raison.
        return START_NOT_STICKY
    }

    @SuppressLint("SetJavaScriptEnabled", "ClickableViewAccessibility")
    private fun buildView() {
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        sizePx = (150 * resources.displayMetrics.density).toInt()

        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        val view = WebView(this).apply {
            setBackgroundColor(Color.TRANSPARENT)
            webViewClient = object : WebViewClientCompat() {
                override fun shouldInterceptRequest(
                    v: WebView,
                    request: WebResourceRequest
                ): WebResourceResponse? = assetLoader.shouldInterceptRequest(request.url)
            }
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = false
                mediaPlaybackRequiresUserGesture = false
            }
        }
        petView = view

        params = WindowManager.LayoutParams(
            sizePx * 2,
            sizePx,
            overlayType(),
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = 40
            y = 300
        }

        val (sw, _) = screenSize()
        posX = (sw - sizePx * 2 - 40).toFloat().coerceAtLeast(0f)
        posY = 300f

        attachTouch(view)
        windowManager.addView(view, params)
        view.loadUrl("https://appassets.androidplatform.net/assets/monstre_overlay.html")
        view.postDelayed({
            ready = true
            pushMessage()
        }, 500)
        handler.postDelayed(mover, TICK_MS)
    }

    private fun pushMessage() {
        val texte = reminderText.replace("'", "\\'")
        val quand = reminderWhen.replace("'", "\\'")
        val sprite = spritePath.replace("'", "\\'")
        petView?.evaluateJavascript(
            "window.rappel && window.rappel('$texte', '$quand', '$sprite');", null
        )
    }

    private val mover = object : Runnable {
        override fun run() {
            if (ready && !dragging) step()
            handler.postDelayed(this, TICK_MS)
        }
    }

    private fun step() {
        val now = System.currentTimeMillis()
        val (sw, sh) = screenSize()
        val maxX = (sw - sizePx * 2).coerceAtLeast(1)
        val maxY = (sh - sizePx).coerceAtLeast(1)

        if (now < idleUntil) return

        val dx = targetX - posX
        val dy = targetY - posY
        val dist = Math.hypot(dx.toDouble(), dy.toDouble())

        if (!hasTarget || dist < ARRIVE || now > nextDecision) {
            decideNext(now, maxX, maxY)
            return
        }

        val ux = (dx / dist).toFloat()
        val uy = (dy / dist).toFloat()
        posX = (posX + ux * speed).coerceIn(0f, maxX.toFloat())
        posY = (posY + uy * speed * 0.4f).coerceIn(0f, maxY.toFloat())

        val left = ux < 0f
        if (left != facingLeft) {
            facingLeft = left
            petView?.evaluateJavascript("window.setFlip && window.setFlip($left);", null)
        }

        params.x = posX.toInt()
        params.y = posY.toInt()
        applyLayout.run()
    }

    private fun decideNext(now: Long, maxX: Int, maxY: Int) {
        if (Random.nextInt(10) < 3) {
            // Une pause de temps en temps : marcher sans arrêt a l'air mécanique.
            idleUntil = now + Random.nextLong(1200, 2600)
            hasTarget = false
            petView?.evaluateJavascript("window.setMarche && window.setMarche(false);", null)
            return
        }
        targetX = pickFar(posX, maxX)
        targetY = Random.nextInt(0, maxY + 1).toFloat()
        hasTarget = true
        speed = Random.nextDouble(2.6, 4.4).toFloat()
        petView?.evaluateJavascript("window.setMarche && window.setMarche(true);", null)
        nextDecision = now + Random.nextLong(7000, 12000)
    }

    private fun pickFar(cur: Float, maxX: Int): Float {
        val w = maxX.toFloat()
        repeat(6) {
            val t = Random.nextInt(0, maxX + 1).toFloat()
            if (abs(t - cur) > w * 0.35f) return t
        }
        return (maxX.toFloat() - cur).coerceIn(0f, maxX.toFloat())
    }

    private val applyLayout = Runnable {
        petView?.let {
            if (it.isAttachedToWindow) {
                try { windowManager.updateViewLayout(it, params) } catch (_: Exception) {}
            }
        }
    }

    @SuppressLint("ClickableViewAccessibility")
    private fun attachTouch(view: WebView) {
        var downX = 0f; var downY = 0f
        var startX = 0; var startY = 0
        var downTime = 0L
        var moved = false
        val slop = 14 * resources.displayMetrics.density

        view.setOnTouchListener { _, e ->
            when (e.action) {
                MotionEvent.ACTION_DOWN -> {
                    dragging = true; moved = false
                    downX = e.rawX; downY = e.rawY
                    startX = params.x; startY = params.y
                    downTime = System.currentTimeMillis()
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    val dx = e.rawX - downX
                    val dy = e.rawY - downY
                    if (abs(dx) > slop || abs(dy) > slop) moved = true
                    val (sw, sh) = screenSize()
                    params.x = (startX + dx).toInt().coerceIn(0, (sw - sizePx * 2).coerceAtLeast(0))
                    params.y = (startY + dy).toInt().coerceIn(0, (sh - sizePx).coerceAtLeast(0))
                    posX = params.x.toFloat(); posY = params.y.toFloat()
                    applyLayout.run()
                    true
                }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                    dragging = false
                    val quick = System.currentTimeMillis() - downTime < 600
                    if (!moved && quick) {
                        // On la touche : elle rentre chez elle. C'est le geste
                        // qui acquitte le rappel.
                        petView?.evaluateJavascript("window.rentre && window.rentre();", null)
                        handler.postDelayed({ stopSelf() }, 700)
                    }
                    true
                }
                else -> false
            }
        }
    }

    private fun startInForeground() {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val ch = NotificationChannel(CHANNEL_ID, "Rappels", NotificationManager.IMPORTANCE_LOW)
            nm.createNotificationChannel(ch)
        }

        val stopPI = PendingIntent.getService(
            this, 1,
            Intent(this, OverlayService::class.java).setAction(ACTION_STOP),
            PendingIntent.FLAG_IMMUTABLE
        )

        val builder = Notification.Builder(this, CHANNEL_ID)
            .setContentTitle(reminderText)
            .setContentText(reminderWhen)
            .setSmallIcon(android.R.drawable.ic_popup_reminder)
            .setOngoing(true)
            .addAction(Notification.Action.Builder(null, "C'est noté", stopPI).build())

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(NOTIF_ID, builder.build(), ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
        } else {
            startForeground(NOTIF_ID, builder.build())
        }
    }

    private fun overlayType(): Int =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        else
            @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE

    private fun screenSize(): Pair<Int, Int> =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            val b = windowManager.currentWindowMetrics.bounds
            Pair(b.width(), b.height())
        } else {
            val dm = resources.displayMetrics
            Pair(dm.widthPixels, dm.heightPixels)
        }

    override fun onDestroy() {
        super.onDestroy()
        isRunning = false
        handler.removeCallbacksAndMessages(null)
        petView?.let {
            try { if (it.isAttachedToWindow) windowManager.removeView(it) } catch (_: Exception) {}
            it.destroy()
        }
        petView = null
    }
}
