// Constants
const ALLOWED = ["alexkoong", "zanderbravo", "noahhernandez", "jameslian"];

// Global variables
let currentUser = null;
let currentRole = null;
let fines = [];

// DOM elements
const loginModal = document.getElementById('loginModal');
const app = document.getElementById('app');
const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('usernameInput');
const userDisplay = document.getElementById('userDisplay');
const logoutBtn = document.getElementById('logoutBtn');
const finesTableBody = document.getElementById('finesTableBody');
const addFineSection = document.getElementById('addFineSection');
const addFineForm = document.getElementById('addFineForm');

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    loadStoredData();
    checkAuth();
    setupEventListeners();
});

// Load data from localStorage
function loadStoredData() {
    const storedUsername = localStorage.getItem('username');
    const storedFines = localStorage.getItem('fines');
    
    if (storedUsername) {
        currentUser = storedUsername;
        currentRole = ALLOWED.includes(storedUsername) ? "upper" : "viewer";
    }
    
    if (storedFines) {
        fines = JSON.parse(storedFines);
    }
}

// Check authentication status
function checkAuth() {
    if (currentUser) {
        showApp();
    } else {
        showLoginModal();
    }
}

// Show login modal
function showLoginModal() {
    loginModal.style.display = 'flex';
    app.style.display = 'none';
}

// Show main app
function showApp() {
    loginModal.style.display = 'none';
    app.style.display = 'block';
    updateUserDisplay();
    renderFinesTable();
    toggleAddFineSection();
}

// Update user display in navbar
function updateUserDisplay() {
    const roleDisplay = currentRole === 'upper' ? 'Admin' : 'Viewer';
    userDisplay.textContent = `${currentUser} (${roleDisplay})`;
}

// Toggle add fine section based on role
function toggleAddFineSection() {
    if (currentRole === 'upper') {
        addFineSection.style.display = 'block';
    } else {
        addFineSection.style.display = 'none';
    }
}

// Render fines table
function renderFinesTable() {
    finesTableBody.innerHTML = '';
    
    fines.forEach(fine => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${fine.date}</td>
            <td>${fine.offender}</td>
            <td>${fine.desc}</td>
            <td>$${fine.amt.toFixed(2)}</td>
            <td>${fine.proposer}</td>
        `;
        finesTableBody.appendChild(row);
    });
}

// Save fines to localStorage
function saveFines() {
    localStorage.setItem('fines', JSON.stringify(fines));
}

// Setup event listeners
function setupEventListeners() {
    // Login form
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const username = usernameInput.value.trim();
        
        if (username) {
            currentUser = username;
            currentRole = ALLOWED.includes(username) ? "upper" : "viewer";
            localStorage.setItem('username', username);
            showApp();
            usernameInput.value = '';
        }
    });
    
    // Logout button
    logoutBtn.addEventListener('click', function() {
        currentUser = null;
        currentRole = null;
        localStorage.removeItem('username');
        showLoginModal();
    });
    
    // Add fine form
    addFineForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (currentRole !== 'upper') return;
        
        const offender = document.getElementById('offenderInput').value.trim();
        const description = document.getElementById('descriptionInput').value.trim();
        const amount = parseFloat(document.getElementById('amountInput').value);
        
        if (offender && description && !isNaN(amount)) {
            const newFine = {
                offender: offender,
                desc: description,
                amt: amount,
                proposer: currentUser,
                date: new Date().toISOString().slice(0, 10)
            };
            
            fines.push(newFine);
            saveFines();
            renderFinesTable();
            
            // Clear form
            addFineForm.reset();
        }
    });
}