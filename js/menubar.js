// This script handles the menu bar functionality for the web application.
function toggleMenu() {
  const menu = document.getElementById('mainMenu');
  menu.classList.toggle('menu-hidden');
}

function showUserMenu(ad_soyad, rol) {
  const authButtons = document.querySelector('.auth-buttons');
  if (authButtons) authButtons.style.display = 'none';
  const userMenu = document.querySelector('.user-menu');
  if (userMenu) {
    document.getElementById('userName').textContent = ad_soyad;
    userMenu.style.display = 'inline-block';
    const inboxLink = document.getElementById('inbox-link');
    if (inboxLink) {
      if (rol === 'admin') {
        inboxLink.style.display = 'block';
        inboxLink.href = 'inbox.html';
      } else {
        inboxLink.style.display = 'none';
      }
    }
    // Kullanıcı Bilgilerim linki
    const profileLink = document.getElementById('profile-link');
    if (profileLink) {
      profileLink.onclick = function(e) {
        e.preventDefault();
        window.location.href = 'info.html';
      };
    }
  }
}

function hideUserMenu() {
  const userMenu = document.querySelector('.user-menu');
  if (userMenu) userMenu.style.display = 'none';
  const authButtons = document.querySelector('.auth-buttons');
  if (authButtons) authButtons.style.display = 'flex';
}

function toggleUserMenu() {
  const userMenu = document.querySelector('.user-menu');
  const dropdown = document.getElementById('userDropdown');
  if (dropdown) {
    dropdown.classList.toggle('open');
    // Ayrıca parent'a da open class'ı ekle/çıkar
    if (userMenu) userMenu.classList.toggle('open');
  }
}

function logoutUser(event) {
  event.preventDefault();
  fetch('/logout', { method: 'POST' })
    .then(() => location.reload());
}

function updateMenuForUser(isLoggedIn, rol) {
  const mainMenu = document.getElementById('mainMenu');
  if (!mainMenu) return;
  mainMenu.innerHTML = '';
  if (isLoggedIn) {
    if (rol === 'admin') {
      mainMenu.innerHTML = `
        <li><button onclick="location.href='index.html'"><i class="fas fa-home"></i> Ana Sayfa</button></li>
        <li><button onclick="location.href='admin_diet_assignments.html'"><i class="fas fa-apple-alt"></i> Diyetler</button></li>
        <li><button onclick="location.href='admin_fitness_assignments.html'"><i class="fas fa-dumbbell"></i> Antrenmanlar</button></li>
        <li><button onclick="location.href='program.html'"><i class="fas fa-bars"></i> Tüm Programlar</button></li>
      `;
    } else {
      mainMenu.innerHTML = `
        <li><button onclick="location.href='index.html'"><i class="fas fa-home"></i> Ana Sayfa</button></li>
        <li><button onclick="location.href='my_diet.html'"><i class="fas fa-apple-alt"></i> Diyet Programım</button></li>
        <li><button onclick="location.href='my_workout.html'"><i class="fas fa-dumbbell"></i> Fitness Programım</button></li>
        <li><button onclick="location.href='program.html'"><i class="fas fa-bars"></i> Tüm Programlar</button></li>
        <li><button onclick="location.href='olcumler.html'"><i class="fa-solid fa-pen"></i> Ölçümler</button></li>
      `;
    }
  } else {
    mainMenu.innerHTML = `
      <li><button onclick="location.href='index.html'"><i class="fas fa-home"></i> Ana Sayfa</button></li>
      <li><button onclick="location.href='wrw.html'"><i class="fas fa-users"></i> Biz Kimiz?</button></li>
      <li><button onclick="location.href='program.html'"><i class="fas fa-bars"></i> Programlar</button></li>
      <li><button onclick="location.href='contact.html'"><i class="fas fa-envelope"></i> İletişim</button></li>
      

    `;
  }
}

window.addEventListener('DOMContentLoaded', function() {
  // Küçük ekranlarda menüyü gizle
  if (window.innerWidth <= 900) {
    const menu = document.getElementById('mainMenu');
    if (menu) menu.classList.add('menu-hidden');
  }
  fetch('/me')
    .then(res => res.json())
    .then(data => {
      if (data && data.ad_soyad) {
        updateMenuForUser(true, data.rol); // rol parametresi eklendi
        showUserMenu(data.ad_soyad, data.rol);
      } else {
        updateMenuForUser(false);
        hideUserMenu();
      }
    });
});

window.onresize = function() {
  const menu = document.getElementById('mainMenu');
  if (!menu) return;
  if (window.innerWidth > 900) {
    menu.classList.remove('menu-hidden');
  } else {
    menu.classList.add('menu-hidden');
  }
};

// Kapanınca dropdown'ı kapat
window.addEventListener('click', function(e) {
  const dropdown = document.getElementById('userDropdown');
  const userMenu = document.querySelector('.user-menu');
  if (!dropdown) return;
  if (!dropdown.contains(e.target) && !e.target.classList.contains('user-menu-btn')) {
    dropdown.classList.remove('open');
    if (userMenu) userMenu.classList.remove('open');
  }
});