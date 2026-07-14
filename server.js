const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json({ limit: '150mb' }));
app.use(express.urlencoded({ extended: true, limit: '150mb' }));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Configure Multer for in-memory file storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// In-memory data store
// Key: 4-digit numeric string
// Value: { type, content, fileName, mimeType, createdAt, expiresAt, timeoutId }
const dataStore = new Map();

// Helper to generate a unique 4-digit numeric code
function generateUniqueCode() {
  let attempts = 0;
  while (attempts < 1000) {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    if (!dataStore.has(code)) {
      return code;
    }
    attempts++;
  }
  throw new Error("Unable to generate a unique sharing code. Store might be full.");
}

// Helper to schedule deletion
function scheduleDeletion(code, delayMs) {
  const timeoutId = setTimeout(() => {
    if (dataStore.has(code)) {
      console.log(`[Auto-Expire] Deleting expired content for code: ${code}`);
      dataStore.delete(code);
    }
  }, delayMs);
  return timeoutId;
}

// API Route: Share text or file
app.post('/api/share', upload.single('file'), (req, res) => {
  try {
    const expirationDurationMs = 5 * 60 * 1000; // 5 minutes
    const expiresAt = Date.now() + expirationDurationMs;
    const code = generateUniqueCode();

    let storeItem = {
      createdAt: Date.now(),
      expiresAt: expiresAt,
      downloadsCount: 0,
    };

    if (req.file) {
      // File upload
      storeItem.type = 'file';
      // Convert buffer to base64 for easy JSON transfer and retrieval
      storeItem.content = req.file.buffer.toString('base64');
      storeItem.fileName = req.file.originalname;
      storeItem.mimeType = req.file.mimetype;
    } else if (req.body.text !== undefined) {
      // Text share
      storeItem.type = 'text';
      storeItem.content = req.body.text;
    } else {
      return res.status(400).json({ error: "No content or file provided." });
    }

    // Schedule the deletion
    const timeoutId = scheduleDeletion(code, expirationDurationMs);
    storeItem.timeoutId = timeoutId;

    // Save in store
    dataStore.set(code, storeItem);

    console.log(`[Share Created] Code: ${code}, Type: ${storeItem.type}, Expires at: ${new Date(expiresAt).toISOString()}`);

    res.json({
      success: true,
      code: code,
      expiresAt: expiresAt,
      timeLeftMs: expirationDurationMs
    });
  } catch (error) {
    console.error("Error sharing content:", error);
    res.status(500).json({ error: error.message || "Internal server error." });
  }
});

// API Route: Retrieve content by code
app.get('/api/share/:code', (req, res) => {
  const { code } = req.params;

  if (!dataStore.has(code)) {
    return res.status(404).json({ error: "Invalid or expired code." });
  }

  const item = dataStore.get(code);

  // Lazy check for expiration
  if (Date.now() > item.expiresAt) {
    clearTimeout(item.timeoutId);
    dataStore.delete(code);
    return res.status(404).json({ error: "Code has expired." });
  }

  // Increment download/receive count
  item.downloadsCount++;

  const timeLeftMs = Math.max(0, item.expiresAt - Date.now());

  res.json({
    success: true,
    type: item.type,
    content: item.content,
    fileName: item.fileName,
    mimeType: item.mimeType,
    expiresAt: item.expiresAt,
    timeLeftMs: timeLeftMs
  });

  // If maximum receives reached (10), delete immediately
  if (item.downloadsCount >= 10) {
    console.log(`[Auto-Expire] Deleting content for code ${code} because it reached max download limit (10).`);
    clearTimeout(item.timeoutId);
    dataStore.delete(code);
  }
});

// Fallback to index.html for single-page routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
