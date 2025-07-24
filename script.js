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
const addCreditForm = document.getElementById('addCreditForm');
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
        
        // Update the table header to include Actions column
        const tableHeader = document.querySelector('#finesTable thead tr');
        if (tableHeader && tableHeader.children.length === 6) {
            const actionsHeader = document.createElement('th');
            actionsHeader.textContent = 'Actions';
            tableHeader.appendChild(actionsHeader);
        }
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
        
        // Determine if this is a fine or credit
        const isCredit = fine.amt < 0;
        
        // Add appropriate class for styling
        if (isCredit) {
            row.classList.add('credit-row');
        } else {
            row.classList.add('fine-row');
        }
        
        // Create action buttons
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'fine-actions';
        
        // Remove button
        const removeButton = document.createElement('button');
        removeButton.textContent = 'Remove';
        removeButton.className = 'remove-fine-btn';
        removeButton.onclick = (e) => {
            e.stopPropagation(); // Prevent opening fine details
            removeFine(index);
        };
        
        // Edit button
        const editButton = document.createElement('button');
        editButton.textContent = 'Edit';
        editButton.className = 'edit-fine-btn';
        editButton.onclick = (e) => {
            e.stopPropagation(); // Prevent opening fine details
            editFine(index);
        };
        
        // Format amount based on whether it's a fine or credit
        const formattedAmount = isCredit 
            ? `-$${Math.abs(fine.amt).toFixed(2)}` 
            : `$${fine.amt.toFixed(2)}`;
            
        row.innerHTML = `
            <td>${fine.date}</td>
            <td>${fine.offender}</td>
            <td>${fine.desc}</td>
            <td class="${isCredit ? 'credit-amount' : 'fine-amount'}">${formattedAmount}</td>
            <td>${fine.proposer}</td>
            <td>${fine.replies ? fine.replies.length : 0}</td>
            <td></td>
        `;
        
        // Add action buttons to the last cell
        actionsContainer.appendChild(editButton);
        actionsContainer.appendChild(removeButton);
        row.lastElementChild.appendChild(actionsContainer);
        
        row.addEventListener('click', () => showFineDetail(index));
        finesTableBody.appendChild(row);
    });
}

// Show fine detail modal
function showFineDetail(fineIndex) {
    const fine = fines[fineIndex];
    if (!fine) return;
    
    // Determine if this is a fine or credit
    const isCredit = fine.amt < 0;
    const type = isCredit ? 'Credit' : 'Fine';
    const formattedAmount = isCredit 
        ? `-$${Math.abs(fine.amt).toFixed(2)}` 
        : `$${fine.amt.toFixed(2)}`;
    
    fineDetailTitle.textContent = `${type}: ${fine.desc}`;
    
    // Add edited info if applicable
    let editedInfo = '';
    if (fine.edited) {
        const editDate = new Date(fine.editTimestamp).toLocaleString();
        editedInfo = `<p class="edited-info"><em>Last edited on ${editDate}</em></p>`;
    }
    
    fineDetailContent.innerHTML = `
        <div class="fine-details ${isCredit ? 'credit-details' : ''}">
            <p><strong>Date:</strong> ${fine.date}</p>
            <p><strong>Offender:</strong> ${fine.offender}</p>
            <p><strong>Amount:</strong> <span class="${isCredit ? 'credit-amount' : 'fine-amount'}">${formattedAmount}</span></p>
            <p><strong>Proposed by:</strong> ${fine.proposer}</p>
            <p><strong>Description:</strong> ${fine.desc}</p>
            ${editedInfo}
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
    
    fine.replies.forEach((reply, replyIndex) => {
        // Initialize reactions array if it doesn't exist
        if (!reply.reactions) reply.reactions = {};
        
        const replyDiv = document.createElement('div');
        replyDiv.classList.add('reply');
        replyDiv.dataset.replyIndex = replyIndex;
        
        // Create edit and reactions buttons
        const editButton = document.createElement('button');
        editButton.classList.add('edit-btn');
        editButton.innerHTML = '✏️';
        editButton.title = 'Edit reply';
        editButton.onclick = (e) => {
            e.stopPropagation();
            startEditReply(fineIndex, replyIndex);
        };
        
        const reactionsButton = document.createElement('button');
        reactionsButton.classList.add('reactions-btn');
        reactionsButton.innerHTML = '😀';
        reactionsButton.title = 'Add reaction';
        reactionsButton.onclick = (e) => {
            e.stopPropagation();
            toggleReactionsPanel(e.target, fineIndex, replyIndex);
        };
        
        // Generate HTML for reactions display
        let reactionsHTML = '';
        if (Object.keys(reply.reactions).length > 0) {
            reactionsHTML = '<div class="reply-reactions">';
            for (const [emoji, users] of Object.entries(reply.reactions)) {
                if (users.length > 0) {
                    reactionsHTML += `<span class="reaction" title="${users.join(', ')}">${emoji} ${users.length}</span>`;
                }
            }
            reactionsHTML += '</div>';
        }
        
        replyDiv.innerHTML = `
            <div class="reply-header">
                <strong>${reply.author}</strong>
                <span class="reply-time">${new Date(reply.timestamp).toLocaleString()}</span>
                <div class="reply-actions"></div>
            </div>
            <div class="reply-content" data-reply-index="${replyIndex}">${reply.content}</div>
            ${reactionsHTML}
        `;
        
        // Add action buttons
        const actionsDiv = replyDiv.querySelector('.reply-actions');
        actionsDiv.appendChild(editButton);
        actionsDiv.appendChild(reactionsButton);
        
        repliesContainer.appendChild(replyDiv);
    });
}

// Start editing a reply
function startEditReply(fineIndex, replyIndex) {
    const fine = fines[fineIndex];
    if (!fine || !fine.replies || !fine.replies[replyIndex]) return;
    
    const reply = fine.replies[replyIndex];
    const contentElement = document.querySelector(`.reply-content[data-reply-index="${replyIndex}"]`);
    
    if (!contentElement) return;
    
    const originalContent = reply.content;
    
    // Replace content with editable textarea
    contentElement.innerHTML = `
        <textarea class="edit-reply-textarea">${originalContent}</textarea>
        <div class="edit-actions">
            <button class="save-edit-btn">Save</button>
            <button class="cancel-edit-btn">Cancel</button>
        </div>
    `;
    
    const textarea = contentElement.querySelector('.edit-reply-textarea');
    textarea.focus();
    
    // Save button
    const saveBtn = contentElement.querySelector('.save-edit-btn');
    saveBtn.addEventListener('click', () => {
        const newContent = textarea.value.trim();
        if (newContent) {
            fine.replies[replyIndex].content = newContent;
            fine.replies[replyIndex].edited = true;
            fine.replies[replyIndex].editTimestamp = new Date().toISOString();
            saveFines();
            renderReplies(fineIndex);
        }
    });
    
    // Cancel button
    const cancelBtn = contentElement.querySelector('.cancel-edit-btn');
    cancelBtn.addEventListener('click', () => {
        renderReplies(fineIndex);
    });
}

// Toggle reactions panel
function toggleReactionsPanel(button, fineIndex, replyIndex) {
    // Remove any existing panel first
    const existingPanel = document.querySelector('.reactions-panel');
    if (existingPanel) {
        existingPanel.remove();
    }
    
    // Create reactions panel
    const reactionsPanel = document.createElement('div');
    reactionsPanel.className = 'reactions-panel';
    
    const emojis = ['👍', '👎', '😀', '😍', '🎉', '😮', '😢', '❤️'];
    
    emojis.forEach(emoji => {
        const emojiBtn = document.createElement('button');
        emojiBtn.className = 'emoji-btn';
        emojiBtn.textContent = emoji;
        emojiBtn.addEventListener('click', () => {
            addReaction(fineIndex, replyIndex, emoji);
            reactionsPanel.remove();
        });
        reactionsPanel.appendChild(emojiBtn);
    });
    
    // Position panel relative to button
    const rect = button.getBoundingClientRect();
    reactionsPanel.style.position = 'absolute';
    reactionsPanel.style.top = `${rect.bottom + window.scrollY}px`;
    reactionsPanel.style.left = `${rect.left + window.scrollX}px`;
    
    // Add to document
    document.body.appendChild(reactionsPanel);
    
    // Close panel when clicking outside
    document.addEventListener('click', function closePanel(e) {
        if (!reactionsPanel.contains(e.target) && e.target !== button) {
            reactionsPanel.remove();
            document.removeEventListener('click', closePanel);
        }
    });
}

// Add reaction to a reply
function addReaction(fineIndex, replyIndex, emoji) {
    const fine = fines[fineIndex];
    if (!fine || !fine.replies || !fine.replies[replyIndex]) return;
    
    const reply = fine.replies[replyIndex];
    
    // Initialize reactions if needed
    if (!reply.reactions) reply.reactions = {};
    if (!reply.reactions[emoji]) reply.reactions[emoji] = [];
    
    // Check if user already reacted with this emoji
    const userIndex = reply.reactions[emoji].indexOf(currentUser);
    
    if (userIndex === -1) {
        // Add reaction
        reply.reactions[emoji].push(currentUser);
    } else {
        // Remove reaction
        reply.reactions[emoji].splice(userIndex, 1);
        
        // Clean up empty arrays
        if (reply.reactions[emoji].length === 0) {
            delete reply.reactions[emoji];
        }
    }
    
    saveFines();
    renderReplies(fineIndex);
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

// Edit fine/credit
function editFine(index) {
    const fine = fines[index];
    if (!fine) return;
    
    // Create edit modal
    const editModal = document.createElement('div');
    editModal.className = 'modal';
    editModal.id = 'editFineModal';
    
    // Determine if it's a fine or credit
    const isCredit = fine.amt < 0;
    const type = isCredit ? 'Credit' : 'Fine';
    
    // Set up modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    
    modalContent.innerHTML = `
        <div class="modal-header">
            <h3>Edit ${type}</h3>
            <button id="closeEditModal">&times;</button>
        </div>
        <form id="editFineForm">
            <div class="form-group">
                <label for="editOffenderInput">Offender:</label>
                <select id="editOffenderInput" required>
                    <option value="">Select an offender</option>
                    <option value="Koong" ${fine.offender === 'Koong' ? 'selected' : ''}>Koong</option>
                    <option value="Noah" ${fine.offender === 'Noah' ? 'selected' : ''}>Noah</option>
                    <option value="Zander" ${fine.offender === 'Zander' ? 'selected' : ''}>Zander</option>
                    <option value="James" ${fine.offender === 'James' ? 'selected' : ''}>James</option>
                    <option value="Toby" ${fine.offender === 'Toby' ? 'selected' : ''}>Toby</option>
                    <option value="Lukas" ${fine.offender === 'Lukas' ? 'selected' : ''}>Lukas</option>
                    <option value="Elliot" ${fine.offender === 'Elliot' ? 'selected' : ''}>Elliot</option>
                    <option value="Cole" ${fine.offender === 'Cole' ? 'selected' : ''}>Cole</option>
                    <option value="Theo" ${fine.offender === 'Theo' ? 'selected' : ''}>Theo</option>
                    <option value="Robert" ${fine.offender === 'Robert' ? 'selected' : ''}>Robert</option>
                </select>
            </div>
            <div class="form-group">
                <label for="editDescriptionInput">Description:</label>
                <input type="text" id="editDescriptionInput" value="${fine.desc}" required>
            </div>
            <div class="form-group">
                <label for="editAmountInput">Amount ($):</label>
                <input type="number" id="editAmountInput" value="${Math.abs(fine.amt)}" min="0" step="0.01" required>
            </div>
            <button type="submit" class="${isCredit ? 'credit-btn' : 'fine-btn'}">Save Changes</button>
        </form>
    `;
    
    editModal.appendChild(modalContent);
    document.body.appendChild(editModal);
    
    // Close button functionality
    const closeEditModal = document.getElementById('closeEditModal');
    closeEditModal.addEventListener('click', () => {
        editModal.remove();
    });
    
    // Click outside to close
    editModal.addEventListener('click', function(e) {
        if (e.target === editModal) {
            editModal.remove();
        }
    });
    
    // Form submission
    const editFineForm = document.getElementById('editFineForm');
    editFineForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const offender = document.getElementById('editOffenderInput').value;
        const description = document.getElementById('editDescriptionInput').value.trim();
        const amount = parseFloat(document.getElementById('editAmountInput').value);
        
        if (offender && description && !isNaN(amount)) {
            // Update the fine object
            fine.offender = offender;
            fine.desc = description;
            fine.amt = isCredit ? -Math.abs(amount) : Math.abs(amount); // Maintain negative value for credits
            
            // Add edit timestamp
            fine.edited = true;
            fine.editTimestamp = new Date().toISOString();
            
            // Save and update UI
            saveFines();
            renderFinesTable();
            
            // Close the modal
            editModal.remove();
            
            // Show confirmation message
            const message = document.createElement('div');
            message.className = 'flash-message';
            message.textContent = `${type} updated successfully`;
            document.querySelector('.container').insertBefore(message, document.querySelector('h2'));
            
            // Auto-remove message after 3 seconds
            setTimeout(() => {
                message.remove();
            }, 3000);
        }
    });
}

// Remove a fine
function removeFine(index) {
    if (confirm('Are you sure you want to remove this fine?')) {
        fines.splice(index, 1);
        saveFines();
        renderFinesTable();
        
        // Show confirmation message
        const message = document.createElement('div');
        message.className = 'flash-message';
        message.textContent = 'Fine removed successfully';
        document.querySelector('.container').insertBefore(message, document.querySelector('h2'));
        
        // Auto-remove message after 3 seconds
        setTimeout(() => {
            message.remove();
        }, 3000);
    }
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
    
    // Add credit form
    addCreditForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (currentRole !== 'admin') return;
        
        const offender = document.getElementById('creditOffenderInput').value.trim();
        const description = document.getElementById('creditDescriptionInput').value.trim();
        const amount = parseFloat(document.getElementById('creditAmountInput').value);
        
        if (offender && description && !isNaN(amount)) {
            const newCredit = {
                id: Date.now(),
                offender: offender,
                desc: description,
                amt: -amount, // Store as negative value to represent a credit
                proposer: currentUser,
                date: new Date().toISOString().slice(0, 10),
                replies: []
            };
            
            fines.push(newCredit); // Add to the same fines array
            saveFines();
            renderFinesTable();
            
            // Clear form
            addCreditForm.reset();
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