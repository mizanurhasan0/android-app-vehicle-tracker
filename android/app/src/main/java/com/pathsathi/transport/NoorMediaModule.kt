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
import androidx.core.content.FileProvider
import com.facebook.react.bridge.*
import com.facebook.react.ReactPackage
import com.facebook.react.uimanager.ViewManager
import java.io.ByteArrayOutputStream
import java.io.File

class NoorMediaModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  private var pending: Promise? = null
  private var document: String? = null
  private var documentMime: String? = null
  private var photoSize = 480
  private val photoCode = 7612
  private val documentCode = 7613
  private val dataFileCode = 7614
  override fun getName() = "NoorMedia"

  init {
    context.addActivityEventListener(object : BaseActivityEventListener() {
      override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode != photoCode && requestCode != documentCode && requestCode != dataFileCode) return
        val promise = pending ?: return
        pending = null
        val maxPhotoSize = photoSize
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
            if (requestCode == dataFileCode) {
              val metadata = context.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
                if (!cursor.moveToFirst()) null else Arguments.createMap().apply {
                  val nameColumn = cursor.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME)
                  val sizeColumn = cursor.getColumnIndex(android.provider.OpenableColumns.SIZE)
                  putString("uri", uri.toString())
                  putString("name", if (nameColumn >= 0) cursor.getString(nameColumn) else "import-file")
                  putString("mimeType", context.contentResolver.getType(uri) ?: "application/octet-stream")
                  if (sizeColumn >= 0 && !cursor.isNull(sizeColumn)) putDouble("size", cursor.getLong(sizeColumn).toDouble())
                }
              } ?: Arguments.createMap().apply {
                putString("uri", uri.toString())
                putString("name", "import-file")
                putString("mimeType", context.contentResolver.getType(uri) ?: "application/octet-stream")
              }
              val bytes = context.contentResolver.openInputStream(uri)?.use { stream ->
                val output = ByteArrayOutputStream()
                val buffer = ByteArray(8192)
                var total = 0
                while (true) {
                  val read = stream.read(buffer)
                  if (read < 0) break
                  total += read
                  if (total > 512 * 1024) throw IllegalArgumentException("The import file must be 512 KB or smaller")
                  output.write(buffer, 0, read)
                }
                output.toByteArray()
              } ?: throw IllegalArgumentException("Could not read the selected file")
              metadata.putString("contentBase64", Base64.encodeToString(bytes, Base64.NO_WRAP))
              promise.resolve(metadata)
            } else if (requestCode == documentCode) {
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
                } else if (mime?.startsWith("base64:") == true) {
                  stream.write(Base64.decode(content ?: "", Base64.DEFAULT))
                } else stream.write((content ?: "").toByteArray(Charsets.UTF_8))
              }
                ?: throw IllegalStateException("Could not open the selected file")
              promise.resolve(true)
            } else {
              val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
              context.contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, bounds) }
              if (bounds.outWidth <= 0 || bounds.outHeight <= 0) throw IllegalArgumentException("Please choose a valid image")
              var sample = 1
              while (bounds.outWidth / sample > maxPhotoSize * 2 || bounds.outHeight / sample > maxPhotoSize * 2) sample *= 2
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
              val scale = minOf(1f, maxPhotoSize.toFloat() / maxOf(oriented.width, oriented.height))
              val bitmap = Bitmap.createScaledBitmap(oriented, maxOf(1, (oriented.width * scale).toInt()), maxOf(1, (oriented.height * scale).toInt()), true)
              val output = ByteArrayOutputStream()
              var quality = 90
              do {
                output.reset()
                bitmap.compress(Bitmap.CompressFormat.JPEG, quality, output)
                quality -= 10
              } while (output.size() > 300_000 && quality >= 50)
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
  fun pickPhoto(promise: Promise) = openPhoto(480, promise)

  @ReactMethod
  fun pickPaymentPhoto(promise: Promise) = openPhoto(1280, promise)

  private fun openPhoto(size: Int, promise: Promise) {
    val activity = reactApplicationContext.currentActivity
    if (activity == null || pending != null) { promise.reject("UNAVAILABLE", "Please try again when the app is ready"); return }
    pending = promise
    photoSize = size
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

  @ReactMethod
  fun pickDataFile(promise: Promise) {
    val activity = reactApplicationContext.currentActivity
    if (activity == null || pending != null) { promise.reject("UNAVAILABLE", "Please try again when the app is ready"); return }
    pending = promise
    try {
      val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
        type = "*/*"
        addCategory(Intent.CATEGORY_OPENABLE)
        putExtra(Intent.EXTRA_MIME_TYPES, arrayOf(
          "text/csv",
          "text/comma-separated-values",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ))
      }
      activity.startActivityForResult(intent, dataFileCode)
    } catch (error: Exception) { pending = null; promise.reject("MEDIA_ERROR", error.message, error) }
  }

  @ReactMethod
  fun saveBase64Document(filename: String, base64: String, mimeType: String, promise: Promise) {
    val activity = reactApplicationContext.currentActivity
    if (activity == null || pending != null) { promise.reject("UNAVAILABLE", "Please try again when the app is ready"); return }
    pending = promise
    document = base64
    documentMime = "base64:$mimeType"
    try {
      val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
        type = mimeType; addCategory(Intent.CATEGORY_OPENABLE); putExtra(Intent.EXTRA_TITLE, filename)
      }
      activity.startActivityForResult(intent, documentCode)
    } catch (error: Exception) { pending = null; document = null; documentMime = null; promise.reject("MEDIA_ERROR", error.message, error) }
  }

  @ReactMethod
  fun shareBase64Document(filename: String, base64: String, mimeType: String, promise: Promise) {
    val activity = reactApplicationContext.currentActivity
    if (activity == null) { promise.reject("UNAVAILABLE", "Please try again when the app is ready"); return }
    try {
      val shareDir = File(context.cacheDir, "shared-exports").apply { mkdirs() }
      shareDir.listFiles()?.forEach { it.delete() }
      val safeName = filename.replace(Regex("[^A-Za-z0-9._-]"), "_")
      val file = File(shareDir, safeName)
      file.writeBytes(Base64.decode(base64, Base64.DEFAULT))
      val uri = FileProvider.getUriForFile(context, context.packageName + ".files", file)
      val intent = Intent(Intent.ACTION_SEND).apply {
        type = mimeType
        putExtra(Intent.EXTRA_STREAM, uri)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
      }
      activity.startActivity(Intent.createChooser(intent, "Share export"))
      promise.resolve(true)
    } catch (error: Exception) { promise.reject("MEDIA_ERROR", error.message, error) }
  }
}

class NoorMediaPackage : ReactPackage {
  override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> = listOf(NoorMediaModule(context))
  override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}
