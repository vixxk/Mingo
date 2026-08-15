package app.themingo

import android.app.Activity
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
        try {
            val customUrl = payload.optString("customRingtoneUrl")
            val uri = if (customUrl.isNotBlank()) {
                try {
                    val parsed = Uri.parse(customUrl)
                    if (parsed.scheme == "http" || parsed.scheme == "https") parsed
                    else IncomingCallNotifications.getBundledRingtoneUri(this)
                } catch (e: Exception) {
                    IncomingCallNotifications.getBundledRingtoneUri(this)
                }
            } else {
                IncomingCallNotifications.getBundledRingtoneUri(this)
            }
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
            ringtonePlayer = null
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

    // ── UI ───────────────────────────────────────────────────────

    private fun buildUi(payload: JSONObject): View {
        val callerName = payload.optString("callerName", "Mingo")
        val callType = payload.optString("callType", "audio")
        val dp = resources.displayMetrics.density
        val screenHeight = resources.displayMetrics.heightPixels

        // Dim scrim behind the card — the app beneath stays visible.
        val root = FrameLayout(this).apply {
            setBackgroundColor(0x66000000)
        }

        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            elevation = 16f * dp
            setPadding((18 * dp).toInt(), (16 * dp).toInt(), (18 * dp).toInt(), (16 * dp).toInt())
            background = GradientDrawable().apply {
                cornerRadius = 24 * dp
                setColor(0xFF1F1F1F.toInt())
            }
        }

        // Row 1: avatar + caller info
        val infoRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }
        val avatar = buildAvatar(callerName, 52f, dp, payload.optString("callerPhoto"))
        infoRow.addView(avatar, LinearLayout.LayoutParams((52 * dp).toInt(), (52 * dp).toInt()))

        val infoCol = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
        }
        infoCol.addView(
            TextView(this).apply {
                text = "Incoming ${if (callType == "video") "Video" else "Audio"} Call"
                setTextColor(0xFFC084FC.toInt())
                textSize = 12f
                typeface = Typeface.DEFAULT_BOLD
            }
        )
        infoCol.addView(
            TextView(this).apply {
                text = callerName
                setTextColor(Color.WHITE)
                textSize = 17f
                typeface = Typeface.DEFAULT_BOLD
            }
        )
        infoRow.addView(
            infoCol,
            LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply {
                leftMargin = (14 * dp).toInt()
            }
        )
        card.addView(infoRow)

        // Row 2: decline + accept buttons
        val actionRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.END
        }
        val btnSize = 48f * dp
        val decline = buildActionButton("\u2715", 0xFFEF4444.toInt())
        val acceptIcon = if (callType == "video") "\uD83C\uDFA5" else "\uD83D\uDCDE"
        val accept = buildActionButton(acceptIcon, 0xFF22C55E.toInt())

        decline.setOnClickListener {
            IncomingCallNotifications.handleCardAction(this, IncomingCallNotifications.ACTION_DECLINE, payload)
            finish()
        }
        accept.setOnClickListener {
            IncomingCallNotifications.handleCardAction(this, IncomingCallNotifications.ACTION_ACCEPT, payload)
            finish()
        }

        actionRow.addView(decline, LinearLayout.LayoutParams(btnSize.toInt(), btnSize.toInt()).apply {
            rightMargin = (14 * dp).toInt()
        })
        actionRow.addView(accept, LinearLayout.LayoutParams(btnSize.toInt(), btnSize.toInt()))
        card.addView(
            actionRow,
            LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
                topMargin = (14 * dp).toInt()
            }
        )

        // Card pinned to the top ~10% of the screen, below the notification bar.
        val cardParams = FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.WRAP_CONTENT
        ).apply {
            topMargin = (screenHeight * 0.10f).toInt()
            leftMargin = (16 * dp).toInt()
            rightMargin = (16 * dp).toInt()
        }
        root.addView(card, cardParams)

        return root
    }

    private fun buildAvatar(name: String, size: Float, dp: Float, photoUrl: String): View {
        val ring = FrameLayout(this)
        ring.background = GradientDrawable().apply {
            shape = GradientDrawable.OVAL
            setColor(Color.TRANSPARENT)
            setStroke((2 * dp).toInt(), 0xFFA855F7.toInt())
        }
        val innerSize = (size * 0.86f).toInt()

        // Dark circle + initial-letter fallback (visible until the photo loads,
        // or if the photo URL is missing/fails).
        val circle = FrameLayout(this).apply {
            background = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(0xFF2A2A2A.toInt())
            }
        }
        val letter = TextView(this).apply {
            text = name.firstOrNull()?.uppercase() ?: "?"
            setTextColor(Color.WHITE)
            textSize = 18f
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
        }
        circle.addView(letter, FrameLayout.LayoutParams(innerSize, innerSize, Gravity.CENTER))

        // The caller's real photo on top (Fresco — already shipped with RN). It
        // covers the letter once loaded; on failure it stays transparent so the
        // letter fallback shows through.
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
            } catch (e: Exception) {
                // Photo load unavailable — the letter fallback remains.
            }
        }

        ring.addView(circle, FrameLayout.LayoutParams(innerSize, innerSize, Gravity.CENTER))
        return ring
    }

    private fun buildActionButton(label: String, color: Int): TextView =
        TextView(this).apply {
            text = label
            textSize = 22f
            gravity = Gravity.CENTER
            setTextColor(Color.WHITE)
            background = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(color)
            }
        }
}
