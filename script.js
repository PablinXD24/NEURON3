const noteContainer = document.getElementById('note-container');
const noteList = document.getElementById('note-list');
const userCircle = document.getElementById('user-circle');
const userDropdown = document.getElementById('user-dropdown');
const loginModal = document.getElementById('login-modal');
const signupModal = document.getElementById('signup-modal');
const deleteModeButton = document.getElementById('delete-mode-button');
const categoryList = document.getElementById('category-list');

let selectedNote = null;
let notesByCategory = {}; // Armazena notas por categoria
let connectors = [];
let isDragging = false;
let dragNote = null;
let offsetX, offsetY;
let deleteMode = false;
let selectedCategory = 'green'; // Categoria inicial padrão

// Toggle user dropdown
userCircle.addEventListener('click', () => {
    userDropdown.style.display = userDropdown.style.display === 'flex' ? 'none' : 'flex';
});

// Close modals
document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.addEventListener('click', () => {
        closeBtn.parentElement.parentElement.style.display = 'none';
    });
});

// Open login modal
document.getElementById('login-button').addEventListener('click', () => {
    loginModal.style.display = 'flex';
    userDropdown.style.display = 'none';
});

// Open signup modal
document.getElementById('signup-button').addEventListener('click', () => {
    signupModal.style.display = 'flex';
    userDropdown.style.display = 'none';
});

// Handle logout
document.getElementById('logout-button').addEventListener('click', () => {
    alert('Logout successful');
    userDropdown.style.display = 'none';
});

// Handle file upload
document.getElementById('upload-photo').addEventListener('change', (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = function(e) {
        userCircle.style.backgroundImage = `url(${e.target.result})`;
        userCircle.style.backgroundSize = 'cover';
    };
    reader.readAsDataURL(file);
});

// Toggle delete mode
deleteModeButton.addEventListener('click', () => {
    deleteMode = !deleteMode;
    deleteModeButton.style.backgroundColor = deleteMode ? '#39ff14' : '#ff0000'; // Verde quando ligado, vermelho quando desligado
    deleteModeButton.textContent = deleteMode ? 'Modo Excluir: Ativo' : 'Modo Excluir';
});

// Disable delete mode on Enter key
document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        deleteMode = false;
        deleteModeButton.style.backgroundColor = '#ff0000';
        deleteModeButton.textContent = 'Modo Excluir';
    }
});

// Select category
categoryList.addEventListener('click', (event) => {
    if (event.target.classList.contains('category-item')) {
        selectedCategory = event.target.dataset.category;
        selectCategory(selectedCategory);
    }
});

function selectCategory(category) {
    // Remove seleção de todas as categorias
    categoryList.querySelectorAll('.category-item').forEach(item => {
        item.classList.remove('selected');
        item.style.backgroundColor = ''; // Limpa qualquer cor de fundo definida
    });

    // Seleciona a categoria escolhida
    const selectedCategoryElement = categoryList.querySelector(`[data-category="${category}"]`);
    selectedCategoryElement.classList.add('selected');
    const categoryColor = getCategoryColor(category);
    selectedCategoryElement.style.backgroundColor = categoryColor;

    // Atualiza a variável global de categoria selecionada
    selectedCategory = category;

    // Se há uma nota selecionada, atualiza sua cor
    if (selectedNote) {
        updateNoteColor(selectedNote, category);
    }
}

function getCategoryColor(category) {
    switch (category) {
        case 'green':
            return '#29FA10'; // Branco
        case 'blue':
            return '#37617A'; // Azul neon
        case 'red':
            return '#f23839'; // Vermelho neon
        case 'yellow':
            return '#f2ca50'; // Amarelo neon
        case 'purple':
            return '#378c4b'; // Roxo neon
        default:
            return '#fff'; // Verde neon brilhoso (padrão)
    }
}

function updateNoteColor(note, category) {
    const categoryColor = getCategoryColor(category);
    note.style.backgroundColor = categoryColor;
    note.style.boxShadow = `0 0 15px ${categoryColor}`;
}

noteContainer.addEventListener('dblclick', (e) => {
    if (!deleteMode) {
        const note = createNoteAtPosition(e.clientX, e.clientY, selectedCategory);
        if (!notesByCategory[selectedCategory]) {
            notesByCategory[selectedCategory] = [];
        }
        notesByCategory[selectedCategory].push(note);
        updateNoteList();
        checkAndConnectNotes();
    }
});

noteContainer.addEventListener('mousemove', (e) => {
    if (isDragging && dragNote) {
        const x = e.clientX - offsetX;
        const y = e.clientY - offsetY;
        dragNote.style.left = `${x}px`;
        dragNote.style.top = `${y}px`;
        checkAndConnectNotes();
    }
});

noteContainer.addEventListener('mouseup', () => {
    isDragging = false;
    dragNote = null;
});

function createNoteAtPosition(x, y, category) {
    const note = document.createElement('div');
    note.classList.add('note');
    note.style.top = `${y - noteContainer.offsetTop - 10}px`;
    note.style.left = `${x - noteContainer.offsetLeft - 10}px`;
    updateNoteColor(note, category);

    const textarea = document.createElement('textarea');
    note.appendChild(textarea);

    note.addEventListener('mousedown', (e) => {
        if (e.target === note) { // Garante que o mousedown não seja na textarea
            isDragging = true;
            dragNote = note;
            offsetX = e.clientX - note.offsetLeft;
            offsetY = e.clientY - note.offsetTop;
        }
        e.stopPropagation();
    });

    note.addEventListener('click', (e) => {
        e.stopPropagation();
        if (deleteMode) {
            noteContainer.removeChild(note);
            notesByCategory[category] = notesByCategory[category].filter(n => n !== note);
            updateNoteList();
            checkAndConnectNotes();
        } else {
            selectNote(note);
        }
    });

    textarea.addEventListener('blur', () => {
        deselectNote();
        updateNoteContent(note, textarea.value);
        updateNoteList();
        checkAndConnectNotes();
    });

    textarea.addEventListener('input', () => {
        updateNoteContent(note, textarea.value);
    });

    noteContainer.appendChild(note);
    selectNote(note);

    return note;
}

function selectNote(note) {
    deselectNote();
    selectedNote = note;
    note.classList.add('active');
    const textarea = note.querySelector('textarea');
    textarea.focus();
}

function deselectNote() {
    if (selectedNote) {
        selectedNote.classList.remove('active');
        selectedNote = null;
    }
}

function updateNoteContent(note, content) {
    note.setAttribute('data-content', content.substring(0, 10) + (content.length > 10 ? '...' : ''));
}

function updateNoteList() {
    noteList.innerHTML = '';
    Object.keys(notesByCategory).forEach(category => {
        const categoryNotes = notesByCategory[category];
        categoryNotes.forEach((note, index) => {
            const listItem = document.createElement('li');
            listItem.textContent = note.getAttribute('data-content');
            noteList.appendChild(listItem);
        });
    });
}

function checkAndConnectNotes() {
    // Limpa todas as linhas de conexão existentes
    connectors.forEach(connector => connector.parentNode.removeChild(connector));
    connectors = [];

    const notes = Array.from(noteContainer.querySelectorAll('.note'));
    const notesWithEpa = notes.filter(note => note.querySelector('textarea').value.includes('epa'));
    
    if (notesWithEpa.length >= 2) {
        const firstNote = notesWithEpa[0];
        const secondNote = notesWithEpa[1];
        
        const line = document.createElement('div');
        line.classList.add('connector');
        
        const offsetX1 = firstNote.offsetLeft + firstNote.offsetWidth / 2;
        const offsetY1 = firstNote.offsetTop + firstNote.offsetHeight / 2;
        const offsetX2 = secondNote.offsetLeft + secondNote.offsetWidth / 2;
        const offsetY2 = secondNote.offsetTop + secondNote.offsetHeight / 2;
        
        const angle = Math.atan2(offsetY2 - offsetY1, offsetX2 - offsetX1) * 180 / Math.PI;
        const length = Math.sqrt((offsetX2 - offsetX1) ** 2 + (offsetY2 - offsetY1) ** 2);
        
        line.style.width = `${length}px`;
        line.style.transform = `rotate(${angle}deg)`;
        line.style.left = `${offsetX1}px`;
        line.style.top = `${offsetY1}px`;
        
        noteContainer.appendChild(line);
        connectors.push(line);
    }
}
