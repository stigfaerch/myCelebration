# Image Handling & Storage (Project Handoff)

## Overview

This document defines how images are uploaded, processed, stored, and served in the application.

The system is designed around:

* Preserving original images
* Generating optimized derivatives (thumbnail + medium)
* Asynchronous processing
* Graceful fallback in the UI
* Low operational cost and high robustness

---

## High-Level Architecture

**Flow:**

1. Client uploads image
2. Image is stored as **original**
3. Database record is created
4. Background worker processes image
5. Derived images are generated:

   * Thumbnail
   * Medium
6. Database is updated incrementally
7. Frontend uses best available version with fallback

---

## Storage Structure

Images are stored in object storage (S3-compatible).

Use deterministic paths:

```
/images/
  /original/
    {image_id}.jpg
  /medium/
    {image_id}.jpg
  /thumb/
    {image_id}.jpg
```

### Notes:

* `image_id` is a UUID
* Same filename across sizes simplifies lookup
* No need to store all URLs in DB if path is predictable

---

## Database Schema (Images Table)

```sql
images (
  id UUID PRIMARY KEY,
  original_path TEXT NOT NULL,
  medium_path TEXT,
  thumbnail_path TEXT,
  created_at TIMESTAMP,
  processed_at TIMESTAMP
)
```

### Field semantics:

* `original_path`: always present
* `medium_path`: set when generated
* `thumbnail_path`: set when generated
* `processed_at`: set when all derivatives are done (optional)

---

## Upload Flow

### Client → Server

* Client uploads image via API endpoint
* Server:

  1. Validates file (type, size)
  2. Stores original image
  3. Inserts DB record

### Constraints:

* Max file size: ~10MB (configurable)
* Accepted formats: JPEG, PNG, HEIC (optional conversion)

---

## Background Processing

### Trigger Strategy

Either:

**Option A (preferred):**

* Trigger worker immediately after DB insert

**Option B (simpler):**

* Worker polls for unprocessed images:

```sql
SELECT * FROM images
WHERE thumbnail_path IS NULL
LIMIT 10;
```

---

## Image Processing

Use an image processing library (e.g. `sharp`).

### Thumbnail

* Width: ~300px
* Quality: ~70
* Format: JPEG or WebP

### Medium

* Width: ~1200px
* Quality: ~80
* Format: JPEG or WebP

### Example logic

```ts
if (!thumbnail_exists) {
  generate_thumbnail()
}

if (!medium_exists) {
  generate_medium()
}
```

### Important:

* Processing must be **idempotent**
* Safe to retry multiple times

---

## Storage Write Strategy

* Read original image
* Generate derivative
* Upload to corresponding path
* Update DB field

Order does not matter as long as DB reflects reality

---

## Frontend Image Selection (Fallback)

Frontend should always resolve best available image.

For a thumbnail:
```ts
const src =
  thumbnail_path ??
  medium_path ??
  original_path;
```

For other uses:
```ts
const src =
  medium_path ??
  original_path;
```


### Behavior:

* Immediately shows original
* Automatically improves when derivatives are ready
* No broken states

---

## Performance Considerations

* Do NOT block upload on image processing
* Always process asynchronously
* Limit worker concurrency (avoid CPU spikes)

---

## Failure Handling

* If processing fails:

  * Keep original
  * Retry later
* Never delete original
* Missing derivatives are acceptable

---

## Optional Enhancements

* Blur placeholder (generated from thumbnail)
* EXIF stripping during processing
* Client-side resize before upload (optional)
* WebP/AVIF conversion for better compression

---

## Design Principles

* Originals are source of truth
* Derived images are disposable
* System must be retry-safe
* UI must degrade gracefully
* Keep infrastructure simple and cost-efficient

---

## Summary

This setup provides:

* Reliable uploads
* Fast image delivery
* Controlled storage costs
* Simple mental model
* Scalability sufficient for event-based usage
