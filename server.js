const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const CSV_FILE_PATH = path.join(__dirname, 'activists.csv');

app.use(express.json());

// יצירת קובץ ה-CSV עם BOM (כדי שייפתח תקין בעברית ב-Excel) אם אינו קיים עדיין
function ensureCsvFileExists() {
  if (!fs.existsSync(CSV_FILE_PATH)) {
    const UTF8_BOM = '\uFEFF';
    const header = 'תאריך ושעה,שם מלא,שכונה / רחוב,טלפון נייד,מעוניין להתנדב\r\n';
    fs.writeFileSync(CSV_FILE_PATH, UTF8_BOM + header, 'utf8');
  }
}

ensureCsvFileExists();

// ניקוי והגנה על שדות לפני כתיבה ל-CSV
function escapeCsvField(value) {
  let str = String(value ?? '').replace(/\r?\n|\r/g, ' ').trim();
  // מניעת CSV Injection בפתיחה באקסל
  if (/^[=+\-@]/.test(str)) {
    str = "'" + str;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

// חסימת גישה ישירה מהדפדפן לקובץ ה-CSV ולקובצי השרת (לשמירה על פרטיות מספרי הטלפון)
app.use((req, res, next) => {
  const blockedFiles = ['/activists.csv', '/server.js', '/package.json', '/package-lock.json'];
  if (blockedFiles.includes(req.path.toLowerCase())) {
    return res.status(403).send('Forbidden');
  }
  next();
});

// הגשת קובצי האתר הסטטיים
app.use(express.static(__dirname));

// שמירת פנייה חדשה לקובץ activists.csv
app.post('/api/activists', (req, res) => {
  try {
    const { fullName, neighborhood, phone, volunteer } = req.body || {};

    if (!fullName || !neighborhood || !String(fullName).trim() || !String(neighborhood).trim()) {
      return res.status(400).json({ error: 'נא למלא שם מלא ושכונה/רחוב' });
    }

    ensureCsvFileExists();

    const timestamp = new Date().toLocaleString('he-IL', {
      timeZone: 'Asia/Jerusalem',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).replace(',', '');

    const volunteerText = volunteer ? 'כן' : 'לא';

    const csvRow = [
      escapeCsvField(timestamp),
      escapeCsvField(fullName),
      escapeCsvField(neighborhood),
      escapeCsvField(phone || ''),
      escapeCsvField(volunteerText)
    ].join(',') + '\r\n';

    fs.appendFileSync(CSV_FILE_PATH, csvRow, 'utf8');

    return res.status(201).json({
      ok: true,
      signerDisplay: `${String(fullName).trim()} (${String(neighborhood).trim()})`
    });
  } catch (err) {
    console.error('Error writing to CSV:', err);
    return res.status(500).json({ error: 'שגיאה בשמירת הפנייה בשרת' });
  }
});

// שליפת שמות אחרונים לתצוגה באתר (ללא מספרי טלפון)
app.get('/api/activists', (req, res) => {
  try {
    ensureCsvFileExists();
    const content = fs.readFileSync(CSV_FILE_PATH, 'utf8');
    const lines = content
      .replace(/^\uFEFF/, '')
      .split(/\r?\n/)
      .filter(line => line.trim() !== '');

    // דילוג על שורת הכותרת
    const dataLines = lines.slice(1);
    const recentSigners = [];

    for (let i = dataLines.length - 1; i >= 0 && recentSigners.length < 10; i--) {
      const cols = dataLines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
      if (cols && cols.length >= 3) {
        const cleanName = cols[1].replace(/^"|"$/g, '').replace(/""/g, '"');
        const cleanNeighborhood = cols[2].replace(/^"|"$/g, '').replace(/""/g, '"');
        if (cleanName && cleanNeighborhood) {
          recentSigners.push(`${cleanName} (${cleanNeighborhood})`);
        }
      }
    }

    return res.json({
      count: dataLines.length,
      recentSigners
    });
  } catch (err) {
    console.error('Error reading CSV:', err);
    return res.status(500).json({ count: 0, recentSigners: [] });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Activists CSV file: ${CSV_FILE_PATH}`);
});

