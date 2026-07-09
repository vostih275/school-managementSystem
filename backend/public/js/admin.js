5// Admin User Management - Initialize DOM elements safely
function getElementSafely(id, context = document) {
    const element = context.getElementById ? context.getElementById(id) : null;
    if (!element) {
        console.warn(`Element with ID '${id}' not found`);
    }
    return element;
}

// Main UI Elements
const elements = {
    // Export button
    userExportBtn: getElementSafely('export-users-btn'),
    // Forms and Tables
    addUserForm: getElementSafely('add-user-form'),
    userAddMsg: getElementSafely('user-add-msg'),
    userTableBody: document.querySelector('#user-table tbody'),
    userSearch: getElementSafely('user-search'),
    usersBulkToolbar: getElementSafely('users-bulk-toolbar'),
    usersBulkDelete: getElementSafely('users-bulk-delete'),
    usersBulkExport: getElementSafely('users-bulk-export'),
    selectAllUsers: getElementSafely('select-all-users'),
    userRoleFilter: getElementSafely('user-role-filter'),
    userStatusFilter: getElementSafely('user-status-filter'),
    
    // Edit Form Elements
    editUserId: getElementSafely('edit-user-id'),
    editName: getElementSafely('edit-user-name'),
    editEmail: getElementSafely('edit-user-email'),
    editUsername: getElementSafely('edit-user-username'),
    editRole: getElementSafely('edit-user-role'),
    
    // Modals
    modals: {
        edit: {
            modal: getElementSafely('user-edit-modal'),
            closeBtn: getElementSafely('close-user-edit-modal'),
            form: getElementSafely('user-edit-form'),
            msg: getElementSafely('user-edit-msg')
        },
        confirm: {
            modal: getElementSafely('universal-confirm-modal'),
            closeBtn: getElementSafely('close-universal-confirm-modal'),
            title: getElementSafely('universal-confirm-title'),
            message: getElementSafely('universal-confirm-message'),
            yesBtn: getElementSafely('universal-confirm-yes'),
            noBtn: getElementSafely('universal-confirm-no')
        }
    }
};

// Initialize modals
function initializeModals() {
    // Close modal buttons
    if (elements.modals.edit.closeBtn && elements.modals.edit.modal) {
        elements.modals.edit.closeBtn.onclick = () => closeModal('edit');
    }
    
    if (elements.modals.confirm.closeBtn && elements.modals.confirm.modal) {
        elements.modals.confirm.closeBtn.onclick = () => closeModal('confirm');
    }
    
    // Close modals when clicking outside
    document.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            const modal = event.target;
            const modalType = Object.keys(elements.modals).find(
                key => elements.modals[key].modal === modal
            );
            if (modalType) {
                closeModal(modalType);
            }
        }
    });
}

// Open modal function
function openModal(modalType) {
    const modal = elements.modals[modalType]?.modal;
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

// Close modal function
function closeModal(modalType) {
    const modal = elements.modals[modalType]?.modal;
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// Initialize the page
function initializeAdminPage() {
    // Initialize modals
    initializeModals();
    
    // Initialize event listeners
    if (elements.userSearch) {
        elements.userSearch.addEventListener('input', debounce(loadUsersWithFilters, 300));
    }
    
    if (elements.userRoleFilter) {
        elements.userRoleFilter.addEventListener('change', loadUsersWithFilters);
    }
    
    if (elements.userStatusFilter) {
        elements.userStatusFilter.addEventListener('change', loadUsersWithFilters);
    }
    
    // Initialize bulk actions
    if (elements.usersBulkDelete) {
        elements.usersBulkDelete.addEventListener('click', handleBulkDelete);
    }
    
    if (elements.usersBulkExport) {
        elements.usersBulkExport.addEventListener('click', handleBulkExport);
    }
    
    // Load initial data
    loadUsersWithFilters();
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this, args = arguments;
        const later = function() {
            timeout = null;
            func.apply(context, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Load users with filters
async function loadUsersWithFilters() {
    try {
        // TODO: Implement user filtering logic
        console.log('Loading users with filters...');
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Handle bulk delete action
async function handleBulkDelete() {
    try {
        // TODO: Implement bulk delete logic
        console.log('Bulk delete clicked');
    } catch (error) {
        console.error('Error in bulk delete:', error);
    }
}

// Handle bulk export action
async function handleBulkExport() {
    try {
        // TODO: Implement bulk export logic
        console.log('Bulk export clicked');
    } catch (error) {
        console.error('Error in bulk export:', error);
    }
}

// Initialize the page when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAdminPage);
} else {
    initializeAdminPage();
}
