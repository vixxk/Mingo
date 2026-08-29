package com.talkmingo.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import org.json.JSONObject

/**
 * Shared state + helpers for the native incoming-call experience:
 *  - posts the WhatsApp-style full-screen card notification (with the bundled
 *    ringtone played by [IncomingCallActivity], not the channel sound, so it
 *    loops like a real ringtone),
 *  - tracks whether the React app is in the foreground (the in-app popup owns
 *    the foreground case),
 *  - routes Accept / Decline / Open from the native card into the app.
 */
object IncomingCallNotifications {

    const val CHANNEL_ID = "calls"
    const val NOTIFICATION_ID = 9901

    const val EXTRA_ACTION = "incomingCallAction"
    const val EXTRA_PAYLOAD = "incomingCallPayload"

    const val ACTION_ACCEPT = "accept"
    const val ACTION_DECLINE = "decline"
    const val ACTION_OPEN = "open"
    const val ACTION_TIMEOUT = "timeout"

    // Ring cadence (matches the card's vibration pattern: 1s on, 1s off) and
    // how many rings the card rings before auto-dismissing when unanswered.
    const val RING_INTERVAL_MS = 2_000L
    const val RING_COUNT = 15
    const val RING_TIMEOUT_MS = RING_INTERVAL_MS * RING_COUNT

    /** True while the app's MainActivity is resumed (React app in the foreground).
     *  Defaults to FALSE: when the process starts fresh from a push (app killed
     *  or cold-started), React has not resumed yet, so the native card must show. */
    @Volatile
    var appInForeground: Boolean = false
        private set

    /** True while the React (JS) runtime is alive — used to decide whether a
     *  decline tapped on the native card can be forwarded to JS so it can
     *  reject the call over the socket. */
    @Volatile
    var reactInstanceAlive: Boolean = false

    /** Wired up by [IncomingCallModule] so the native card can push actions
     *  into the running React instance. */
    var emitActionToJs: ((action: String, payloadJson: String) -> Unit)? = null

    @Volatile
    var currentActivity: IncomingCallActivity? = null
        private set

    @Volatile
    private var ringTimeoutRunnable: Runnable? = null

    /** The callId currently being shown / ringing. Used to deduplicate — when
     *  both the socket path and the OneSignal push fire for the same call we
     *  only post the notification once. */
    @Volatile
    private var activeCallId: String? = null

    private val handledCallIds = java.util.concurrent.ConcurrentHashMap.newKeySet<String>()

    fun setAppInForeground(foreground: Boolean) {
        appInForeground = foreground
    }

    fun registerActivity(activity: IncomingCallActivity?) {
        currentActivity = activity
    }

    fun getBundledRingtoneUri(context: Context): Uri =
        Uri.parse("android.resource://${context.packageName}/raw/incoming_ringtone")

    fun ensureCallChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        try { manager.deleteNotificationChannel(CHANNEL_ID) } catch (_: Exception) {}

        val ringtoneUri = getBundledRingtoneUri(context)
        val audioAttrs = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()

        val channel = NotificationChannel(CHANNEL_ID, "Calls", NotificationManager.IMPORTANCE_HIGH)
        channel.description = "Incoming audio and video calls"
        channel.setSound(ringtoneUri, audioAttrs)
        channel.enableVibration(true)
        channel.vibrationPattern = longArrayOf(0, 800, 800, 800, 800, 800)
        channel.lockscreenVisibility = Notification.VISIBILITY_PUBLIC
        manager.createNotificationChannel(channel)
    }

    fun showIncomingCall(context: Context, payload: JSONObject) {
        if (appInForeground) return
        if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) return

        // ── Dedup: skip if already active or already handled for this call ──
        val callId = payload.optString("callId", payload.optString("sessionId", ""))
        if (callId.isNotEmpty() && (callId == activeCallId || handledCallIds.contains(callId))) return
        activeCallId = callId

        val token = payload.optString("token", "")
        val baseUrl = payload.optString("baseUrl", payload.optString("rejectUrl", ""))
        if (token.isNotEmpty() || baseUrl.isNotEmpty()) {
            saveCredentials(context, token, baseUrl)
        }

        try {
            ensureCallChannel(context)
        } catch (e: Exception) {
            // Channel creation failed — still try to post below.
        }

        val callerName = payload.optString("callerName", "Mingo")
        val callType = payload.optString("callType", "audio")
        val title = "Incoming ${if (callType == "video") "Video" else "Audio"} Call"

        // Full-screen intent -> IncomingCallActivity (the card itself)
        val fullScreenPending = PendingIntent.getActivity(
            context, 101,
            buildCardIntent(context, null, payload),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Direct overlay launch over home screen / other apps when unlocked
        try {
            val cardIntent = buildCardIntent(context, null, payload)
            context.startActivity(cardIntent)
        } catch (e: Exception) {
            try {
                fullScreenPending.send()
            } catch (_: Exception) {}
        }

        // Tapping the notification body opens the app and shows the in-app popup
        val openPending = PendingIntent.getActivity(
            context, 102,
            buildMainActivityIntent(context, ACTION_OPEN, payload),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Notification action buttons (tray / heads-up fallback)
        val acceptPending = PendingIntent.getActivity(
            context, 103,
            buildCardIntent(context, ACTION_ACCEPT, payload),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val declinePending = PendingIntent.getActivity(
            context, 104,
            buildCardIntent(context, ACTION_DECLINE, payload),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText("$callerName is calling you")
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setAutoCancel(false)
            .setOngoing(true)
            .setShowWhen(true)
            .setColor(0xFFA855F7.toInt())
            .setVibrate(longArrayOf(0, 800, 800, 800, 800, 800))
            .setContentIntent(openPending)
            .setFullScreenIntent(fullScreenPending, true)
            .addAction(0, "Decline", declinePending)
            .addAction(0, "Accept", acceptPending)
            // Let the channel sound play for the heads-up fallback case.
            // The IncomingCallActivity will handle its own looping ringtone.

        try {
            NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, builder.build())
        } catch (e: Exception) {
            // Posting failed (e.g. permission race) — nothing else to do.
        }

        // Auto-dismiss after the ring count if the listener never answers — the
        // card must not ring forever when the caller's app is also backgrounded
        // (so it can't emit call_cancelled). Reset on every re-post.
        scheduleRingTimeout(context, payload)
    }

    /** Stops the ringtone (via the activity), dismisses the notification and
     *  closes the card. */
    fun stopIncomingCall(context: Context) {
        cancelRingTimeout()
        activeCallId?.let { if (it.isNotEmpty()) handledCallIds.add(it) }
        activeCallId = null
        try {
            NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID)
        } catch (e: Exception) {
            // ignore
        }
        dismissCard()
    }

    /** Displays a single missed call notification in the system notification shade (NO-OP). */
    fun showMissedCallNotification(context: Context, title: String, body: String) {
        // Disabled completely per system design
    }

    /** The listener never answered within the ring count — dismiss the card and
     *  ringtone, and (when the app is alive) tell JS to reject the call over the
     *  socket so the caller is not left hanging. When the app is killed there is
     *  no socket to reject on; the caller-side ring timeout cancels the session
     *  server-side instead. */
    fun onRingTimeout(context: Context, payload: JSONObject) {
        stopIncomingCall(context)
        if (reactInstanceAlive) {
            emitActionToJs?.invoke(ACTION_TIMEOUT, payload.toString())
        }
        sendRejectCallRequest(context, payload)
    }

    private fun scheduleRingTimeout(context: Context, payload: JSONObject) {
        cancelRingTimeout()
        val runnable = Runnable {
            ringTimeoutRunnable = null
            onRingTimeout(context, payload)
        }
        ringTimeoutRunnable = runnable
        Handler(Looper.getMainLooper()).postDelayed(runnable, RING_TIMEOUT_MS)
    }

    private fun cancelRingTimeout() {
        val runnable = ringTimeoutRunnable
        if (runnable != null) {
            Handler(Looper.getMainLooper()).removeCallbacks(runnable)
            ringTimeoutRunnable = null
        }
    }

    /** Closes the card (stops the ringtone) but leaves the notification in the
     *  shade — used when the app returns to the foreground and the in-app
     *  popup takes over, so a call is never silently dropped if the socket
     *  missed the event. */
    fun dismissCard() {
        currentActivity?.let { activity ->
            if (!activity.isFinishing) activity.finish()
        }
    }

    /** Saves token and API base URL into SharedPreferences so native background actions can make authenticated calls. */
    fun saveCredentials(context: Context, token: String?, baseUrl: String?) {
        try {
            val prefs = context.getSharedPreferences("IncomingCallPrefs", Context.MODE_PRIVATE)
            val editor = prefs.edit()
            if (!token.isNullOrEmpty()) editor.putString("authToken", token)
            if (!baseUrl.isNullOrEmpty()) editor.putString("baseUrl", baseUrl)
            editor.apply()
        } catch (_: Exception) {}
    }

    fun getStoredAuthToken(context: Context): String? {
        try {
            val prefs = context.getSharedPreferences("IncomingCallPrefs", Context.MODE_PRIVATE)
            val token = prefs.getString("authToken", null)
            if (!token.isNullOrEmpty()) return token

            val asyncPrefs = context.getSharedPreferences("RKStorage", Context.MODE_PRIVATE)
            val asyncToken = asyncPrefs.getString("token", null) ?: asyncPrefs.getString("@token", null)
            if (!asyncToken.isNullOrEmpty()) return asyncToken
        } catch (_: Exception) {}
        return null
    }

    fun getStoredApiBaseUrl(context: Context): String? {
        try {
            val prefs = context.getSharedPreferences("IncomingCallPrefs", Context.MODE_PRIVATE)
            val baseUrl = prefs.getString("baseUrl", null)
            if (!baseUrl.isNullOrEmpty()) return baseUrl

            val asyncPrefs = context.getSharedPreferences("RKStorage", Context.MODE_PRIVATE)
            val asyncUrl = asyncPrefs.getString("baseUrl", null) ?: asyncPrefs.getString("apiUrl", null)
            if (!asyncUrl.isNullOrEmpty()) return asyncUrl
        } catch (_: Exception) {}
        return null
    }

    /** Handles Accept / Decline / Open pressed on the native card. */
    fun handleCardAction(context: Context, action: String, payload: JSONObject) {
        stopIncomingCall(context)
        when (action) {
            ACTION_ACCEPT -> {
                // Always route into the React app — cold start if it was killed.
                launchMainActivity(context, action, payload)
            }
            ACTION_DECLINE -> {
                if (reactInstanceAlive) {
                    // App is running in the background — let JS reject over the socket.
                    emitActionToJs?.invoke(action, payload.toString())
                }
                sendRejectCallRequest(context, payload)
            }
            ACTION_OPEN -> {
                launchMainActivity(context, action, payload)
            }
        }
    }

    private fun sendRejectCallRequest(context: Context, payload: JSONObject) {
        val callId = payload.optString("callId", payload.optString("sessionId", payload.optString("id", "")))
        if (callId.isEmpty()) return
        Thread {
            try {
                var apiUrl = payload.optString("rejectUrl", "")
                if (apiUrl.isBlank()) {
                    val baseUrl = getStoredApiBaseUrl(context)
                    if (!baseUrl.isNullOrBlank()) {
                        val cleanBase = if (baseUrl.endsWith("/")) baseUrl.dropLast(1) else baseUrl
                        apiUrl = if (cleanBase.endsWith("/call/reject")) cleanBase
                                 else if (cleanBase.endsWith("/api")) "$cleanBase/call/reject"
                                 else "$cleanBase/api/call/reject"
                    } else {
                        apiUrl = "https://backend.themingo.app/api/call/reject"
                    }
                }
                val url = java.net.URL(apiUrl)
                val conn = url.openConnection() as java.net.HttpURLConnection
                conn.requestMethod = "POST"
                conn.setRequestProperty("Content-Type", "application/json")

                val token = getStoredAuthToken(context)
                if (!token.isNullOrBlank()) {
                    conn.setRequestProperty("Authorization", "Bearer $token")
                }

                conn.connectTimeout = 5000
                conn.readTimeout = 5000
                conn.doOutput = true
                val body = JSONObject().apply {
                    put("sessionId", callId)
                    put("reason", "busy")
                }.toString()
                conn.outputStream.use { os ->
                    os.write(body.toByteArray(Charsets.UTF_8))
                }
                val responseCode = conn.responseCode
                android.util.Log.d("IncomingCallNative", "sendRejectCallRequest completed with status $responseCode for callId $callId to $apiUrl")
                conn.disconnect()
            } catch (e: Exception) {
                android.util.Log.e("IncomingCallNative", "sendRejectCallRequest failed: ${e.message}", e)
            }
        }.start()
    }

    fun launchMainActivity(context: Context, action: String, payload: JSONObject) {
        try {
            context.startActivity(buildMainActivityIntent(context, action, payload))
        } catch (e: Exception) {
            // Rare launch failure — nothing sensible to do.
        }
    }

    /** Intent that launches MainActivity carrying the card action + payload. */
    fun buildMainActivityIntent(context: Context, actionStr: String, payload: JSONObject): Intent =
        Intent().apply {
            component = ComponentName(context.packageName, "${context.packageName}.MainActivity")
            this.action = Intent.ACTION_MAIN
            addCategory(Intent.CATEGORY_LAUNCHER)
            putExtra(EXTRA_ACTION, actionStr)
            putExtra(EXTRA_PAYLOAD, payload.toString())
            addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP
            )
        }

    /** Intent that opens (or resumes) the card. When [action] is non-null the
     *  activity performs that action immediately instead of showing the UI. */
    fun buildCardIntent(context: Context, action: String?, payload: JSONObject): Intent =
        Intent(context, IncomingCallActivity::class.java).apply {
            if (action != null) putExtra(EXTRA_ACTION, action)
            putExtra(EXTRA_PAYLOAD, payload.toString())
            addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP or
                    Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
            )
        }
}
