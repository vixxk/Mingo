package app.themingo

import android.app.Activity
import android.app.PendingIntent
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.facebook.drawee.backends.pipeline.Fresco
import com.facebook.drawee.generic.RoundingParams
import com.facebook.drawee.view.SimpleDraweeView
import org.json.JSONObject

/**
 * The WhatsApp-style incoming-call screen shown by the full-screen intent.
 *
 * Renders a compact card at the top ~10-15% of the screen (just below the
 * notification bar) with the caller's avatar, "Incoming Audio/Video Call",
 * the caller's name and Accept / Decline buttons. While it is visible it plays
 * the bundled ringtone in a loop (a notification sound only plays once, which
 * is not a ringtone) and vibrates.
 *
 * The activity is also the target of the notification's Accept/Decline action
 * buttons: when it receives an intent with [IncomingCallNotifications.EXTRA_ACTION]
 * it performs that action immediately (Accept/Open launch MainActivity — cold
 * start if the app was killed; Decline forwards to JS when the app is alive)
 * instead of showing the UI.
 */
class IncomingCallActivity : Activity() {

    private var ringtonePlayer: MediaPlayer? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        IncomingCallNotifications.registerActivity(this)

        val payloadStr = intent.getStringExtra(IncomingCallNotifications.EXTRA_PAYLOAD)
        if (payloadStr == null) {
            finish()
            return
        }
        val payload = JSONObject(payloadStr)
        val action = intent.getStringExtra(IncomingCallNotifications.EXTRA_ACTION)

        if (action != null) {
            // Tapped an Accept/Decline/Open action button (or re-delivered intent).
            IncomingCallNotifications.handleCardAction(this, action, payload)
            finish()
            return
        }

        // Wake + show over the lock screen / any app (like a real phone call).
        window.addFlags(
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
        )

        setContentView(buildUi(payload))
        startRinging(payload)
        startVibrating()

        // The notification channel plays the ringtone sound once for the
        // heads-up fallback. Now that IncomingCallActivity is open and playing
        // its own looping ringtone, re-post the notification silently so the
        // channel sound stops and doesn't overlap.
        silenceChannelNotification(payload)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        val action = intent.getStringExtra(IncomingCallNotifications.EXTRA_ACTION)
        val payloadStr = intent.getStringExtra(IncomingCallNotifications.EXTRA_PAYLOAD)
        if (action != null && payloadStr != null) {
            IncomingCallNotifications.handleCardAction(this, action, JSONObject(payloadStr))
            finish()
        }
    }

    override fun onStop() {
        super.onStop()
        stopRinging()
        stopVibrating()
    }

    override fun onDestroy() {
        stopRinging()
        stopVibrating()
        IncomingCallNotifications.registerActivity(null)
        super.onDestroy()
    }

    // ── Ringtone + vibration ─────────────────────────────────────

    private fun startRinging(payload: JSONObject) {
        val customUrl = payload.optString("customRingtoneUrl")
        if (customUrl.isNotBlank()) {
            try {
                val parsed = Uri.parse(customUrl)
                if (parsed.scheme == "http" || parsed.scheme == "https") {
                    ringtonePlayer = MediaPlayer().apply {
                        setAudioAttributes(
                            AudioAttributes.Builder()
                                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                                .build()
                        )
                        setDataSource(this@IncomingCallActivity, parsed)
                        isLooping = true
                        setOnErrorListener { _, _, _ ->
                            playBundledRingtone()
                            true
                        }
                        setOnPreparedListener { start() }
                        prepareAsync()
                    }
                    return
                }
            } catch (e: Exception) {
                // Fall back to bundled ringtone
            }
        }
        playBundledRingtone()
    }

    private fun playBundledRingtone() {
        try {
            stopRinging()
            val uri = IncomingCallNotifications.getBundledRingtoneUri(this)
            ringtonePlayer = MediaPlayer().apply {
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
                setDataSource(this@IncomingCallActivity, uri)
                isLooping = true
                prepare()
                start()
            }
        } catch (e: Exception) {
            // Final fallback to system default ringtone
            try {
                val defaultUri = android.media.RingtoneManager.getDefaultUri(android.media.RingtoneManager.TYPE_RINGTONE)
                ringtonePlayer = MediaPlayer().apply {
                    setAudioAttributes(
                        AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .build()
                    )
                    setDataSource(this@IncomingCallActivity, defaultUri)
                    isLooping = true
                    prepare()
                    start()
                }
            } catch (_: Exception) {
                ringtonePlayer = null
            }
        }
    }

    private fun stopRinging() {
        try {
            ringtonePlayer?.stop()
        } catch (e: Exception) {
            // ignore
        }
        ringtonePlayer?.release()
        ringtonePlayer = null
    }

    private fun startVibrating() {
        try {
            val vibrator = getSystemService(VIBRATOR_SERVICE) as Vibrator
            val pattern = longArrayOf(0, 1000, 1000)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0))
            } else {
                @Suppress("DEPRECATION")
                vibrator.vibrate(pattern, 0)
            }
        } catch (e: Exception) {
            // ignore
        }
    }

    private fun stopVibrating() {
        try {
            val vibrator = getSystemService(VIBRATOR_SERVICE) as Vibrator
            vibrator.cancel()
        } catch (e: Exception) {
            // ignore
        }
    }

    /**
     * Re-posts the call notification silently to cut the channel's one-shot
     * ringtone sound. The activity's MediaPlayer loop is already running, so
     * we don't want both playing at once.
     */
    private fun silenceChannelNotification(payload: JSONObject) {
        try {
            val callerName = payload.optString("callerName", "Mingo")
            val callType = payload.optString("callType", "audio")
            val title = "Incoming ${if (callType == "video") "Video" else "Audio"} Call"

            val openPending = PendingIntent.getActivity(
                this, 102,
                IncomingCallNotifications.buildMainActivityIntent(this, IncomingCallNotifications.ACTION_OPEN, payload),
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val builder = NotificationCompat.Builder(this, IncomingCallNotifications.CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText("$callerName is calling you")
                .setCategory(NotificationCompat.CATEGORY_CALL)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setAutoCancel(false)
                .setOngoing(true)
                .setSilent(true)
                .setContentIntent(openPending)
                .setColor(0xFFA855F7.toInt())

            NotificationManagerCompat.from(this).notify(IncomingCallNotifications.NOTIFICATION_ID, builder.build())
        } catch (e: Exception) {
            // Silencing failed — the channel sound will play its one-shot and stop.
        }
    }

    // ── UI ───────────────────────────────────────────────────────

    private fun buildUi(payload: JSONObject): View {
        val callerName = payload.optString("callerName", "Mingo User")
        val callType = payload.optString("callType", "audio")
        val isVideo = callType == "video"
        val dp = resources.displayMetrics.density
        val screenWidth = resources.displayMetrics.widthPixels
        val screenHeight = resources.displayMetrics.heightPixels

        // Full screen root layout with dark gradient background
        val root = FrameLayout(this).apply {
            background = GradientDrawable(
                GradientDrawable.Orientation.TOP_BOTTOM,
                intArrayOf(0xFF0A0A0F.toInt(), 0xFF141028.toInt(), 0xFF09090E.toInt())
            )
        }

        // 1. Top Bar Header - Mingo Logo Image (Top Left)
        val logoImage = android.widget.ImageView(this).apply {
            scaleType = android.widget.ImageView.ScaleType.FIT_START
            try {
                val resId = resources.getIdentifier("mingo_logo", "drawable", packageName)
                if (resId != 0) {
                    setImageResource(resId)
                }
            } catch (_: Exception) {}
        }
        val logoParams = FrameLayout.LayoutParams(
            (screenWidth * 0.40f).toInt(),
            (screenHeight * 0.06f).toInt()
        ).apply {
            topMargin = (screenHeight * 0.05f).toInt()
            leftMargin = (screenWidth * 0.05f).toInt()
            gravity = Gravity.TOP or Gravity.START
        }
        root.addView(logoImage, logoParams)

        // 2. Center Section (Avatar + Caller Name + Subtitle)
        val centerCol = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
        }

        // Avatar size: 36% of screen width
        val avatarSizePx = (screenWidth * 0.36f).toInt()
        val avatarView = buildAvatar(callerName, avatarSizePx, dp, payload.optString("callerPhoto"))
        centerCol.addView(avatarView, LinearLayout.LayoutParams(avatarSizePx, avatarSizePx))

        val nameView = TextView(this).apply {
            text = callerName
            setTextColor(Color.WHITE)
            textSize = 24f
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
            maxLines = 1
        }
        val nameParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
            topMargin = (screenHeight * 0.03f).toInt()
        }
        centerCol.addView(nameView, nameParams)

        val subtitleView = TextView(this).apply {
            text = if (isVideo) "Incoming Video Call..." else "Incoming Audio Call..."
            setTextColor(0xFFC084FC.toInt()) // Light purple
            textSize = 16f
            typeface = Typeface.DEFAULT
            gravity = Gravity.CENTER
        }
        val subtitleParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
            topMargin = (screenHeight * 0.01f).toInt()
        }
        centerCol.addView(subtitleView, subtitleParams)

        val centerParams = FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.WRAP_CONTENT
        ).apply {
            topMargin = (screenHeight * 0.26f).toInt()
            gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
        }
        root.addView(centerCol, centerParams)

        // 3. Bottom Actions Section (Decline Red & Pick Call Green)
        val actionsRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
        }

        val btnSizePx = (screenWidth * 0.18f).toInt()

        // Red Decline Column
        val declineCol = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
        }
        val declineBtn = buildActionButton("\u2715", 0xFFEF4444.toInt(), btnSizePx)
        declineBtn.setOnClickListener {
            IncomingCallNotifications.handleCardAction(this, IncomingCallNotifications.ACTION_DECLINE, payload)
            finish()
        }
        val declineLabel = TextView(this).apply {
            text = "Decline"
            setTextColor(0xFFEF4444.toInt())
            textSize = 14f
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
        }
        val labelParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
            topMargin = (10 * dp).toInt()
        }
        declineCol.addView(declineBtn, LinearLayout.LayoutParams(btnSizePx, btnSizePx))
        declineCol.addView(declineLabel, labelParams)

        // Green Accept Column
        val acceptCol = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
        }
        val acceptIcon = if (isVideo) "\uD83C\uDFA5" else "\uD83D\uDCDE"
        val acceptBtn = buildActionButton(acceptIcon, 0xFF10B981.toInt(), btnSizePx)
        acceptBtn.setOnClickListener {
            IncomingCallNotifications.handleCardAction(this, IncomingCallNotifications.ACTION_ACCEPT, payload)
            finish()
        }
        val acceptLabel = TextView(this).apply {
            text = "Pick Call"
            setTextColor(0xFF10B981.toInt())
            textSize = 14f
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
        }
        acceptCol.addView(acceptBtn, LinearLayout.LayoutParams(btnSizePx, btnSizePx))
        acceptCol.addView(acceptLabel, LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
            topMargin = (10 * dp).toInt()
        })

        val btnSpacing = (screenWidth * 0.18f).toInt()
        actionsRow.addView(declineCol)
        actionsRow.addView(acceptCol, LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
            leftMargin = btnSpacing
        })

        val actionsParams = FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.WRAP_CONTENT
        ).apply {
            bottomMargin = (screenHeight * 0.08f).toInt()
            gravity = Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL
        }
        root.addView(actionsRow, actionsParams)

        return root
    }

    private fun buildAvatar(name: String, sizePx: Int, dp: Float, photoUrl: String): View {
        val ring = FrameLayout(this)
        ring.background = GradientDrawable().apply {
            shape = GradientDrawable.OVAL
            setColor(0xFF1E1B2E.toInt())
            setStroke((3 * dp).toInt(), 0xFFA855F7.toInt())
        }
        val innerSize = (sizePx * 0.90f).toInt()

        val circle = FrameLayout(this).apply {
            background = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(0xFF2A2A2A.toInt())
            }
        }
        val letter = TextView(this).apply {
            text = name.firstOrNull()?.uppercase() ?: "?"
            setTextColor(Color.WHITE)
            textSize = 36f
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
        }
        circle.addView(letter, FrameLayout.LayoutParams(innerSize, innerSize, Gravity.CENTER))

        if (photoUrl.isNotBlank()) {
            try {
                if (!Fresco.hasBeenInitialized()) {
                    Fresco.initialize(this)
                }
                val photo = SimpleDraweeView(this).apply {
                    hierarchy?.setRoundingParams(RoundingParams.asCircle())
                }
                photo.setImageURI(Uri.parse(photoUrl))
                circle.addView(photo, FrameLayout.LayoutParams(innerSize, innerSize, Gravity.CENTER))
            } catch (_: Exception) {}
        }

        ring.addView(circle, FrameLayout.LayoutParams(innerSize, innerSize, Gravity.CENTER))
        return ring
    }

    private fun buildActionButton(label: String, color: Int, sizePx: Int): TextView =
        TextView(this).apply {
            text = label
            textSize = 24f
            gravity = Gravity.CENTER
            setTextColor(Color.WHITE)
            background = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(color)
            }
        }
}
