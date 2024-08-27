const noteContainer = document.getElementById('note-container');
const userCircle = document.getElementById('user-circle');
const userDropdown = document.getElementById('user-dropdown');
const loginModal = document.getElementById('login-modal');
const signupModal = document.getElementById('signup-modal');
const deleteModeButton = document.getElementById('delete-mode-button');
const colorMenu = document.getElementById('color-menu');
const colorBubbles = colorMenu.querySelectorAll('.color-bubble');

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
    deleteModeButton.style.backgroundColor = deleteMode ? '#39ff14' : '#ff6347'; // Verde quando ligado, vermelho quando desligado
    deleteModeButton.textContent = deleteMode ? 'Modo Excluir: Ativo' : 'Modo Excluir';
});

// Disable delete mode on Enter key
document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        deleteMode = false;
        deleteModeButton.style.backgroundColor = '#ff6347';
        deleteModeButton.textContent = 'Modo Excluir';
    }
});

// Select category
colorBubbles.forEach(bubble => {
    bubble.addEventListener('click', () => {
        selectedCategory = bubble.dataset.category;
        selectCategory(selectedCategory);
    });

    bubble.addEventListener('mouseover', () => {
        bubble.style.boxShadow = `0 0 10px ${getCategoryColor(bubble.dataset.category)}`;
    });

    bubble.addEventListener('mouseout', () => {
        if (bubble.dataset.category !== selectedCategory) {
            bubble.style.boxShadow = 'none';
        }
    });
});

function selectCategory(category) {
    // Remove a seleção de todas as bolinhas
    colorBubbles.forEach(bubble => {
        bubble.classList.remove('selected');
        bubble.style.boxShadow = 'none'; // Remove o efeito neon das bolinhas não selecionadas
    });

    // Seleciona a bolinha escolhida
    const selectedBubble = colorMenu.querySelector(`[data-category="${category}"]`);
    selectedBubble.classList.add('selected');
    selectedBubble.style.boxShadow = `0 0 10px ${getCategoryColor(category)}`; // Aplica o efeito neon na bolinha selecionada

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
            return '#29FA10';
        case 'blue':
            return '#37617A';
        case 'red':
            return '#f23839';
        case 'yellow':
            return '#f2ca50';
        case 'purple':
            return '#378c4b';
        default:
            return '#fff';
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
    note.style.top = `${y - noteContainer.offsetTop - 20}px`;
    note.style.left = `${x - noteContainer.offsetLeft - 20}px`;
    updateNoteColor(note, category);

    const textarea = document.createElement('textarea');
    note.appendChild(textarea);

    note.addEventListener('mousedown', (e) => {
        if (e.target === note) {
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

    // Coleta todas as notas e agrupa por cor
    const notesByColor = {};
    const notes = Array.from(noteContainer.querySelectorAll('.note'));

    notes.forEach(note => {
        const color = note.style.backgroundColor;
        if (!notesByColor[color]) {
            notesByColor[color] = [];
        }
        notesByColor[color].push(note);
    });

    // Cria linhas de conexão para notas da mesma cor
    Object.keys(notesByColor).forEach(color => {
        const colorNotes = notesByColor[color];
        for (let i = 0; i < colorNotes.length - 1; i++) {
            const note1 = colorNotes[i];
            const note2 = colorNotes[i + 1];

            const rect1 = note1.getBoundingClientRect();
            const rect2 = note2.getBoundingClientRect();
            const x1 = rect1.left + rect1.width / 2 - noteContainer.offsetLeft;
            const y1 = rect1.top + rect1.height / 2 - noteContainer.offsetTop;
            const x2 = rect2.left + rect2.width / 2 - noteContainer.offsetLeft;
            const y2 = rect2.top + rect2.height / 2 - noteContainer.offsetTop;

            const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
            const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;

            const line = document.createElement('div');
            line.classList.add('connector');
            line.style.width = `${length}px`;
            line.style.backgroundColor = color;
            line.style.left = `${x1}px`;
            line.style.top = `${y1}px`;
            line.style.transform = `rotate(${angle}deg)`;
            line.style.transformOrigin = '0 0'; // Garante que a rotação ocorra a partir do início da linha

            noteContainer.appendChild(line);
            connectors.push(line);
        }
    });
}

// Atualiza a posição das linhas a cada 500ms
setInterval(() => {
    checkAndConnectNotes();
}, 1);
// Referências aos formulários
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const goToSignup = document.getElementById('go-to-signup');
const goToLogin = document.getElementById('go-to-login');

// Troca entre login e signup
goToSignup.addEventListener('click', () => {
  loginModal.style.display = 'none';
  signupModal.style.display = 'flex';
});

goToLogin.addEventListener('click', () => {
  signupModal.style.display = 'none';
  loginModal.style.display = 'flex';
});

// Processar login
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  auth.signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      alert('Login successful');
      loginModal.style.display = 'none';
      // Implementar lógica após login, como redirecionar ou exibir dashboard
    })
    .catch((error) => {
      alert(error.message);
    });
});

// Processar cadastro
signupForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;

  auth.createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      // Salvar informações adicionais do usuário, como username
      db.collection('users').doc(user.uid).set({
        username: document.getElementById('signup-username').value,
        email: email
      });
      alert('Signup successful');
      signupModal.style.display = 'none';
    })
    .catch((error) => {
      alert(error.message);
    });
});
