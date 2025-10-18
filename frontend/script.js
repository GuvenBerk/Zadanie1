const API_URL = 'https://zadanie1-1fwg.onrender.com/zadania';
const taskForm = document.getElementById('taskForm');
const taskList = document.getElementById('tasks');

document.addEventListener('DOMContentLoaded', loadTasks);

taskForm.addEventListener('submit', function (event) {
    event.preventDefault();

    const taskData = {
        tytul: document.getElementById('tytul').value,
        opis: document.getElementById('opis').value,
        termin: document.getElementById('termin').value,
        priorytet: document.getElementById('priorytet').value,
        status: document.getElementById('status').value
    };

    const taskId = document.getElementById('taskId')?.value;
    if (taskId) {
        updateTask(taskId, taskData);
    } else {
        createTask(taskData);
    }
});

function createTask(taskData) {
    fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
    })
        .then(response => response.json())
        .then(data => {
            console.log('Zadanie utworzone:', data);
            taskForm.reset();
            loadTasks();
        })
        .catch(error => console.error('Błąd:', error));
}

function loadTasks() {
    fetch(API_URL)
        .then(response => response.json())
        .then(data => {
            displayTasks(data.zadania);
        })
        .catch(error => console.error('Błąd ładowania zadań:', error));
}

function displayTasks(zadania) {
    taskList.innerHTML = '';
    zadania.forEach(zadanie => {
        const li = document.createElement('li');
        li.innerHTML = `
            <strong>${zadanie.tytul}</strong> - ${zadanie.status} <br>
            <small>Opis: ${zadanie.opis || 'Brak'}</small> <br>
            <small>Termin: ${zadanie.termin || 'Nie określono'}</small> <br>
            <small>Priorytet: ${getPriorityText(zadanie.priorytet)}</small> <br>
            <button class="edit" onclick="editTask(${zadanie.id})">Edytuj</button>
            <button onclick="deleteTask(${zadanie.id})">Usuń</button>
        `;
        taskList.appendChild(li);
    });
}

function getPriorityText(priorytet) {
    const priorities = { 1: 'Niski', 2: 'Średni', 3: 'Wysoki' };
    return priorities[priorytet] || 'Nieokreślony';
}

function deleteTask(id) {
    if (confirm('Czy na pewno chcesz usunąć to zadanie?')) {
        fetch(`${API_URL}/${id}`, { method: 'DELETE' })
            .then(response => response.json())
            .then(data => {
                console.log('Odpowiedź usuwania:', data);
                loadTasks();
            })
            .catch(error => console.error('Błąd usuwania:', error));
    }
}

function editTask(id) {
    fetch(`${API_URL}/${id}`)
        .then(response => response.json())
        .then(data => {
            const zadanie = data.zadanie;
            document.getElementById('tytul').value = zadanie.tytul;
            document.getElementById('opis').value = zadanie.opis || '';
            document.getElementById('termin').value = zadanie.termin || '';
            document.getElementById('priorytet').value = zadanie.priorytet;
            document.getElementById('status').value = zadanie.status;

            let idField = document.getElementById('taskId');
            if (!idField) {
                idField = document.createElement('input');
                idField.type = 'hidden';
                idField.id = 'taskId';
                taskForm.appendChild(idField);
            }
            idField.value = zadanie.id;

            taskForm.querySelector('button[type="submit"]').textContent = 'Aktualizuj Zadanie';
        })
        .catch(error => console.error('Błąd pobierania zadania:', error));
}

function updateTask(id, taskData) {
    fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
    })
        .then(response => response.json())
        .then(data => {
            console.log('Odpowiedź aktualizacji:', data);
            taskForm.reset();
            const submitButton = taskForm.querySelector('button[type="submit"]');
            submitButton.textContent = 'Zapisz Zadanie';
            const idField = document.getElementById('taskId');
            if (idField) idField.remove();

            loadTasks();
        })
        .catch(error => console.error('Błąd aktualizacji:', error));
}