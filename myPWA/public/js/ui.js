// UI & MENU NAVIGATION
document.addEventListener('DOMContentLoaded', () => {
    initializeUI();
    loadTeachers();
    generateLegend();
});

function showMenu(menuId) {
    document.querySelectorAll('.menu-container').forEach(menu =>
        menu.classList.remove('active')
    );
    document.getElementById(menuId).classList.add('active');

    if (menuId === 'fileInput') initializeFileUpload();
    if (menuId === 'parkingRoster') loadParkingRoster();
    if (menuId === 'manualEntry') loadTeacherList();
}

function initializeUI() {
    generateLegend();
    const daysSlider = document.getElementById('daysSlider');
    const daysDisplay = document.getElementById('daysDisplay');
    if (daysSlider && daysDisplay) daysDisplay.textContent = daysSlider.value;
}

function generateLegend() {
    const legend = document.getElementById('legendItems');
    legend.innerHTML = '';

    FACULTIES.forEach(faculty => {
        const item = document.createElement('div');
        item.className = 'legend-item';
        item.innerHTML = `
            <div class="legend-color" style="background:${FACULTY_COLORS[faculty]}"></div>
            <span>${faculty}</span>
        `;
        legend.appendChild(item);
    });
}

function exitApplication() {
    if (confirm('Are you sure you want to exit?')) {
        alert('Thank you for using Warami HS Parking!');
    }
}

function updateDaysDisplay(value) {
    const display = document.getElementById('daysDisplay');
    if (display) display.textContent = value;
}
