const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./parking_roster.db", (err) => {
  if (err) {
    console.error("Database error:", err);
    process.exit(1);
  }
  console.log("Connected to database, initializing...");
});

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

db.exec(schema, (err) => {
  if (err) {
    console.error("❌ Database initialization error:", err);
    process.exit(1);
  } else {
    console.log("Database initialized successfully");
    db.close();
    process.exit(0);
  }
});
