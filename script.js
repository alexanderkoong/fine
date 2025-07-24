// Constants
const ALL_USERS = ["alexkoong", "zanderbravo", "noahhernandez", "jameslian", "tobyluo", "lukasphimvongsa", "robertyang", "theomurphy", "coleoberg", "eliotwasserman"];
const ADMIN_USERS = ["alexkoong", "zanderbravo", "noahhernandez", "jameslian"];
const CORRECT_PASSWORD = "bmt2025";

// Global variables
let currentUser = null;
let currentRole = null;
let fines = [];
let currentPage = 'fines';

// DOM elements
const loginModal = document.getElementById('loginModal');
const app = document.getElementById('app');
const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('usernameInput');
const passwordInput = document.getElementById('passwordInput');
const userDisplay = document.getElementById('userDisplay');
const logoutBtn = document.getElementById('logoutBtn');
const finesTableBody = document.getElementById('finesTableBody');
const addFineSection = document.getElementById('addFineSection');
const addFineForm = document.getElementById('addFineForm');
const finesPageBtn = document.getElementById('finesPageBtn');
const totalsPageBtn = document.getElementById('totalsPageBtn');
const finesPage = document.getElementById('finesPage');
const totalsPage = document.getElementById('totalsPage');
const totalsContainer = document.getElementById('totalsContainer');
const fineDetailModal = document.getElementById('fineDetailModal');
const closeFineModal = document.getElementById('closeFineModal');
const fineDetailTitle = document.getElementById('fineDetailTitle');
const fineDetailContent = document.getElementById('fineDetailContent');
const repliesContainer = document.getElementById('repliesContainer');
const replyForm = document.getElementById('replyForm');
const replyInput = document.getElementById('replyInput');

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    loadStoredData();
    checkAuth();
    setupEventListeners();
});

// Load data from localStorage
function loadStoredData() {
    const storedUsername = localStorage.getItem('username');
    const storedPassword = localStorage.getItem('password');
    const storedFines = localStorage.getItem('fines');
    
    if (storedUsername && storedPassword === CORRECT_PASSWORD) {
        if (ALL_USERS.includes(storedUsername)) {
            currentUser = storedUsername;
            currentRole = ADMIN_USERS.includes(storedUsername) ? "admin" : "viewer";
        }
    }
    
    if (storedFines) {
        fines = JSON.parse(storedFines);
        // Ensure each fine has replies array and id
        fines.forEach((fine, index) => {
            if (!fine.replies) fine.replies = [];
            if (!fine.id) fine.id = Date.now() + index;
        });
        saveFines();
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
    showPage(currentPage);
    toggleAddFineSection();
}

// Update user display in navbar
function updateUserDisplay() {
    const roleDisplay = currentRole === 'admin' ? 'Admin' : 'Member';
    userDisplay.textContent = `${currentUser} (${roleDisplay})`;
}

// Toggle add fine section based on role
function toggleAddFineSection() {
    if (currentRole === 'admin') {
        addFineSection.style.display = 'block';
    } else {
        addFineSection.style.display = 'none';
    }
}

// Show specific page
function showPage(page) {
    currentPage = page;
    
    // Update nav button states
    finesPageBtn.classList.toggle('active', page === 'fines');
    totalsPageBtn.classList.toggle('active', page === 'totals');
    
    // Show/hide pages
    finesPage.style.display = page === 'fines' ? 'block' : 'none';
    totalsPage.style.display = page === 'totals' ? 'block' : 'none';
    
    if (page === 'fines') {
        renderFinesTable();
    } else if (page === 'totals') {
        renderTotalsPage();
    }
}

// Render fines table
function renderFinesTable() {
    finesTableBody.innerHTML = '';
    
    fines.forEach((fine, index) => {
        const row = document.createElement('tr');
        row.classList.add('fine-row');
        row.dataset.fineIndex = index;
        row.innerHTML = `
            <td>${fine.date}</td>
            <td>${fine.offender}</td>
            <td>${fine.desc}</td>
            <td>$${fine.amt.toFixed(2)}</td>
            <td>${fine.proposer}</td>
            <td>${fine.replies ? fine.replies.length : 0}</td>
        `;
        
        row.addEventListener('click', () => showFineDetail(index));
        finesTableBody.appendChild(row);
    });
}

// Show fine detail modal
function showFineDetail(fineIndex) {
    const fine = fines[fineIndex];
    if (!fine) return;
    
    fineDetailTitle.textContent = `Fine: ${fine.desc}`;
    fineDetailContent.innerHTML = `
        <div class="fine-details">
            <p><strong>Date:</strong> ${fine.date}</p>
            <p><strong>Offender:</strong> ${fine.offender}</p>
            <p><strong>Amount:</strong> $${fine.amt.toFixed(2)}</p>
            <p><strong>Proposed by:</strong> ${fine.proposer}</p>
            <p><strong>Description:</strong> ${fine.desc}</p>
        </div>
    `;
    
    renderReplies(fineIndex);
    fineDetailModal.style.display = 'flex';
    fineDetailModal.dataset.fineIndex = fineIndex;
}

// Render replies for a fine
function renderReplies(fineIndex) {
    const fine = fines[fineIndex];
    if (!fine.replies) fine.replies = [];
    
    repliesContainer.innerHTML = '';
    
    fine.replies.forEach(reply => {
        const replyDiv = document.createElement('div');
        replyDiv.classList.add('reply');
        replyDiv.innerHTML = `
            <div class="reply-header">
                <strong>${reply.author}</strong>
                <span class="reply-time">${new Date(reply.timestamp).toLocaleString()}</span>
            </div>
            <div class="reply-content">${reply.content}</div>
        `;
        repliesContainer.appendChild(replyDiv);
    });
}

// Add reply to a fine
function addReply(fineIndex, content) {
    const fine = fines[fineIndex];
    if (!fine.replies) fine.replies = [];
    
    const reply = {
        author: currentUser,
        content: content,
        timestamp: new Date().toISOString()
    };
    
    fine.replies.push(reply);
    saveFines();
    renderReplies(fineIndex);
    renderFinesTable(); // Update reply count in table
}

// Render totals page
function renderTotalsPage() {
    const totals = {};
    
    // Calculate totals for each person
    fines.forEach(fine => {
        const offender = fine.offender;
        if (!totals[offender]) {
            totals[offender] = 0;
        }
        totals[offender] += fine.amt;
    });
    
    // Sort by amount owed (highest first)
    const sortedTotals = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    
    let totalOwed = 0;
    let html = '<div class="totals-grid">';
    
    sortedTotals.forEach(([person, amount]) => {
        totalOwed += amount;
        html += `
            <div class="total-item">
                <div class="person-name">${person}</div>
                <div class="amount-owed">$${amount.toFixed(2)}</div>
            </div>
        `;
    });
    
    html += '</div>';
    html += `<div class="grand-total">Total Fines: $${totalOwed.toFixed(2)}</div>`;
    
    totalsContainer.innerHTML = html;
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
        const password = passwordInput.value;
        
        if (username && password === CORRECT_PASSWORD && ALL_USERS.includes(username)) {
            currentUser = username;
            currentRole = ADMIN_USERS.includes(username) ? "admin" : "viewer";
            localStorage.setItem('username', username);
            localStorage.setItem('password', password);
            showApp();
            usernameInput.value = '';
            passwordInput.value = '';
        } else {
            alert('Invalid username or password');
        }
    });
    
    // Logout button
    logoutBtn.addEventListener('click', function() {
        currentUser = null;
        currentRole = null;
        localStorage.removeItem('username');
        localStorage.removeItem('password');
        showLoginModal();
    });
    
    // Navigation buttons
    finesPageBtn.addEventListener('click', () => showPage('fines'));
    totalsPageBtn.addEventListener('click', () => showPage('totals'));
    
    // Close fine detail modal
    closeFineModal.addEventListener('click', function() {
        fineDetailModal.style.display = 'none';
    });
    
    // Close modal when clicking outside
    fineDetailModal.addEventListener('click', function(e) {
        if (e.target === fineDetailModal) {
            fineDetailModal.style.display = 'none';
        }
    });
    
    // Add fine form
    addFineForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (currentRole !== 'admin') return;
        
        const offender = document.getElementById('offenderInput').value.trim();
        const description = document.getElementById('descriptionInput').value.trim();
        const amount = parseFloat(document.getElementById('amountInput').value);
        
        if (offender && description && !isNaN(amount)) {
            const newFine = {
                id: Date.now(),
                offender: offender,
                desc: description,
                amt: amount,
                proposer: currentUser,
                date: new Date().toISOString().slice(0, 10),
                replies: []
            };
            
            fines.push(newFine);
            saveFines();
            renderFinesTable();
            
            // Clear form
            addFineForm.reset();
        }
    });
    
    // Reply form
    replyForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const fineIndex = parseInt(fineDetailModal.dataset.fineIndex);
        const content = replyInput.value.trim();
        
        if (content && !isNaN(fineIndex)) {
            addReply(fineIndex, content);
            replyInput.value = '';
        }
    });
}