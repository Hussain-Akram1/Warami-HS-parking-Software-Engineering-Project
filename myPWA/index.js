//  IMPORTS & INITIAL SETUP
const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const PORT = 8000;

//  MIDDLEWARE
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

//  DATABASE INITIALISATION
const db = new sqlite3.Database("./parking_roster.db", (err) => {
  if (err) {
    console.error("Database connection error:", err);
    process.exit(1);
  }
  console.log("Connected to SQLite database");
  initializeDatabase();
});

//  DATABASE SCHEMA
function initializeDatabase() {
  const schema = `
    CREATE TABLE IF NOT EXISTS teachers (
      teacher_id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_name TEXT NOT NULL,
      faculty_name TEXT NOT NULL,
      fixed_days_present INTEGER NOT NULL CHECK (fixed_days_present BETWEEN 1 AND 10),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS rosters (
      roster_id INTEGER PRIMARY KEY AUTOINCREMENT,
      generation_date TEXT NOT NULL,
      cycle_status TEXT NOT NULL DEFAULT 'Active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS roster_assignments (
      assignment_id INTEGER PRIMARY KEY AUTOINCREMENT,
      roster_id INTEGER NOT NULL,
      teacher_id INTEGER NOT NULL,
      day_of_cycle INTEGER NOT NULL CHECK (day_of_cycle BETWEEN 1 AND 10),
      parking_space INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (roster_id) REFERENCES rosters(roster_id) ON DELETE CASCADE,
      FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id) ON DELETE CASCADE,
      UNIQUE (roster_id, day_of_cycle, parking_space)
    );

    CREATE TABLE IF NOT EXISTS faculty_colors (
      faculty_id INTEGER PRIMARY KEY AUTOINCREMENT,
      faculty_name TEXT NOT NULL UNIQUE,
      color_code TEXT NOT NULL,
      staff_count INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_teachers_faculty ON teachers(faculty_name);
    CREATE INDEX IF NOT EXISTS idx_roster_assignments_day ON roster_assignments(day_of_cycle);
    CREATE INDEX IF NOT EXISTS idx_roster_assignments_teacher ON roster_assignments(teacher_id);
    CREATE INDEX IF NOT EXISTS idx_roster_assignments_roster ON roster_assignments(roster_id);
  `;

  db.exec(schema, (err) => {
    if (err) {
      console.error("Schema initialization error:", err);
      process.exit(1);
    }

    console.log("Database schema initialized");

    const facultyInsert = `
      INSERT OR IGNORE INTO faculty_colors (faculty_name, color_code, staff_count) VALUES
      ('English', '#FF6B6B', 15),
      ('Mathematics', '#4ECDC4', 13),
      ('Science', '#45B7D1', 10),
      ('TAS', '#FFA07A', 12),
      ('CAPA', '#98D8C8', 7),
      ('PDHPE', '#F7DC6F', 7),
      ('History & Languages', '#BB8FCE', 7),
      ('HSIE', '#85C1E2', 9),
      ('Learning Support', '#F8B88B', 6),
      ('Admin Support', '#B0B0B0', 34);
    `;

    db.exec(facultyInsert, (err) => {
      if (err) console.error("Error inserting faculty colors:", err);
      else console.log("Faculty colors loaded");
    });
  });
}

//  DB HELPERS
const runQuery = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });

const allQuery = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });

//  TEACHER ENDPOINTS
app.get("/api/teachers", async (req, res) => {
  try {
    const teachers = await allQuery("SELECT * FROM teachers ORDER BY teacher_name");
    res.json(teachers);
  } catch {
    res.status(500).json({ success: false, message: "Error fetching teachers" });
  }
});

app.post("/api/add-teacher", async (req, res) => {
  try {
    const { name, faculty, days } = req.body;

    if (!name || !faculty || !days)
      return res.status(400).json({ success: false, message: "Missing required fields" });

    if (days < 1 || days > 10)
      return res.status(400).json({ success: false, message: "Days must be between 1 and 10" });

    const result = await runQuery(
      "INSERT INTO teachers (teacher_name, faculty_name, fixed_days_present) VALUES (?, ?, ?)",
      [name, faculty, days]
    );

    res.json({ success: true, teacher_id: result.lastID });
  } catch {
    res.status(500).json({ success: false, message: "Error adding teacher" });
  }
});

app.delete("/api/teachers/:id", async (req, res) => {
  try {
    await runQuery("DELETE FROM teachers WHERE teacher_id = ?", [req.params.id]);
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, message: "Error deleting teacher" });
  }
});

// Processes structured JSON data sent from the file uploader
app.post("/api/upload-teachers-json", async (req, res) => {
  try {
    const { facultiesData } = req.body;

    // Safety validation to ensure the incoming payload is present and formatted as an array
    if (!facultiesData || !Array.isArray(facultiesData)) {
      return res.status(400).json({ success: false, message: "Invalid data format received by server" });
    }

    // Keep track of how many records we successfully write to the database
    let totalInserted = 0;

    // Iterate through each faculty block 
    for (const item of facultiesData) {
      const { faculty, teachers } = item;

      // Iterate through each teacher object inside that specific faculty
      for (const teacher of teachers) {
        const { name, days } = teacher;

        // Ensure the teacher actually has a name before running the SQL insert statement
        if (name && name.trim().length > 0) {
          // Execute the database insert query using our predefined SQL helper
          // The database automatically enforces the 1-10 day CHECK constraint rule
          await runQuery(
            "INSERT INTO teachers (teacher_name, faculty_name, fixed_days_present) VALUES (?, ?, ?)",
            [name.trim(), faculty, days]
          );
          
          // Increment counter
          totalInserted++;
        }
      }
    }

    // Respond back to the client browser with a success message and count report
    res.json({ 
      success: true, 
      message: `Successfully imported ${totalInserted} teachers with their custom days.` 
    });

  } catch (error) {
    // Catch-all block logs unexpected server-side crashes or SQL errors to the terminal console
    console.error("Bulk import error:", error);
    res.status(500).json({ success: false, message: "Error importing teacher files into database" });
  }
});

//  SEARCH ENDPOINTS
app.get("/api/search-teacher", async (req, res) => {
  try {
    const { query } = req.query;

    if (!query)
      return res.status(400).json({ success: false, message: "Search query required" });

    const results = await allQuery(
      "SELECT * FROM teachers WHERE teacher_name LIKE ? ORDER BY teacher_name",
      [`%${query}%`]
    );

    res.json(results);
  } catch {
    res.status(500).json({ success: false, message: "Error searching teachers" });
  }
});

//  ROSTER ENDPOINTS
app.post("/api/generate-roster", async (req, res) => {
  try {
    const timestamp = new Date().toISOString();
    const result = await runQuery(
      "INSERT INTO rosters (generation_date, cycle_status) VALUES (?, ?)",
      [timestamp, "Active"]
    );

    res.json({ success: true, roster_id: result.lastID });
  } catch {
    res.status(500).json({ success: false, message: "Error generating roster" });
  }
});

app.get("/api/rosters", async (req, res) => {
  try {
    const rosters = await allQuery("SELECT * FROM rosters ORDER BY roster_id DESC LIMIT 10");
    res.json(rosters);
  } catch {
    res.status(500).json({ success: false, message: "Error fetching rosters" });
  }
});

app.get("/api/roster/:rosterId/day/:day", async (req, res) => {
  try {
    const { rosterId, day } = req.params;

    const assignments = await allQuery(
      `SELECT ra.*, t.teacher_name, t.faculty_name
       FROM roster_assignments ra
       JOIN teachers t ON ra.teacher_id = t.teacher_id
       WHERE ra.roster_id = ? AND ra.day_of_cycle = ?
       ORDER BY ra.parking_space`,
      [rosterId, day]
    );

    res.json(assignments);
  } catch {
    res.status(500).json({ success: false, message: "Error fetching roster day" });
  }
});

app.get("/api/rosters/:rosterId/assignments", async (req, res) => {
  try {
    const assignments = await allQuery(
      `SELECT ra.*, t.teacher_name, t.faculty_name
       FROM roster_assignments ra
       JOIN teachers t ON ra.teacher_id = t.teacher_id
       WHERE ra.roster_id = ?
       ORDER BY ra.day_of_cycle, ra.parking_space`,
      [req.params.rosterId]
    );

    res.json(assignments);
  } catch {
    res.status(500).json({ success: false, message: "Error fetching assignments" });
  }
});

//  SHUFFLE HELPER
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

//  PROPORTIONAL DAILY SPACE QUOTAS (Exactly 30 spots total)
const FACULTY_DAILY_QUOTAS = {
  "English": 4,
  "Mathematics": 3,
  "Science": 3,
  "TAS": 3,
  "CAPA": 2,
  "PDHPE": 2,
  "History & Languages": 2,
  "HSIE": 2,
  "Learning Support": 1,
  "Admin Support": 8
};

// ROSTER GENERATION ENDPOINT
app.post("/api/generate-roster-assignments", async (req, res) => {
  try {
    const { rosterId } = req.body;
    if (!rosterId) {
      return res.status(400).json({ success: false, message: "Roster ID required" });
    }

    const allTeachers = await allQuery("SELECT * FROM teachers ORDER BY teacher_id ASC");
    if (allTeachers.length === 0) {
      return res.status(400).json({ success: false, message: "No teachers to assign" });
    }

    // Group teachers by faculty
    const teachersByFaculty = {};
    Object.keys(FACULTY_DAILY_QUOTAS).forEach(fName => {
      teachersByFaculty[fName] = allTeachers.filter(t => t.faculty_name === fName);
    });

    // 50% GUARANTEE 
    const priorityPoolByFaculty = {};
    Object.keys(teachersByFaculty).forEach(faculty => {
      const staffList = teachersByFaculty[faculty];
      const targetCount = Math.ceil(staffList.length * 0.5);
      priorityPoolByFaculty[faculty] = shuffleArray(staffList).slice(0, targetCount);
    });

    let assignmentCount = 0;

    // 3. FORTNIGHT (Days 1–10)
    for (let day = 1; day <= 10; day++) {
      let parkingSpace = 1;

      for (const [facultyName, allowedSpaces] of Object.entries(FACULTY_DAILY_QUOTAS)) {
        const fullStaffList = teachersByFaculty[facultyName] || [];
        const priorityStaffList = priorityPoolByFaculty[facultyName] || [];

        let assignedCount = 0;
        let loopSafetyCounter = 0;
        const assignedToday = new Set();

        while (assignedCount < allowedSpaces && loopSafetyCounter < fullStaffList.length * 2) {
          if (fullStaffList.length === 0) break;

          // Rotational pointer
          const pointerIndex = (day + assignedCount + loopSafetyCounter) % fullStaffList.length;
          let selectedTeacher = fullStaffList[pointerIndex];

          // PRIORITY OVERRIDE
          const unassignedPriority = priorityStaffList.find(
            pt => !assignedToday.has(pt.teacher_id)
          );

          if (unassignedPriority && day <= unassignedPriority.fixed_days_present) {
            selectedTeacher = unassignedPriority;
          }

          // VALIDATION: teacher must not already be assigned today
          if (
            day <= selectedTeacher.fixed_days_present &&
            !assignedToday.has(selectedTeacher.teacher_id)
          ) {
            try {
              await runQuery(
                `INSERT INTO roster_assignments (roster_id, teacher_id, day_of_cycle, parking_space)
                 VALUES (?, ?, ?, ?)`,
                [rosterId, selectedTeacher.teacher_id, day, parkingSpace]
              );

              assignedToday.add(selectedTeacher.teacher_id);
              parkingSpace++;
              assignedCount++;
              assignmentCount++;
            } catch (err) {
              console.error("Insert skipped:", err);
            }
          }

          loopSafetyCounter++;
        }

        // Maintain grid alignment
        parkingSpace += (allowedSpaces - assignedCount);
      }
    }

    res.json({
      success: true,
      assignmentCount,
      message: "Roster generated successfully with 50% guarantee, fixed quotas, and no duplicates."
    });

  } catch (error) {
    console.error("Roster generation error:", error);
    res.status(500).json({ success: false, message: "Error generating assignments" });
  }
});

//  HEALTH CHECK
app.get("/api/health", (req, res) => {
  res.json({ status: "OK" });
});

//  MAIN ROUTE
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

//  START SERVER
app.listen(PORT, () =>
  console.log(`Server running at http://localhost:${PORT}`)
);
