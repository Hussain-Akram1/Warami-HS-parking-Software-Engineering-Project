// TEACHER MANAGEMENT
// Fetches the master list of all teachers from the server.
// Updates the global `allTeachers` array used for wider application state.
// Logs the outcome or resets the array to empty on failure.
async function loadTeachers() {
    try {
        // Fetch raw response from the backend endpoint
        const response = await fetch(`${API_BASE}/teachers`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        allTeachers = await response.json();
        console.log('Teachers loaded:', allTeachers);
    } catch (error) {
        console.error('Error loading teachers:', error);
        allTeachers = [];
    }
}
// Fetches the teacher list and renders it directly into the DOM interface.
// Handles empty states dynamically and injects interactive action buttons.
async function loadTeacherList() {
    try {
        const response = await fetch(`${API_BASE}/teachers`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const teachers = await response.json();

        const container = document.getElementById('teacherList');
        if (!container) {
            console.error('teacherList container not found');
            return;
        }
        
        container.innerHTML = '';

        if (teachers.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:#999;">No teachers added yet</p>';
            return;
        }

        teachers.forEach(teacher => {
            const item = document.createElement('div');
            item.className = 'teacher-item';
            item.innerHTML = `
                <div class="teacher-info">
                    <h4>${teacher.teacher_name}</h4>
                    <p>${teacher.faculty_name} | ${teacher.fixed_days_present} days/fortnight</p>
                </div>
                <div class="teacher-actions">
                    <button onclick="deleteTeacher(${teacher.teacher_id})">Delete</button>
                </div>
            `;
            container.appendChild(item);
        });
    } catch (error) {
        console.error('Error loading teacher list:', error);
    }
}

async function submitManualEntry(event) {
    event.preventDefault();

    const name = document.getElementById('teacherName').value.trim();
    const faculty = document.getElementById('facultySelect').value;
    const daysSlider = document.getElementById('daysSlider');
    const days = parseInt(daysSlider.value);

    if (!name || !faculty) {
        showAlert('Please complete all fields');
        return;
    }
    if (days < 1 || days > 10) {
        showAlert('Days must be between 1 and 10');
        return;
    }

    console.log('Submitting:', { name, faculty, days });

    try {
        const response = await fetch(`${API_BASE}/add-teacher`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, faculty, days })
        });

        console.log('Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Result:', result);

        if (result.success) {
            showAlert('Teacher stored successfully.');
            document.querySelector('.manual-form').reset();
            document.getElementById('daysSlider').value = 5;
            document.getElementById('daysDisplay').textContent = 5;
            await loadTeachers();
            await loadTeacherList();
        } else {
            showAlert('Error: ' + result.message);
        }
    } catch (error) {
        console.error('Submit error:', error);
        showAlert('Error adding teacher: ' + error.message);
    }
}

async function deleteTeacher(id) {
    if (!confirm('Are you sure you want to delete this teacher?')) return;

    try {
        const response = await fetch(`${API_BASE}/teachers/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const result = await response.json();

        if (result.success) {
            showAlert('Teacher deleted successfully');
            await loadTeachers();
            await loadTeacherList();
        } else {
            showAlert('Error deleting teacher');
        }
    } catch (error) {
        console.error('Delete error:', error);
        showAlert('Error: ' + error.message);
    }
}

// FILE UPLOAD 
function initializeFileUpload() {
    const container = document.getElementById('facultyUploadList');
    if (!container) {
        console.error('facultyUploadList container not found');
        return;
    }
    
    container.innerHTML = '';

    FACULTIES.forEach(faculty => {
        const item = document.createElement('div');
        item.className = 'faculty-item';
        item.style.borderLeftColor = FACULTY_COLORS[faculty] || '#ccc';
        item.innerHTML = `
            <h4>${faculty}</h4>
            <input type="file" id="file_${faculty}" accept=".txt,.csv" data-faculty="${faculty}">
            <small>Upload file with teacher names (one per line)</small>
        `;
        container.appendChild(item);
    });
}

async function uploadAllFiles() {
    const payload = [];
    let hasFiles = false;

    // Map over the FACULTIES array to read each selected file asynchronously
    const filePromises = FACULTIES.map(async (faculty) => {
        const input = document.getElementById(`file_${faculty}`);
        
        // Only process if the file input exists and the user has actually selected a file
        if (input && input.files.length > 0) {
            const file = input.files[0];
            hasFiles = true;

            // Extract the raw text string directly from the uploaded file
            const text = await file.text();
            
            // Split the big text block into an array of separate lines
            const teacherObjects = text.split(/\r?\n/)
                // Trim invisible whitespace from the start and end of each line
                .map(line => line.trim())
                // Remove any blank lines to prevent empty rows in our database
                .filter(line => line.length > 0)
                // Transform each raw text line into a structured JavaScript object
                .map(line => {
                    // Split the line by the comma to separate the teacher name from the optional days value
                    const parts = line.split(',');
                    const name = parts[0].trim();
                    
                    // Fall back to a default of 5 days if the user didn't provide a number after a comma
                    let days = 5; 
                    
                    // If a comma existed and there is text after it, parse the number
                    if (parts.length > 1) {
                        const parsedDays = parseInt(parts[1].trim());
                        // Ensure the parsed number is a valid integer between 1 and 10
                        if (!isNaN(parsedDays) && parsedDays >= 1 && parsedDays <= 10) {
                            days = parsedDays;
                        }
                    }
                    
                    // Return the data neatly packaged for this single teacher
                    return { name, days };
                })
                // Safety check to drop any corrupted lines that ended up with an empty name
                .filter(t => t.name.length > 0);

            // Add this faculty's parsed teacher list to our main sending payload
            payload.push({
                faculty: faculty,
                teachers: teacherObjects
            });
        }
    });

    // Pause execution until every single file in the promises array has finished reading
    await Promise.all(filePromises);

    // Stop early and warn the user if they clicked upload without picking any files
    if (!hasFiles) {
        showAlert('Please select at least one file');
        return;
    }

    try {
        // Send the complete formatted payload to the backend as a single JSON POST request
        const response = await fetch(`${API_BASE}/upload-teachers-json`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ facultiesData: payload })
        });

        // Trigger an error if the server returns a bad network code (like 404 or 500)
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const result = await response.json();

        // If the backend saved everything successfully, refresh the UI layouts
        if (result.success) {
            showAlert(result.message);
            await loadTeachers();     // Refresh the global application state array
            await loadTeacherList(); // Redraw the UI lists on the web page
            
            // Clear out the file input boxes so they are ready for the next upload session
            FACULTIES.forEach(faculty => {
                const input = document.getElementById(`file_${faculty}`);
                if (input) input.value = '';
            });
        } else {
            showAlert('Error uploading files: ' + result.message);
        }
    } catch (error) {
        console.error('Upload error:', error);
        showAlert('Error processing upload payload: ' + error.message);
    }
}
