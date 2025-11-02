const API_BASE_URL = window.location.origin;

let currentEditingId = null;
let currentToken = null;
let currentUser = null;

document.addEventListener('DOMContentLoaded', function() {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (savedToken && savedUser) {
        currentToken = savedToken;
        currentUser = JSON.parse(savedUser);
        showApp();
    }

    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    
    const taskForm = document.getElementById('taskForm');
    if (taskForm) {
        taskForm.addEventListener('submit', handleFormSubmit);
    }
});

function showTab(tabName) {
    document.querySelectorAll('.auth-form').forEach(form => {
        form.classList.remove('active');
    });
    
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    
    document.getElementById(tabName + 'Form').classList.add('active');
    
    document.querySelectorAll('.tab-button').forEach(button => {
        if (button.textContent.toLowerCase().includes(tabName)) {
            button.classList.add('active');
        }
    });
}

async function handleLogin(event) {
    event.preventDefault();
    
    const login = document.getElementById('loginLogin').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ login, password })
        });

        const data = await response.json();

        if (response.ok) {
            currentToken = data.token;
            currentUser = data.user;
            
            localStorage.setItem('token', currentToken);
            localStorage.setItem('user', JSON.stringify(currentUser));
            
            showApp();
            showMessage('Logowanie udane!', 'success');
        } else {
            showMessage('Błąd logowania: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Błąd logowania:', error);
        showMessage('Błąd logowania: ' + error.message, 'error');
    }
}

async function handleRegister(event) {
    event.preventDefault();
    
    const login = document.getElementById('registerLogin').value;
    const password = document.getElementById('registerPassword').value;

    if (password.length < 6) {
        showMessage('Hasło musi mieć co najmniej 6 znaków', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ login, password })
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('Rejestracja udana! Możesz się teraz zalogować.', 'success');
            showTab('login');
            document.getElementById('loginLogin').value = login;
        } else {
            showMessage('Błąd rejestracji: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Błąd rejestracji:', error);
        showMessage('Błąd rejestracji: ' + error.message, 'error');
    }
}

function logout() {
    currentToken = null;
    currentUser = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    showAuth();
    resetForm();
}

function showAuth() {
    document.getElementById('authSection').style.display = 'block';
    document.getElementById('appSection').style.display = 'none';
    document.getElementById('publicContent').innerHTML = '';
}

function showApp() {
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('appSection').style.display = 'block';
    document.getElementById('userLogin').textContent = currentUser.login;
    loadTasks();
}

async function loadPublicInfo() {
    try {
        const response = await fetch(`${API_BASE_URL}/home`);
        const data = await response.json();
        
        const publicContent = document.getElementById('publicContent');
        publicContent.innerHTML = `
            <ul>
                ${data.features.map(feature => `<li>${feature}</li>`).join('')}
            </ul>
        `;
    } catch (error) {
        console.error('Błąd ładowania informacji publicznych:', error);
    }
}

function showMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = type === 'error' ? 'error-message' : 'success-message';
    messageDiv.textContent = message;
    
    const container = document.querySelector('.container');
    container.insertBefore(messageDiv, container.firstChild);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

async function handleFormSubmit(event) {
    event.preventDefault();

    if (!currentToken) {
        showMessage('Musisz być zalogowany aby dodawać zadania!', 'error');
        return;
    }

    const tytulInput = document.querySelector('#tytul');
    const opisInput = document.querySelector('#opis');
    const terminInput = document.querySelector('#termin');
    const priorytetSelect = document.querySelector('#priorytet');
    const statusSelect = document.querySelector('#status');

    const taskData = {
        tytul: tytulInput.value.trim(),
        opis: opisInput ? opisInput.value.trim() : '',
        termin: terminInput ? terminInput.value : '',
        priorytet: priorytetSelect ? parseInt(priorytetSelect.value) : 1,
        status: statusSelect ? statusSelect.value : 'do zrobienia'
    };

    if (!taskData.tytul) {
        showMessage('Proszę wprowadzić tytuł zadania!', 'error');
        return;
    }

    try {
        const url = currentEditingId ? 
            `${API_BASE_URL}/zadania/${currentEditingId}` : 
            `${API_BASE_URL}/zadania`;

        const method = currentEditingId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify(taskData)
        });

        if (response.ok) {
            const result = await response.json();
            resetForm();
            loadTasks();
            showMessage(currentEditingId ? 'Zadanie zaktualizowane!' : 'Zadanie dodane!', 'success');
        } else {
            if (response.status === 401) {
                logout();
                showMessage('Sesja wygasła. Zaloguj się ponownie.', 'error');
                return;
            }
            const errorText = await response.text();
            throw new Error(`Błąd: ${errorText}`);
        }
    } catch (error) {
        console.error('Błąd:', error);
        showMessage('Błąd: ' + error.message, 'error');
    }
}

function resetForm() {
    const tytulInput = document.querySelector('#tytul');
    const opisInput = document.querySelector('#opis');
    const terminInput = document.querySelector('#termin');
    const priorytetSelect = document.querySelector('#priorytet');
    const statusSelect = document.querySelector('#status');

    if (tytulInput) tytulInput.value = '';
    if (opisInput) opisInput.value = '';
    if (terminInput) terminInput.value = '';
    if (priorytetSelect) priorytetSelect.value = '';
    if (statusSelect) statusSelect.value = '';

    currentEditingId = null;
    
    const submitButton = document.querySelector('#taskForm button[type="submit"]');
    if (submitButton) {
        submitButton.textContent = 'Zapisz Zadanie';
    }
}

function editTask(taskId) {
    if (!currentToken) {
        showMessage('Musisz być zalogowany aby edytować zadania!', 'error');
        return;
    }

    fetch(`${API_BASE_URL}/zadania/${taskId}`, {
        headers: {
            'Authorization': `Bearer ${currentToken}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Błąd pobierania danych zadania');
        }
        return response.json();
    })
    .then(data => {
        const task = data.zadanie;

        const tytulInput = document.querySelector('#tytul');
        const opisInput = document.querySelector('#opis');
        const terminInput = document.querySelector('#termin');
        const priorytetSelect = document.querySelector('#priorytet');
        const statusSelect = document.querySelector('#status');

        if (tytulInput) tytulInput.value = task.tytul || '';
        if (opisInput) opisInput.value = task.opis || '';
        if (terminInput) terminInput.value = task.termin ? task.termin.split('T')[0] : '';
        if (priorytetSelect) priorytetSelect.value = task.priorytet || '';
        if (statusSelect) statusSelect.value = task.status || '';

        currentEditingId = taskId;

        const submitButton = document.querySelector('#taskForm button[type="submit"]');
        if (submitButton) {
            submitButton.textContent = 'Aktualizuj Zadanie';
        }

        showMessage('Edycja zadania: ' + task.tytul, 'success');
    })
    .catch(error => {
        console.error('Błąd pobierania zadania:', error);
        showMessage('Błąd ładowania danych do edycji: ' + error.message, 'error');
    });
}

async function loadTasks() {
    if (!currentToken) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/zadania`, {
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                logout();
                showMessage('Sesja wygasła. Zaloguj się ponownie.', 'error');
                return;
            }
            throw new Error(`Błąd HTTP: ${response.status}`);
        }

        const data = await response.json();
        displayTasks(data.zadania || []);

    } catch (error) {
        console.error('Nie udało się załadować zadań:', error);
        showMessage('Nie udało się załadować zadań: ' + error.message, 'error');
    }
}

function displayTasks(tasks) {
    const tasksContainer = document.getElementById('tasks');

    if (!tasksContainer) {
        console.error('Nie znaleziono elementów tasks');
        return;
    }

    if (!tasks || tasks.length === 0) {
        tasksContainer.innerHTML = '<p>📝 Brak zadań do wyświetlenia. Dodaj pierwsze zadanie!</p>';
        return;
    }

    tasksContainer.innerHTML = tasks.map(task => `
        <div class="task-item">
            <h3>${task.tytul || 'Bez tytułu'}</h3>
            ${task.opis ? `<p>${task.opis}</p>` : ''}
            <div style="display: flex; justify-content: space-between; margin-top: 10px; font-size: 14px; color: #666;">
                ${task.termin ? `<span>📅 ${new Date(task.termin).toLocaleDateString('pl-PL')}</span>` : ''}
                <span>Priorytet: ${getPriorityText(task.priorytet)}</span>
                <span>Status: ${getStatusText(task.status)}</span>
            </div>
            <div class="task-actions">
                <button onclick="editTask(${task.id})" class="edit-btn">Edytuj</button>
                <button onclick="deleteTask(${task.id})" class="delete-btn">Usuń</button>
            </div>
        </div>
    `).join('');
}

function getPriorityText(priority) {
    const priorities = {
        1: 'Niski',
        2: 'Średni', 
        3: 'Wysoki'
    };
    return priorities[priority] || 'Nieustalony';
}

function getStatusText(status) {
    const statuses = {
        'do zrobienia': 'Do zrobienia',
        'w trakcie': 'W trakcie',
        'zakończone': 'Zakończone'
    };
    return statuses[status] || status || 'Nieustalony';
}

async function deleteTask(taskId) {
    if (!currentToken) {
        showMessage('Musisz być zalogowany aby usuwać zadania!', 'error');
        return;
    }

    if (!confirm('Czy na pewno chcesz usunąć to zadanie?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/zadania/${taskId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        if (response.ok) {
            loadTasks();
            showMessage('Zadanie zostało usunięte!', 'success');
        } else {
            throw new Error(`Błąd usuwania: ${response.status}`);
        }
    } catch (error) {
        console.error('Błąd usuwania:', error);
        showMessage('Nie udało się usunąć: ' + error.message, 'error');
    }
}