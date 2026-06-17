// CONFIGURATION & SHARED GLOBALS 
// API Base URL - Works in Codespaces
const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
    ? 'http://localhost:8000/api' 
    : `${window.location.origin}/api`;

// Store all teachers
let allTeachers = [];

// Faculty list
const FACULTIES = [
    'English', 'Mathematics', 'Science', 'TAS', 'CAPA', 
    'PDHPE', 'History & Languages', 'HSIE', 'Learning Support', 'Admin Support'
];

// Faculty colors
const FACULTY_COLORS = {
    'English': '#FF6B6B',
    'Mathematics': '#4ECDC4',
    'Science': '#45B7D1',
    'TAS': '#FFA07A',
    'CAPA': '#98D8C8',
    'PDHPE': '#F7DC6F',
    'History & Languages': '#BB8FCE',
    'HSIE': '#85C1E2',
    'Learning Support': '#F8B88B',
    'Admin Support': '#B0B0B0'
};

// Current roster tracking
let currentRosterId = null;
let currentWeek = 1;
let currentDay = 1;

console.log('Config loaded - API_BASE:', API_BASE);
