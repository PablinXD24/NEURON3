// Mostrar tela de planos inicialmente
document.addEventListener('DOMContentLoaded', () => {
    // Esconder a interface principal inicialmente
    document.querySelector('header').style.display = 'none';
    document.getElementById('app').style.display = 'none';
    document.getElementById('color-menu-container').style.display = 'none';
    document.getElementById('expand-bar').style.display = 'none';
    
    // Configurar evento para o plano ENIAC
    document.getElementById('eniac-plan-btn').addEventListener('click', () => {
        // Esconder tela de planos
        document.getElementById('plans-screen').style.display = 'none';
        
        // Mostrar interface principal
        document.querySelector('header').style.display = 'flex';
        document.getElementById('app').style.display = 'flex';
        document.getElementById('color-menu-container').style.display = 'flex';
        document.getElementById('expand-bar').style.display = 'flex';
        
        // Mostrar modal de login automaticamente
        loginModal.style.display = 'flex';
        
        // Fechar outros modais que possam estar abertos
        signupModal.style.display = 'none';
        popup.style.display = 'none';
    });
    
    // Configurar eventos para os outros planos (mostrar mensagem)
    document.querySelectorAll('.plan-card:not(.eniac) .select-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            alert('Este plano não está disponível no momento. Por favor, selecione o plano ENIAC STUDANT.');
        });
    });
});

// Elementos da DOM
const noteContainer = document.getElementById('note-container');
const userCircle = document.getElementById('user-circle');
const loginModal = document.getElementById('login-modal');
const signupModal = document.getElementById('signup-modal');
const deleteModeButton = document.getElementById('delete-mode-button');
const colorMenuContainer = document.getElementById('color-menu-container');
const colorMenuToggle = document.getElementById('color-menu-toggle');
const colorMenu = document.getElementById('color-menu');
const colorBubbles = colorMenu.querySelectorAll('.color-bubble');
const expandBar = document.getElementById('expand-bar');
const popup = document.getElementById('popup');
const closePopup = document.querySelector('.close-popup');
const interpretationModal = document.getElementById('interpretation-modal');
const interpretationText = document.getElementById('interpretation-text');
const userInfo = document.getElementById('user-info');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const goToSignup = document.getElementById('go-to-signup');
const goToLogin = document.getElementById('go-to-login');
const googleLoginModalButton = document.getElementById('google-login-modal-button');
const googleSignupModalButton = document.getElementById('google-signup-modal-button');

// Variáveis de estado
let selectedNote = null;
let notesByCategory = {};
let connectors = [];
let isDragging = false;
let dragNote = null;
let offsetX, offsetY;
let deleteMode = false;
let selectedCategory = 'green';

// ====================== FUNÇÕES DE AUTENTICAÇÃO ====================== //

/**
 * Login com Google
 */
function signInWithGoogle() {
  auth.signInWithPopup(googleProvider)
    .then((result) => {
      const user = result.user;
      
      // Verifica se é um novo usuário
      if (result.additionalUserInfo.isNewUser) {
        return db.collection('users').doc(user.uid).set({
          username: user.displayName || 'Usuário Google',
          email: user.email,
          photoURL: user.photoURL,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          notes: []
        });
      }
    })
    .then(() => {
      closeAllModals();
      updateUserProfile();
      loadUserNotes();
    })
    .catch((error) => {
      console.error("Erro no login com Google:", error);
      alert(error.message);
    });
}

/**
 * Login com email/senha
 */
function signInWithEmail(email, password) {
  auth.signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      closeAllModals();
      updateUserProfile();
      loadUserNotes();
    })
    .catch((error) => {
      alert(error.message);
    });
}

/**
 * Cadastro com email/senha
 */
function signUpWithEmail(email, password, username) {
  auth.createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      
      return db.collection('users').doc(user.uid).set({
        username: username,
        email: email,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        notes: []
      });
    })
    .then(() => {
      closeAllModals();
      updateUserProfile();
    })
    .catch((error) => {
      alert(error.message);
    });
}

/**
 * Logout
 */
function signOut() {
  auth.signOut().then(() => {
    updateUserProfile();
    clearNotes();
  }).catch((error) => {
    alert(error.message);
  });
}

/**
 * Atualiza a interface com o estado do usuário
 */
function updateUserProfile() {
  const user = auth.currentUser;
  
  if (user) {
    // Usuário logado
    userCircle.style.backgroundImage = user.photoURL ? `url(${user.photoURL})` : '';
    userCircle.style.backgroundSize = 'cover';
    
    // Atualiza opções de perfil
    document.getElementById('login-button').style.display = 'none';
    document.getElementById('signup-button').style.display = 'none';
    document.getElementById('logout-button').style.display = 'flex';
    document.getElementById('upload-photo-button').style.display = 'flex';

    // Carrega informações adicionais do Firestore
    db.collection('users').doc(user.uid).get()
      .then((doc) => {
        if (doc.exists) {
          const userData = doc.data();
          userInfo.innerHTML = `
            <h3>Bem-vindo, ${userData.username || user.displayName || 'Usuário'}!</h3>
            <div class="user-details">
              <p><strong>Email:</strong> ${user.email}</p>
              ${userData.createdAt ? `<p><strong>Membro desde:</strong> ${new Date(userData.createdAt.toDate()).toLocaleDateString()}</p>` : ''}
            </div>
          `;
        }
      });
  } else {
    // Usuário não logado
    userCircle.style.backgroundImage = '';
    userCircle.style.backgroundColor = '#ffffff';
    
    document.getElementById('login-button').style.display = 'flex';
    document.getElementById('signup-button').style.display = 'flex';
    document.getElementById('logout-button').style.display = 'none';
    document.getElementById('upload-photo-button').style.display = 'none';

    userInfo.innerHTML = '<p>Faça login para acessar suas notas</p>';
  }
}

/**
 * Fecha todos os modais
 */
function closeAllModals() {
  loginModal.style.display = 'none';
  signupModal.style.display = 'none';
  popup.style.display = 'none';
}

// ====================== FUNÇÕES DE NOTAS ====================== //

/**
 * Cria uma nova nota na posição especificada
 */
function createNoteAtPosition(x, y, category, content = '', id = null) {
  const note = document.createElement('div');
  note.classList.add('note');
  note.dataset.category = category;
  note.dataset.id = id || Date.now().toString();
  note.style.top = `${y - noteContainer.offsetTop - 20}px`;
  note.style.left = `${x - noteContainer.offsetLeft - 20}px`;
  updateNoteColor(note, category);

  const textarea = document.createElement('textarea');
  textarea.value = content;
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
      deleteNote(note);
    } else {
      selectNote(note);
    }
  });

  textarea.addEventListener('blur', async () => {
    deselectNote();
    updateNoteContent(note, textarea.value);
    await saveNote(note);
    
    // Interpretação da nota (opcional)
    if (textarea.value.trim()) {
      const interpretation = await interpretNote(textarea.value);
      if (interpretation) {
        const sentiment = interpretation[0].label;
        const confidence = interpretation[0].score;
        textarea.value = `${textarea.value}\n\n"${sentiment} (${(confidence * 100).toFixed(2)}%)"`;
        updateNoteContent(note, textarea.value);
        await saveNote(note);
      }
    }
  });

  textarea.addEventListener('input', () => {
    updateNoteContent(note, textarea.value);
  });

  noteContainer.appendChild(note);
  return note;
}

/**
 * Salva uma nota no Firestore
 */
async function saveNote(note) {
  const user = auth.currentUser;
  if (!user) return;

  const noteData = {
    id: note.dataset.id,
    x: parseInt(note.style.left),
    y: parseInt(note.style.top),
    category: note.dataset.category,
    content: note.querySelector('textarea').value,
    color: note.style.backgroundColor
  };

  await db.collection('users').doc(user.uid).update({
    notes: firebase.firestore.FieldValue.arrayUnion(noteData)
  });
}

/**
 * Carrega as notas do usuário
 */
async function loadUserNotes() {
  const user = auth.currentUser;
  if (!user) return;

  // Limpa notas existentes
  clearNotes();

  const userDoc = await db.collection('users').doc(user.uid).get();
  if (userDoc.exists && userDoc.data().notes) {
    userDoc.data().notes.forEach(noteData => {
      createNoteAtPosition(
        noteData.x + noteContainer.offsetLeft + 20,
        noteData.y + noteContainer.offsetTop + 20,
        noteData.category,
        noteData.content,
        noteData.id
      );
    });
  }
}

/**
 * Deleta uma nota
 */
async function deleteNote(note) {
  const user = auth.currentUser;
  if (!user) return;

  // Remove do Firestore
  const noteData = {
    id: note.dataset.id,
    x: parseInt(note.style.left),
    y: parseInt(note.style.top),
    category: note.dataset.category,
    content: note.querySelector('textarea').value,
    color: note.style.backgroundColor
  };

  await db.collection('users').doc(user.uid).update({
    notes: firebase.firestore.FieldValue.arrayRemove(noteData)
  });

  // Remove da interface
  noteContainer.removeChild(note);
  checkAndConnectNotes();
}

/**
 * Limpa todas as notas da interface
 */
function clearNotes() {
  document.querySelectorAll('.note').forEach(note => note.remove());
  connectors.forEach(connector => connector.remove());
  connectors = [];
}

// ====================== FUNÇÕES DE INTERFACE ====================== //

/**
 * Seleciona uma nota
 */
function selectNote(note) {
  deselectNote();
  selectedNote = note;
  note.classList.add('active');
  const textarea = note.querySelector('textarea');
  textarea.focus();
}

/**
 * Deseleciona a nota atual
 */
function deselectNote() {
  if (selectedNote) {
    selectedNote.classList.remove('active');
    selectedNote = null;
  }
}

/**
 * Atualiza o conteúdo visual da nota
 */
function updateNoteContent(note, content) {
  note.setAttribute('data-content', content.substring(0, 10) + (content.length > 10 ? '...' : ''));
}

/**
 * Atualiza a cor da nota
 */
function updateNoteColor(note, category) {
  const categoryColor = getCategoryColor(category);
  note.style.backgroundColor = categoryColor;
  note.style.boxShadow = `0 0 15px ${categoryColor}`;
  note.dataset.category = category;
}

/**
 * Seleciona uma categoria
 */
function selectCategory(category) {
  colorBubbles.forEach(bubble => {
    bubble.classList.remove('selected');
    bubble.style.boxShadow = 'none';
  });

  const selectedBubble = colorMenu.querySelector(`[data-category="${category}"]`);
  selectedBubble.classList.add('selected');
  selectedBubble.style.boxShadow = `0 0 10px ${getCategoryColor(category)}`;
  selectedCategory = category;

  // Atualiza o título
  const colorMenuTitle = document.getElementById('color-menu-title');
  colorMenuTitle.textContent = getCategoryName(category);
  colorMenuTitle.style.color = getCategoryColor(category);

  if (selectedNote) {
    updateNoteColor(selectedNote, category);
    saveNote(selectedNote);
  }
}

/**
 * Conecta notas da mesma cor
 */
function checkAndConnectNotes() {
  connectors.forEach(connector => connector.remove());
  connectors = [];

  const notesByColor = {};
  const notes = Array.from(noteContainer.querySelectorAll('.note'));

  notes.forEach(note => {
    const color = note.style.backgroundColor;
    if (!notesByColor[color]) {
      notesByColor[color] = [];
    }
    notesByColor[color].push(note);
  });

  Object.keys(notesByColor).forEach(color => {
    const colorNotes = notesByColor[color];
    for (let i = 0; i < colorNotes.length - 1; i++) {
      const note1 = colorNotes[i];
      const note2 = colorNotes[i + 1];

      const rect1 = note1.getBoundingClientRect();
      const rect2 = note2.getBoundingClientRect();

      const x1 = rect1.left - noteContainer.getBoundingClientRect().left + rect1.width / 2;
      const y1 = rect1.top - noteContainer.getBoundingClientRect().top + rect1.height / 2;
      const x2 = rect2.left - noteContainer.getBoundingClientRect().left + rect2.width / 2;
      const y2 = rect2.top - noteContainer.getBoundingClientRect().top + rect2.height / 2;

      const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
      const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;

      const line = document.createElement('div');
      line.classList.add('connector');
      line.style.width = `${length}px`;
      line.style.backgroundColor = color;
      line.style.left = `${x1}px`;
      line.style.top = `${y1}px`;
      line.style.transform = `rotate(${angle}deg)`;
      line.style.transformOrigin = '0 0';

      noteContainer.appendChild(line);
      connectors.push(line);
    }
  });
}

// ====================== FUNÇÕES UTILITÁRIAS ====================== //

function getCategoryColor(category) {
  switch (category) {
    case 'green': return '#29FA10';
    case 'blue': return '#37617A';
    case 'red': return '#f23839';
    case 'yellow': return '#f2ca50';
    case 'purple': return '#378c4b';
    default: return '#fff';
  }
}

function getCategoryName(category) {
  switch (category) {
    case 'green': return 'Social';
    case 'blue': return 'Trabalho';
    case 'red': return 'Saúde';
    case 'yellow': return 'Alimentação';
    case 'purple': return 'Estudos';
    default: return 'Categoria';
  }
}

async function interpretNote(content) {
  const API_URL = "https://api-inference.huggingface.co/models/tabularisai/multilingual-sentiment-analysis";
  const API_TOKEN = "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";

  try {
    const response = await axios.post(
      API_URL,
      { inputs: content },
      { headers: { Authorization: `Bearer ${API_TOKEN}` } }
    );
    return response.data;
  } catch (error) {
    console.error("Erro ao interpretar a nota:", error);
    return null;
  }
}

// ====================== EVENT LISTENERS ====================== //

// Autenticação
document.getElementById('google-login-button').addEventListener('click', signInWithGoogle);
googleLoginModalButton.addEventListener('click', signInWithGoogle);
googleSignupModalButton.addEventListener('click', signInWithGoogle);
document.getElementById('logout-button').addEventListener('click', signOut);

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  signInWithEmail(email, password);
});

signupForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  const username = document.getElementById('signup-username').value;
  signUpWithEmail(email, password, username);
});

// Troca entre login e signup
goToSignup.addEventListener('click', () => {
  loginModal.style.display = 'none';
  signupModal.style.display = 'flex';
});

goToLogin.addEventListener('click', () => {
  signupModal.style.display = 'none';
  loginModal.style.display = 'flex';
});

// Notas
noteContainer.addEventListener('dblclick', (e) => {
  if (!deleteMode && auth.currentUser) {
    const note = createNoteAtPosition(e.clientX, e.clientY, selectedCategory);
    saveNote(note);
  }
});

noteContainer.addEventListener('mousemove', (e) => {
  if (isDragging && dragNote) {
    dragNote.style.left = `${e.clientX - offsetX}px`;
    dragNote.style.top = `${e.clientY - offsetY}px`;
    checkAndConnectNotes();
  }
});

noteContainer.addEventListener('mouseup', () => {
  if (isDragging && dragNote) {
    isDragging = false;
    saveNote(dragNote);
    dragNote = null;
  }
});

// Menu de cores
colorBubbles.forEach(bubble => {
  bubble.addEventListener('click', () => selectCategory(bubble.dataset.category));
});

colorMenuToggle.addEventListener('click', () => {
  colorMenuContainer.classList.toggle('open');
});

// Modo deletar
deleteModeButton.addEventListener('click', () => {
  deleteMode = !deleteMode;
  deleteModeButton.style.backgroundColor = deleteMode ? '#39ff14' : '#ff6347';
  deleteModeButton.textContent = deleteMode ? 'Modo Excluir: Ativo' : 'Modo Excluir';
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') deleteMode = false;
});

// Popup
expandBar.addEventListener('click', () => popup.style.display = 'block');
closePopup.addEventListener('click', () => popup.style.display = 'none');

window.addEventListener('click', (e) => {
  if (popup.style.display === 'block' && !popup.contains(e.target) && !expandBar.contains(e.target)) {
    popup.style.display = 'none';
  }
});

// Observador de autenticação
auth.onAuthStateChanged((user) => {
  updateUserProfile();
  if (user) loadUserNotes();
});

// Atualiza conectores periodicamente
setInterval(checkAndConnectNotes, 100);

// Inicialização
updateUserProfile();
