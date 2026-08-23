package app.themingo

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat

/**
 * Foreground service that keeps the app's process alive while a call is in
 * progress.  Without this Android 10+ aggressively suspends the app when it
 * moves to the background, which causes Agora RTC to lose its mic/camera
 * capture and audio playout.
 *
 * The service posts a low-priority ongoing notification ("Call in progress")
 * and acquires a partial wake-lock so the CPU keeps running even if the
 * screen turns off.
 */
class CallForegroundService : Service() {

    companion object {
        const val CHANNEL_ID = "call_ongoing"
        const val NOTIFICATION_ID = 9902
        const val ACTION_START = "app.themingo.action.START_CALL_SERVICE"
        const val ACTION_STOP = "app.themingo.action.STOP_CALL_SERVICE"

        @Volatile
        var isRunning = false
            private set

        fun start(context: Context) {
            if (isRunning) return
            val intent = Intent(context, CallForegroundService::class.java).apply {
                action = ACTION_START
            }
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(intent)
                } else {
                    context.startService(intent)
                }
            } catch (e: Exception) {
                // Best-effort — some OEMs restrict startForegroundService from the background.
            }
        }

        fun stop(context: Context) {
            if (!isRunning) return
            try {
                val intent = Intent(context, CallForegroundService::class.java).apply {
                    action = ACTION_STOP
                }
                context.startService(intent)
            } catch (e: Exception) {
                // ignore
            }
        }
    }

    private var wakeLock: PowerManager.WakeLock? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> {
                stopSelf()
                return START_NOT_STICKY
            }
        }

        ensureChannel()

        val pendingIntent = PendingIntent.getActivity(
            this, 0,
            Intent().apply {
                component = ComponentName(packageName, "$packageName.MainActivity")
                action = Intent.ACTION_MAIN
                addCategory(Intent.CATEGORY_LAUNCHER)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("Call in progress")
            .setContentText("Tap to return to your call")
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setOngoing(true)
            .setShowWhen(false)
            .setColor(0xFFA855F7.toInt())
            .setContentIntent(pendingIntent)
            .build()

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                // Android 14+ requires specifying foreground service type
                startForeground(NOTIFICATION_ID, notification,
                    android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE)
            } else {
                startForeground(NOTIFICATION_ID, notification)
            }
        } catch (e: Exception) {
            // If we can't start foreground, stop immediately to avoid ANR
            stopSelf()
            return START_NOT_STICKY
        }

        isRunning = true

        // Acquire a partial wake lock so the CPU doesn't sleep during the call
        if (wakeLock == null) {
            val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
            wakeLock = pm.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "mingo:call_foreground"
            ).apply {
                acquire(4 * 60 * 60 * 1000L) // Max 4 hours
            }
        }

        return START_STICKY
    }

    override fun onDestroy() {
        isRunning = false
        try { wakeLock?.release() } catch (_: Exception) {}
        wakeLock = null
        super.onDestroy()
    }

    private fun ensureChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (manager.getNotificationChannel(CHANNEL_ID) != null) return
        val channel = NotificationChannel(
            CHANNEL_ID, "Ongoing Call",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Shows while a call is in progress to keep the call active"
            setShowBadge(false)
            lockscreenVisibility = Notification.VISIBILITY_PUBLIC
        }
        manager.createNotificationChannel(channel)
    }
}
