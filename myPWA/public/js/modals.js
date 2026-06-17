// MODALS & ALERTS
function showAlert(message) {
    const modal = document.getElementById('alertModal');
    document.getElementById('alertMessage').textContent = message;
    modal.classList.add('show');
}

function closeAlert() {
    document.getElementById('alertModal').classList.remove('show');
}

function closeModal() {
    document.getElementById('spaceModal').classList.remove('show');
}

document.addEventListener('click', (e) => {
    if (e.target === document.getElementById('spaceModal')) closeModal();
    if (e.target === document.getElementById('alertModal')) closeAlert();
});
