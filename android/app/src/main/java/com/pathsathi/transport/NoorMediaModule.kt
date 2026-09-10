package com.pathsathi.transport

import android.app.Activity
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Matrix
import android.media.ExifInterface
import android.graphics.pdf.PdfDocument
import android.text.Layout
import android.text.StaticLayout
import android.text.TextPaint
import android.util.Base64
import com.facebook.react.bridge.*
import com.facebook.react.ReactPackage
import com.facebook.react.uimanager.ViewManager
import java.io.ByteArrayOutputStream

class NoorMediaModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  private var pending: Promise? = null
  private var document: String? = null
  private var documentMime: String? = null
  private val photoCode = 7612
  private val documentCode = 7613
  override fun getName() = "NoorMedia"

  init {
    context.addActivityEventListener(object : BaseActivityEventListener() {
      override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode != photoCode && requestCode != documentCode) return
        val promise = pending ?: return
        pending = null
        val content = document
        val mime = documentMime
        document = null
        documentMime = null
        if (resultCode != Activity.RESULT_OK || data?.data == null) {
          promise.resolve(if (requestCode == documentCode) false else null)
          return
        }
        val uri = data.data!!
        Thread {
          try {
            if (requestCode == documentCode) {
              context.contentResolver.openOutputStream(uri, "wt")?.use { stream ->
                if (mime == "application/pdf") {
                  val pdf = PdfDocument()
                  try {
                    val paint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.rgb(25, 55, 45); textSize = 12f }
                    val text = content ?: ""
                    val layout = StaticLayout.Builder.obtain(text, 0, text.length, paint, 515).setAlignment(Layout.Alignment.ALIGN_NORMAL).setLineSpacing(4f, 1f).build()
                    var firstLine = 0
                    var number = 1
                    while (firstLine < layout.lineCount) {
                      val top = layout.getLineTop(firstLine)
                      var lastLine = firstLine
                      while (lastLine + 1 < layout.lineCount && layout.getLineBottom(lastLine + 1) - top <= 750) lastLine++
                      val height = layout.getLineBottom(lastLine) - top
                      val page = pdf.startPage(PdfDocument.PageInfo.Builder(595, 842, number++).create())
                      page.canvas.save()
                      page.canvas.clipRect(40, 40, 555, 40 + height)
                      page.canvas.translate(40f, 40f - top)
                      layout.draw(page.canvas)
                      page.canvas.restore()
                      pdf.finishPage(page)
                      firstLine = lastLine + 1
                    }
                    pdf.writeTo(stream)
                  } finally { pdf.close() }
                } else stream.write((content ?: "").toByteArray(Charsets.UTF_8))
              }
                ?: throw IllegalStateException("Could not open the selected file")
              promise.resolve(true)
            } else {
              val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
              context.contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, bounds) }
              if (bounds.outWidth <= 0 || bounds.outHeight <= 0) throw IllegalArgumentException("Please choose a valid image")
              var sample = 1
              while (bounds.outWidth / sample > 960 || bounds.outHeight / sample > 960) sample *= 2
              val options = BitmapFactory.Options().apply { inSampleSize = sample }
              val original = context.contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, options) }
                ?: throw IllegalArgumentException("Could not read the selected image")
              // Camera photos commonly encode orientation in EXIF rather than pixels.
              val orientation = try {
                context.contentResolver.openInputStream(uri)?.use {
                  ExifInterface(it).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)
                } ?: ExifInterface.ORIENTATION_NORMAL
              } catch (_: Exception) { ExifInterface.ORIENTATION_NORMAL }
              val matrix = Matrix().apply {
                when (orientation) {
                  ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> setScale(-1f, 1f)
                  ExifInterface.ORIENTATION_ROTATE_180 -> setRotate(180f)
                  ExifInterface.ORIENTATION_FLIP_VERTICAL -> setScale(1f, -1f)
                  ExifInterface.ORIENTATION_TRANSPOSE -> { setRotate(90f); postScale(-1f, 1f) }
                  ExifInterface.ORIENTATION_ROTATE_90 -> setRotate(90f)
                  ExifInterface.ORIENTATION_TRANSVERSE -> { setRotate(-90f); postScale(-1f, 1f) }
                  ExifInterface.ORIENTATION_ROTATE_270 -> setRotate(-90f)
                }
              }
              val oriented = if (matrix.isIdentity) original else Bitmap.createBitmap(original, 0, 0, original.width, original.height, matrix, true)
              val scale = minOf(1f, 480f / maxOf(oriented.width, oriented.height))
              val bitmap = Bitmap.createScaledBitmap(oriented, maxOf(1, (oriented.width * scale).toInt()), maxOf(1, (oriented.height * scale).toInt()), true)
              val output = ByteArrayOutputStream()
              bitmap.compress(Bitmap.CompressFormat.JPEG, 82, output)
              val bytes = output.toByteArray()
              if (bitmap !== oriented) bitmap.recycle()
              if (oriented !== original) oriented.recycle()
              original.recycle()
              if (bytes.size > 300_000) throw IllegalArgumentException("Please choose a smaller photo")
              promise.resolve("data:image/jpeg;base64," + Base64.encodeToString(bytes, Base64.NO_WRAP))
            }
          } catch (error: Exception) {
            promise.reject("MEDIA_ERROR", error.message, error)
          }
        }.start()
      }
    })
  }

  @ReactMethod
  fun pickPhoto(promise: Promise) {
    val activity = reactApplicationContext.currentActivity
    if (activity == null || pending != null) { promise.reject("UNAVAILABLE", "Please try again when the app is ready"); return }
    pending = promise
    try {
      val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply { type = "image/*"; addCategory(Intent.CATEGORY_OPENABLE) }
      activity.startActivityForResult(intent, photoCode)
    } catch (error: Exception) { pending = null; promise.reject("MEDIA_ERROR", error.message, error) }
  }

  @ReactMethod
  fun saveDocument(filename: String, content: String, mimeType: String, promise: Promise) {
    val activity = reactApplicationContext.currentActivity
    if (activity == null || pending != null) { promise.reject("UNAVAILABLE", "Please try again when the app is ready"); return }
    pending = promise
    document = content
    documentMime = mimeType
    try {
      val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
        type = mimeType; addCategory(Intent.CATEGORY_OPENABLE); putExtra(Intent.EXTRA_TITLE, filename)
      }
      activity.startActivityForResult(intent, documentCode)
    } catch (error: Exception) { pending = null; document = null; documentMime = null; promise.reject("MEDIA_ERROR", error.message, error) }
  }
}

class NoorMediaPackage : ReactPackage {
  override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> = listOf(NoorMediaModule(context))
  override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}
