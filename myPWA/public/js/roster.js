// ROSTER GENERATION & GRID 
async function generateRoster() {
    if (allTeachers.length === 0) return showAlert('Please add teachers first');

    showAlert('Generating roster...');

    try {
        // Create the roster
        let response = await fetch(`${API_BASE}/generate-roster`, { method: 'POST' });
        let result = await response.json();

        if (!result.success) {
            showAlert('Error generating roster');
            return;
        }

        const rosterId = result.roster_id;
        currentRosterId = rosterId;

        // Create assignments
        response = await fetch(`${API_BASE}/generate-roster-assignments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rosterId })
        });

        result = await response.json();

        if (result.success) {
            showAlert('Roster generated with ' + result.assignmentCount + ' assignments!');
            showMenu('parkingRoster');
            await loadParkingRoster();
        } else {
            showAlert('Error: ' + result.message);
        }
    } catch (error) {
        console.error('Generation error:', error);
        showAlert('Error generating roster: ' + error.message);
    }
}

function selectWeek(week) {
    currentWeek = week;
    document.querySelectorAll('.week-tabs .tab-btn').forEach((btn, i) =>
        btn.classList.toggle('active', i + 1 === week)
    );
    selectDay(1);
}

function selectDay(day) {
    currentDay = day;
    document.querySelectorAll('.day-buttons .day-btn').forEach((btn, i) =>
        btn.classList.toggle('active', i + 1 === day)
    );
    loadParkingRoster();
}

function getDayCycleIndex(week, day) {
    return (week - 1) * 5 + day;
}

async function loadParkingRoster() {
    if (!currentRosterId) {
        document.getElementById('rosterGrid').innerHTML =
            '<p style="text-align:center;color:#999;">No roster generated.</p>';
        return;
    }

    const cycleDay = getDayCycleIndex(currentWeek, currentDay);

    try {
        const response = await fetch(`${API_BASE}/roster/${currentRosterId}/day/${cycleDay}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const assignments = await response.json();
        renderParkingGrid(assignments, cycleDay);
    } catch (error) {
        console.error('Error loading roster:', error);
        document.getElementById('rosterGrid').innerHTML =
            '<p style="text-align:center;color:red;">Error loading roster</p>';
    }
}

function renderParkingGrid(assignments) {
    const grid = document.getElementById('rosterGrid');
    grid.innerHTML = '';

    for (let space = 1; space <= 30; space++) {
        const assignment = assignments.find(a => a.parking_space === space);
        const div = document.createElement('div');
        div.className = 'parking-space';

        if (assignment) {
            div.style.background = FACULTY_COLORS[assignment.faculty_name] || '#cccccc';
            div.innerHTML = `
                <div class="space-number">Space #${space}</div>
                <div class="teacher-name">${assignment.teacher_name}</div>
            `;
            div.onclick = () => showSpaceModal(assignment, space);
        } else {
            div.classList.add('vacant');
            div.innerHTML = `
                <div class="space-number">Space #${space}</div>
                <div style="font-size:0.8em;margin-top:5px;">VACANT</div>
            `;
            div.onclick = () => showSpaceModal(null, space);
        }

        grid.appendChild(div);
    }
}

function showSpaceModal(assignment, space) {
    const modal = document.getElementById('spaceModal');
    const body = document.getElementById('modalBody');

    if (assignment) {
        body.innerHTML = `
            <h3>Parking Space #${space}</h3>
            <p><strong>Staff:</strong> ${assignment.teacher_name}</p>
            <p><strong>Faculty:</strong> ${assignment.faculty_name}</p>
            <div style="width:60px;height:60px;background:${FACULTY_COLORS[assignment.faculty_name] || '#cccccc'};border-radius:10px;margin-top:15px;"></div>
        `;
    } else {
        body.innerHTML = `
            <h3>Parking Space #${space}</h3>
            <p>This space is <strong>VACANT</strong></p>
        `;
    }

    modal.classList.add('show');
}
