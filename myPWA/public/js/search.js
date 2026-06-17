// SEARCH SYSTEM
async function executeSearch() {
    const query = document.getElementById('searchInput').value.trim();
    const container = document.getElementById('searchResults');

    if (!query) {
        container.innerHTML = '';
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/search-teacher?query=${encodeURIComponent(query)}`);
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const teachers = await response.json();
        console.log('Search results:', teachers);

        container.innerHTML = '';

        if (teachers.length > 0) {
            teachers.forEach(teacher => {
                const item = document.createElement('div');
                item.className = 'search-result-item';

                item.innerHTML = `
                    <h4>${teacher.teacher_name}</h4>
                    <p><strong>${teacher.faculty_name}</strong></p>
                    <p>Days per fortnight: ${teacher.fixed_days_present}</p>
                `;

                container.appendChild(item);
            });
        } else {
            container.innerHTML = '<div class="error">Teacher not found.</div>';
        }
    } catch (error) {
        console.error('Search error:', error);
        container.innerHTML = '<div class="error">Error searching teacher: ' + error.message + '</div>';
    }
}

function convertDayNumberToText(n) {
    const days = [
        '',
        'Week 1 - Monday',
        'Week 1 - Tuesday',
        'Week 1 - Wednesday',
        'Week 1 - Thursday',
        'Week 1 - Friday',
        'Week 2 - Monday',
        'Week 2 - Tuesday',
        'Week 2 - Wednesday',
        'Week 2 - Thursday',
        'Week 2 - Friday'
    ];
    return days[n] || 'Unknown Day';
}
