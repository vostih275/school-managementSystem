// Library Management Logic
// API configuration is imported from config.js (available as window.API_CONFIG)

/**
 * API fetch wrapper that handles authentication and error handling
 * @param {string} url - The API endpoint URL
 * @param {Object} options - Fetch options
 * @returns {Promise<any>} - The parsed JSON response
 */
window.apiFetch = async function apiFetch(url, options = {}) {
    const token = localStorage.getItem('token');
    const defaultHeaders = {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };

    // Merge headers
    const headers = {
        ...defaultHeaders,
        ...(options.headers || {})
    };

    try {
        const response = await fetch(`${window.API_CONFIG?.BASE_URL || ''}${url}`, {
            ...options,
            headers
        });

        if (!response.ok) {
            if (response.status === 401) {
                // Handle unauthorized
                window.location.href = '/login.html';
                return Promise.reject(new Error('Unauthorized'));
            }
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'API request failed');
        }

        // Handle empty responses
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// DOM Elements
const libraryForm = document.getElementById('library-form');
const libraryList = document.getElementById('library-list');
const librarySearch = document.getElementById('library-search');
const libraryGenreFilter = document.getElementById('library-genre-filter');
const libraryAuthorFilter = document.getElementById('library-author-filter');
const libraryClassFilter = document.getElementById('library-class-filter');
const libraryBulkToolbar = document.getElementById('library-bulk-toolbar');
const libraryBulkDelete = document.getElementById('library-bulk-delete');
const libraryBulkExport = document.getElementById('library-bulk-export');
const selectAllLibrary = document.getElementById('select-all-library');
const libraryTableBody = document.getElementById('library-table-body');
const issuedBooksSearch = document.getElementById('issued-books-search');
const issuedBooksList = document.getElementById('issued-books-list');

// Tab functionality
window.showLibraryTab = function(tabId) {
    // Hide all tab contents
    document.querySelectorAll('.library-tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Deactivate all tab buttons
    document.querySelectorAll('.library-tabs .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show the selected tab content
    const selectedTab = document.getElementById(tabId);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Activate the clicked tab button
    const activeBtn = document.querySelector(`.library-tabs .tab-btn[onclick*="${tabId}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    // Load data for the selected tab
    if (tabId === 'issued-books') {
        loadIssuedBooks();
    }
}

let selectedBookIds = new Set();

// --- Advanced Filters for Library ---
function getLibraryFilters() {
    return {
        search: librarySearch.value.trim(),
        genre: libraryGenreFilter.value,
        author: libraryAuthorFilter.value.trim(),
        className: libraryClassFilter ? libraryClassFilter.value : ''
    };
}

function buildLibraryQueryString(filters) {
    const params = [];
    if (filters.search) params.push(`search=${encodeURIComponent(filters.search)}`);
    if (filters.genre) params.push(`genre=${encodeURIComponent(filters.genre)}`);
    if (filters.author) params.push(`author=${encodeURIComponent(filters.author)}`);
    if (filters.className) params.push(`className=${encodeURIComponent(filters.className)}`);
    return params.length ? '?' + params.join('&') : '';
}

/**
 * Load books from the server with optional filters
 */
async function loadLibraryWithFilters() {
    try {
        const filters = getLibraryFilters();
        const queryString = buildLibraryQueryString(filters);
        
        // Show loading state
        if (libraryTableBody) {
            libraryTableBody.innerHTML = '<tr><td colspan="5" class="text-center">Loading books...</td></tr>';
        }
        
        // Make API request using the apiFetch utility
        const books = await apiFetch(`/library${queryString}`, {
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        
        console.log('Received books:', books);
        
        // Update the UI with the received books
        if (libraryTableBody) {
            libraryTableBody.innerHTML = '';
            if (Array.isArray(books) && books.length > 0) {
                books.forEach(book => {
                    libraryTableBody.insertAdjacentHTML('beforeend', renderBookRow(book));
                });
            } else {
                libraryTableBody.innerHTML = '<tr><td colspan="5" class="text-center">No books found matching your criteria.</td></tr>';
            }
        }
        // Add event listeners for checkboxes
        if (libraryTableBody) {
            libraryTableBody.addEventListener('click', async (e) => {
                const btn = e.target;
                const bookId = btn.getAttribute('data-id');
                if (!bookId) return;
                const token = localStorage.getItem('token');
                // Edit Book (universal modal)
                if (btn.classList.contains('edit-book-btn')) {
                    const tr = btn.closest('tr');
                    const currentTitle = tr.querySelector('td:nth-child(2)').textContent;
                    const currentAuthor = tr.querySelector('td:nth-child(3)').textContent;
                    const currentDesc = tr.querySelector('td:nth-child(4)').textContent;
                    const universalEditModal = document.getElementById('universal-edit-modal');
                    const universalEditForm = document.getElementById('universal-edit-form');
                    const universalEditMsg = document.getElementById('universal-edit-msg');
                    if (universalEditForm) {
                        universalEditForm.innerHTML = `
                            <input type="hidden" name="bookId" value="${bookId}" />
                            <div class='form-group'><label>Title:</label><input type='text' name='title' value='${currentTitle}' required /></div>
                            <div class='form-group'><label>Author:</label><input type='text' name='author' value='${currentAuthor}' required /></div>
                            <div class='form-group'><label>Year:</label><input type='number' name='year' min='1000' max='2099' value='${book.year || new Date().getFullYear()}' /></div>
                            <div class='form-group'><label>Copies:</label><input type='number' name='copies' min='1' value='${book.copies || 1}' required /></div>
                            <div class='form-group'>
                                <label>Genre:</label>
                                <select name='genre' required>
                                    <option value='Fiction' ${book.genre === 'Fiction' ? 'selected' : ''}>Fiction</option>
                                    <option value='Non-Fiction' ${book.genre === 'Non-Fiction' ? 'selected' : ''}>Non-Fiction</option>
                                    <option value='Science' ${book.genre === 'Science' ? 'selected' : ''}>Science</option>
                                    <option value='History' ${book.genre === 'History' ? 'selected' : ''}>History</option>
                                    <option value='Biography' ${book.genre === 'Biography' ? 'selected' : ''}>Biography</option>
                                    <option value='Children' ${book.genre === 'Children' ? 'selected' : ''}>Children</option>
                                </select>
                            </div>
                            <div class='form-group'>
                                <label>Status:</label>
                                <select name='status'>
                                    <option value='available' ${book.status === 'available' ? 'selected' : ''}>Available</option>
                                    <option value='checked-out' ${book.status === 'checked-out' ? 'selected' : ''}>Checked Out</option>
                                    <option value='lost' ${book.status === 'lost' ? 'selected' : ''}>Lost</option>
                                </select>
                            </div>
                            <button type='submit'>Save Changes</button>
                        `;
                        if (universalEditMsg) universalEditMsg.style.display = 'none';
                        if (universalEditModal) {
                            universalEditModal.style.display = 'block';
                            universalEditForm.onsubmit = async (ev) => {
                                ev.preventDefault();
                                if (universalEditMsg) universalEditMsg.style.display = 'none';
                                const formData = new FormData(universalEditForm);
                                const title = formData.get('title');
                                const author = formData.get('author');
                                const year = formData.get('year');
                                const genre = formData.get('genre');
                                const status = formData.get('status') || 'available';
                                const copies = parseInt(formData.get('copies')) || 1;
                                try {
                                    const res = await fetch(`${window.API_CONFIG?.BASE_URL || 'http://localhost:5000'}/api/library/${bookId}`, {
                                        method: 'PUT',
                                        headers: {
                                            'Content-Type': 'application/json',
                                            'Authorization': `Bearer ${token}`,
                                        },
                                        body: JSON.stringify({ 
                                            title, 
                                            author, 
                                            year: year ? parseInt(year) : new Date().getFullYear(),
                                            genre,
                                            status,
                                            copies,
                                            available: status === 'available' ? copies : 0
                                        })
                                    });
                                    if (res.ok) {
                                        if (universalEditMsg) {
                                            universalEditMsg.textContent = 'Book updated successfully!';
                                            universalEditMsg.style.color = 'green';
                                            universalEditMsg.style.display = 'block';
                                        }
                                        setTimeout(() => {
                                            if (universalEditModal) universalEditModal.style.display = 'none';
                                            loadLibraryWithFilters();
                                        }, 1000);
                                    } else {
                                        if (universalEditMsg) {
                                            universalEditMsg.textContent = 'Failed to update book.';
                                            universalEditMsg.style.color = 'red';
                                            universalEditMsg.style.display = 'block';
                                        }
                                    }
                                } catch {
                                    if (universalEditMsg) {
                                        universalEditMsg.textContent = 'Network error.';
                                        universalEditMsg.style.color = 'red';
                                        universalEditMsg.style.display = 'block';
                                    }
                                }
                            };
                        }
                    }
                }
                // Issue Book
                else if (btn.classList.contains('issue-book-btn')) {
                    console.log('Issue button clicked'); // Debug log
                    const bookId = btn.getAttribute('data-id');
                    const genre = btn.getAttribute('data-genre');
                    const bookTitle = btn.closest('tr').querySelector('td:nth-child(2)').textContent;
                    const universalModal = document.getElementById('universal-edit-modal');
                    const universalForm = document.getElementById('universal-edit-form');
                    const universalMsg = document.getElementById('universal-edit-msg');
                    const universalTitle = document.getElementById('universal-edit-title');
                    
                    if (universalForm && universalModal) {
                        // Clear any previous messages and reset form
                        if (universalMsg) {
                            universalMsg.textContent = '';
                            universalMsg.style.display = 'none';
                        }
                        
                        // Set the modal title
                        if (universalTitle) {
                            universalTitle.textContent = `Issue Book: ${bookTitle}`;
                        }
                        
                        // Set up the form
                        const today = new Date().toISOString().split('T')[0];
                        const defaultDueDate = new Date();
                        defaultDueDate.setDate(defaultDueDate.getDate() + 14); // 2 weeks from now
                        const defaultDueDateStr = defaultDueDate.toISOString().split('T')[0];
                        
                        universalForm.innerHTML = `
                            <input type="hidden" name="bookId" value="${bookId}">
                            <input type="hidden" name="genre" value="${genre}">
                            <div class="mb-4">
                                <label class="block text-gray-700 text-sm font-bold mb-2" for="classSelect">
                                    Class
                                </label>
                                <select class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" 
                                        id="classSelect" name="class" required>
                                    <option value="">Select a class</option>
                                    <optgroup label="Pre-Primary">
                                        <option value="pp1">Pre-Primary 1 (PP1) - Age 4-5</option>
                                        <option value="pp2">Pre-Primary 2 (PP2) - Age 5-6</option>
                                    </optgroup>
                                    <optgroup label="Primary Education">
                                        <option value="grade1">Grade 1 - Age 6-7</option>
                                        <option value="grade2">Grade 2 - Age 7-8</option>
                                        <option value="grade3">Grade 3 - Age 8-9</option>
                                        <option value="grade4">Grade 4 - Age 9-10</option>
                                        <option value="grade5">Grade 5 - Age 10-11</option>
                                        <option value="grade6">Grade 6 - Age 11-12</option>
                                        <option value="grade7">Grade 7 - Age 12-13</option>
                                        <option value="grade8">Grade 8 - Age 13-14 (KCPE)</option>
                                    </optgroup>
                                    <optgroup label="Secondary Education">
                                        <option value="form1">Form 1 - Age 14-15</option>
                                        <option value="form2">Form 2 - Age 15-16</option>
                                        <option value="form3">Form 3 - Age 16-17</option>
                                        <option value="form4">Form 4 - Age 17-18 (KCSE)</option>
                                    </optgroup>
                                    <optgroup label="Tertiary/College">
                                        <option value="college1">Year 1 - Certificate/Diploma</option>
                                        <option value="college2">Year 2 - Certificate/Diploma</option>
                                        <option value="college3">Year 3 - Diploma/Degree</option>
                                        <option value="college4">Year 4 - Degree</option>
                                    </optgroup>
                                </select>
                            </div>
                            <div class="mb-4">
                                <label class="block text-gray-700 text-sm font-bold mb-2" for="studentSelect">
                                    Student
                                </label>
                                <select class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" 
                                        id="studentSelect" name="studentId" required disabled>
                                    <option value="">Select a class first</option>
                                </select>
                            </div>
                            <div class="mb-6">
                                <label class="block text-gray-700 text-sm font-bold mb-2" for="dueDate">
                                    Due Date
                                </label>
                                <input class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" 
                                       id="dueDate" name="dueDate" type="date" required>
                            </div>
                            <div class="flex items-center justify-end gap-3">
                                <button type="button" class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline cancel-btn">
                                    Cancel
                                </button>
                                <button type="submit" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline submit-btn">
                                    <i class="fas fa-book-reader mr-2"></i>Issue Book
                                </button>
                            </div>
                        `;
                        
                        console.log('Showing issue modal for book ID:', bookId);
                        
                        // Ensure the modal is in the DOM and visible
                        if (!document.body.contains(universalModal)) {
                            console.error('Modal element not found in DOM');
                            return;
                        }
                        
                        // Show the modal
                        showModal(universalModal);
                        console.log('Modal display style:', window.getComputedStyle(universalModal).display);
                        
                        // Set focus after a short delay to ensure the modal is visible
                        setTimeout(() => {
                            const firstInput = universalForm.querySelector('input:not([type="hidden"])');
                            if (firstInput) {
                                firstInput.removeAttribute('autofocus'); // Remove autofocus attribute
                                firstInput.focus({ preventScroll: true });
                            }
                        }, 50);
                        
                        // Handle form submission
                        // Remove any existing submit handlers to prevent duplicates
                        const newForm = universalForm.cloneNode(true);
                        universalForm.parentNode.replaceChild(newForm, universalForm);
                        
                        newForm.onsubmit = async (e) => {
                            e.preventDefault();
                            
                            const formMsg = document.getElementById('issue-form-msg');
                            const submitBtn = newForm.querySelector('.submit-btn');
                            const cancelBtn = newForm.querySelector('.cancel-btn');
                            
                            // Prevent multiple submissions
                            if (submitBtn && submitBtn.hasAttribute('data-submitting')) {
                                return;
                            }
                            
                            // Disable buttons and show loading state
                            if (submitBtn) {
                                submitBtn.disabled = true;
                                submitBtn.setAttribute('data-submitting', 'true');
                                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Issuing...';
                            }
                            if (cancelBtn) cancelBtn.disabled = true;
                            
                            // Clear previous messages
                            if (formMsg) {
                                formMsg.textContent = '';
                                formMsg.style.display = 'none';
                            }
                            
                            try {
                                const formData = new FormData(newForm);
                                const bookId = formData.get('bookId');
                                const classSelect = newForm.querySelector('#classSelect');
                                const studentSelect = newForm.querySelector('#studentSelect');
                                const selectedStudent = studentSelect.options[studentSelect.selectedIndex];
                                const borrowerName = selectedStudent.textContent;
                                const borrowerId = formData.get('studentId');
                                const borrowerEmail = selectedStudent.getAttribute('data-email') || '';
                                const dueDate = formData.get('dueDate');

                                if (!borrowerId || !dueDate) {
                                    throw new Error('Please select a student and due date');
                                }

                                const token = localStorage.getItem('token');
                                if (!token) {
                                    throw new Error('Authentication required. Please log in again.');
                                }
                                
                                // Get the genre from the book data attribute
                                const issueButton = document.querySelector(`.issue-book-btn[data-id="${bookId}"]`);
                                const genre = issueButton ? (issueButton.getAttribute('data-genre') || 'General') : 'General';
                                
                                // Debug logging removed from production

                                const response = await fetch(`${API_CONFIG.BASE_URL}/api/library/${bookId}/issue`, {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${token}`,
                                    },
                                    body: JSON.stringify({
                                        borrowerName,
                                        borrowerId,
                                        borrowerEmail,
                                        dueDate,
                                        className: classSelect.value,
                                        genre // Add genre to the request body
                                    })
                                });
                                
                                const result = await response.json().catch(() => ({}));
                                
                                if (!response.ok) {
                                    const errorData = await response.json().catch(() => ({}));
                                    throw new Error(errorData.error || 'Failed to issue book. Please try again.');
                                }

                                // Show success message
                                if (formMsg) {
                                    formMsg.textContent = 'Book issued successfully!';
                                    formMsg.className = 'mt-3 text-sm text-green-600';
                                    formMsg.style.display = 'block';
                                }
                                
                                // Update the UI after a short delay
                                setTimeout(() => {
                                    hideModal(universalModal);
                                    loadLibraryWithFilters();
                                    
                                    // Reset form state
                                    if (submitBtn) {
                                        submitBtn.disabled = false;
                                        submitBtn.removeAttribute('data-submitting');
                                        submitBtn.innerHTML = '<i class="fas fa-book-reader mr-2"></i>Issue Book';
                                    }
                                    if (cancelBtn) cancelBtn.disabled = false;
                                }, 1500);
                            } catch (error) {
                                console.error('Error issuing book:', error);
                                if (formMsg) {
                                    formMsg.textContent = error.message || 'An error occurred while processing your request.';
                                    formMsg.className = 'mt-3 text-sm text-red-600';
                                    formMsg.style.display = 'block';
                                    
                                    // Scroll to the error message
                                    formMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }
                                
                                // Re-enable buttons
                                if (submitBtn) {
                                    submitBtn.disabled = false;
                                    submitBtn.removeAttribute('data-submitting');
                                    submitBtn.innerHTML = '<i class="fas fa-book-reader mr-2"></i>Issue Book';
                                }
                                if (cancelBtn) cancelBtn.disabled = false;
                            }
                        };
                        
                        // Add cancel button handler
                        const cancelBtn = universalForm.querySelector('.cancel-btn');
                        if (cancelBtn) {
                            cancelBtn.onclick = (e) => {
                                e.preventDefault();
                                hideModal(universalModal);
                            };
                        }
                    }
                }
                // Delete Book (universal confirm modal)
                else if (btn.classList.contains('delete-book-btn')) {
                    // Disable the delete button to prevent multiple clicks
                    btn.disabled = true;
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
                    
                    const confirmDelete = confirm('Are you sure you want to delete this book? This action cannot be undone.');
                    
                    if (!confirmDelete) {
                        btn.disabled = false;
                        btn.innerHTML = '<i class="fas fa-trash"></i>';
                        return;
                    }
                    
                    (async () => {
                        try {
                            const token = localStorage.getItem('token');
                            if (!token) {
                                throw new Error('Authentication required. Please log in again.');
                            }
                            
                            const response = await fetch(`${API_CONFIG.BASE_URL}/api/library/${bookId}`, {
                                method: 'DELETE',
                                headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'Content-Type': 'application/json'
                                }
                            });
                            
                            // Handle the response
                            if (response.status === 404) {
                                throw new Error('Book not found or already deleted');
                            }
                            
                            const result = await response.json().catch(() => ({}));
                            
                            if (!response.ok) {
                                throw new Error(result.error || 'Failed to delete book');
                            }
                            
                            showNotification('Book deleted successfully', 'success');
                            
                            // Remove the deleted book from the UI immediately
                            const rowToRemove = btn.closest('tr');
                            if (rowToRemove) {
                                rowToRemove.style.opacity = '0.5';
                                setTimeout(() => rowToRemove.remove(), 300);
                            }
                            
                            // Refresh the book list after a short delay
                            setTimeout(() => {
                                loadLibraryWithFilters().catch(error => {
                                    console.error('Error refreshing book list:', error);
                                    showNotification('Error refreshing book list', 'error');
                                });
                            }, 500);
                            
                        } catch (error) {
                            console.error('Error deleting book:', error);
                            showNotification(`Error: ${error.message}`, 'error');
                        } finally {
                            // Re-enable the delete button
                            const deleteButtons = document.querySelectorAll('.delete-book-btn');
                            deleteButtons.forEach(btn => {
                                btn.disabled = false;
                                btn.innerHTML = '<i class="fas fa-trash"></i>';
                            });
                        }
                    })();
                }
            });
        }
        if (selectAllLibrary) {
            selectAllLibrary.checked = false;
            selectAllLibrary.onchange = async function() {
                if (this.checked) {
                    document.querySelectorAll('.library-select-checkbox').forEach(cb => {
                        cb.checked = true;
                        selectedBookIds.add(cb.getAttribute('data-id'));
                    });
                } else {
                    document.querySelectorAll('.library-select-checkbox').forEach(cb => {
                        cb.checked = false;
                        selectedBookIds.delete(cb.getAttribute('data-id'));
                    });
                }
                updateLibraryBulkToolbarState();
            };
        }
        updateLibraryBulkToolbarState();
    } catch (err) {
        libraryTableBody.innerHTML = '<tr><td colspan="5">Error loading library.</td></tr>';
    }
}

function renderBookRow(book) {
    const available = book.available !== undefined ? book.available : (book.copies || 1);
    const copies = book.copies || 1;
    const availableClass = available > 0 ? 'status-available' : 'status-checked-out';
    
    return `<tr>
        <td><input type="checkbox" class="library-select-checkbox" data-id="${book._id}"></td>
        <td>${book.title}</td>
        <td>${book.author}</td>
        <td>${book.year || 'N/A'}</td>
        <td>${book.genre || 'N/A'}</td>
        <td class="status-${book.status || 'available'}">${book.status || 'available'}</td>
        <td>${copies}</td>
        <td class="${availableClass}">${available}</td>
        <td class="actions-cell">
            <button class="edit-book-btn" data-id="${book._id}">Edit</button>
            <button class="issue-book-btn" 
                    data-id="${book._id}" 
                    data-genre="${book.genre || 'General'}" 
                    ${book.available < 1 ? 'disabled' : ''}>
                Issue
            </button>
            <button class="delete-book-btn" data-id="${book._id}">Delete</button>
        </td>
    </tr>`;
}

function updateLibraryBulkToolbarState() {
    const hasSelection = selectedBookIds.size > 0;
    if (libraryBulkToolbar) libraryBulkToolbar.style.display = hasSelection ? 'block' : 'none';
    if (libraryBulkDelete) libraryBulkDelete.disabled = !hasSelection;
    if (libraryBulkExport) libraryBulkExport.disabled = !hasSelection;
}

function clearLibrarySelections() {
    selectedBookIds.clear();
    document.querySelectorAll('.library-select-checkbox').forEach(cb => cb.checked = false);
    if (selectAllLibrary) selectAllLibrary.checked = false;
    updateLibraryBulkToolbarState();
}

// Function to show modal with animation
function showModal(modal) {
    console.log('showModal called with:', modal);
    if (!modal) {
        console.error('No modal element provided');
        return;
    }
    
    // Show the modal
    console.log('Showing modal');
    modal.classList.add('show');
    document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open
    
    // Force reflow
    void modal.offsetWidth;
    
    // Start fade in
    setTimeout(() => {
        modal.style.opacity = '1';
        modal.style.visibility = 'visible';
    }, 10);
    
    // Add ESC key listener
    const handleEsc = (e) => {
        if (e.key === 'Escape') {
            hideModal(modal);
        }
    };
    
    document.addEventListener('keydown', handleEsc);
    modal._escHandler = handleEsc;
    
    // Add click outside handler
    const handleOutsideClick = (e) => {
        if (e.target === modal) {
            hideModal(modal);
        }
    };
    
    modal.addEventListener('click', handleOutsideClick);
    modal._outsideClickHandler = handleOutsideClick;
}

// Function to hide modal with animation
function hideModal(modal) {
    if (!modal) return;
    
    // Start fade out
    modal.classList.remove('show');
    document.body.style.overflow = ''; // Re-enable scrolling
    
    // Reset form and clear any messages
    const form = modal.querySelector('form');
    if (form) form.reset();
    
    const msg = modal.querySelector('#universal-edit-msg');
    if (msg) {
        msg.textContent = '';
        msg.style.display = 'none';
    }
}

// Close modal when clicking outside content
document.addEventListener('click', (e) => {
    const modal = document.getElementById('universal-edit-modal');
    if (e.target === modal) {
        hideModal(modal);
    }
});

// Close modal with escape key

/**
 * Fetch students by class using the apiFetch utility
 * @param {string} className - The class name in format 'gradeX' or 'Grade X'
 * @returns {Promise<Array>} Array of student objects
 */
async function fetchStudentsByClass(className) {
    try {
        // Convert class format from 'grade8' to 'Grade 8' for the API
        const formattedClassName = className.replace(/^grade(\d+)$/i, 'Grade $1');
        
        // Make API request using apiFetch
        const response = await apiFetch(`/students/class/${encodeURIComponent(formattedClassName)}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        // Extract students array from the response data
        const students = Array.isArray(response) ? response : (response?.data || []);
        
        if (!Array.isArray(students)) {
            throw new Error('Invalid students data format received from server');
        }
        
        console.debug(`Fetched ${students.length} students for class ${formattedClassName}`);
        return students;
        
    } catch (error) {
        console.error('Error in fetchStudentsByClass:', error);
        showNotification(
            error.message || 'Error fetching students. Please try again.',
            'error'
        );
        return [];
    }
}

/**
 * Populate student dropdown with students from a specific class
 * @param {string} className - The class name to fetch students for
 * @param {HTMLSelectElement} studentSelect - The select element to populate
 * @returns {Promise<Array>} Array of student objects
 */
async function populateStudentDropdown(className, studentSelect) {
    // Validate inputs
    if (!studentSelect || !(studentSelect instanceof HTMLSelectElement)) {
        console.error('Invalid student select element');
        return [];
    }

    // Store the current value to restore after refresh
    const currentValue = studentSelect.value;
    
    try {
        console.debug(`Fetching students for class: ${className}`);
        
        // Show loading state
        studentSelect.disabled = true;
        studentSelect.innerHTML = `
            <option value="" disabled selected>
                <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Loading students...
            </option>`;
        
        // Fetch students for the selected class
        const students = await fetchStudentsByClass(className);
        console.debug(`Found ${students.length} students for class ${className}`);
        
        // Clear existing options
        studentSelect.innerHTML = '';
        
        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = students.length > 0 ? 'Select a student' : 'No students found';
        defaultOption.disabled = true;
        defaultOption.selected = true;
        studentSelect.appendChild(defaultOption);
        
        // Add student options if available
        if (students.length > 0) {
            students.forEach(student => {
                if (!student || !student._id) {
                    console.warn('Invalid student data:', student);
                    return;
                }
                
                const option = document.createElement('option');
                option.value = student._id;
                option.textContent = student.name?.trim() || `Student ${student._id.substring(0, 6)}`;
                
                // Add data attributes for additional info
                if (student.email) option.dataset.email = student.email;
                if (student.admissionNumber) option.dataset.admissionNumber = student.admissionNumber;
                
                studentSelect.appendChild(option);
            });
            
            // Try to restore the previously selected value if it still exists
            if (currentValue && studentSelect.querySelector(`option[value="${currentValue}"]`)) {
                studentSelect.value = currentValue;
            }
        }
        
        // Dispatch change event to notify other components
        studentSelect.dispatchEvent(new Event('change', { bubbles: true }));
        
        return students;
        
    } catch (error) {
        console.error('Error populating student dropdown:', error);
        
        // Show error state
        studentSelect.innerHTML = `
            <option value="" disabled selected>
                <i class="bi bi-exclamation-triangle me-2"></i>
                Error loading students
            </option>`;
            
        // Show error notification
        showNotification(
            'Failed to load students. ' + (error.message || 'Please try again.'),
            'error'
        );
        
        return [];
    } finally {
        // Always re-enable the select, even if there was an error
        studentSelect.disabled = false;
    }
}

/**
 * Initialize library functionality when DOM is loaded
 */
function initLibrary() {
    console.debug('Initializing library functionality...');
    
    try {
        // Initialize modal functionality
        initModal();
        
        // Initialize issued books search functionality
        initIssuedBooksSearch();
        
        // Load initial data
        loadLibraryWithFilters().catch(error => {
            console.error('Error loading library data:', error);
            showNotification('Failed to load library data. Please refresh the page.', 'error');
        });
        
        // Add event delegation for class selection change (for student selection)
        document.addEventListener('change', async (e) => {
            if (!e.target) return;
            
            // Handle class selection for student dropdown
            if (e.target.matches('#classSelect')) {
                const className = e.target.value;
                console.debug('Class selected:', className);
                
                const studentSelect = document.getElementById('studentSelect');
                if (!studentSelect) {
                    console.warn('Student select element not found');
                    return;
                }
                
                // Show loading state and disable the select
                studentSelect.disabled = true;
                studentSelect.innerHTML = `
                    <option value="" selected disabled>
                        <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Loading students...
                    </option>`;
                
                try {
                    await populateStudentDropdown(className, studentSelect);
                    console.debug('Student dropdown populated successfully');
                } catch (error) {
                    console.error('Error populating student dropdown:', error);
                    studentSelect.innerHTML = [
                        '<option value="" selected disabled>',
                        '    <i class="bi bi-exclamation-triangle me-2"></i>',
                        '    Error loading students',
                        '</option>'
                    ].join('');
                } finally {
                    studentSelect.disabled = false;
                }
            }
            
            // Handle library class filter change
            if (e.target.matches('#library-class-filter, #status-filter, #academic-year-filter')) {
                console.debug('Library filter changed:', e.target.id, e.target.value);
                loadLibraryWithFilters().catch(error => {
                    console.error('Error applying filters:', error);
                    showNotification('Error applying filters. Please try again.', 'error');
                });
            }
        });
        
        // Initialize bulk actions
        if (libraryBulkDelete) {
            libraryBulkDelete.addEventListener('click', handleBulkDelete);
        }
        
        if (libraryBulkExport) {
            libraryBulkExport.addEventListener('click', handleBulkExport);
        }
        
        // Initialize search and filter events with debouncing
        const searchInputs = [
            { element: librarySearch, event: 'input', debounce: 300 },
            { element: libraryAuthorFilter, event: 'input', debounce: 300 },
            { element: document.getElementById('search-issued-books'), event: 'input', debounce: 300 },
            { element: libraryGenreFilter, event: 'change', debounce: 0 },
            { element: document.getElementById('class-filter'), event: 'change', debounce: 0 }
        ];
        
        searchInputs.forEach(({ element, event, debounce: wait }) => {
            if (!element) return;
            
            const handler = () => {
                if (element.id === 'search-issued-books' || element.id === 'class-filter') {
                    console.debug('Filtering issued books...');
                    filterIssuedBooks();
                } else {
                    console.debug('Loading library with filters...');
                    loadLibraryWithFilters();
                }
            };
            
            element.addEventListener(event, wait > 0 ? debounce(handler, wait) : handler);
        });
        
        // Initialize reset filters button if it exists
        const resetFiltersBtn = document.getElementById('reset-library-filters');
        if (resetFiltersBtn) {
            resetFiltersBtn.addEventListener('click', () => {
                console.debug('Resetting filters...');
                // Reset all filter inputs
                document.querySelectorAll('input[type="text"], input[type="search"], select')
                    .forEach(input => {
                        if (input.id && !['classSelect', 'studentSelect'].includes(input.id)) {
                            input.value = '';
                        }
                    });
                
                // Reload data with cleared filters
                loadLibraryWithFilters().catch(error => {
                    console.error('Error resetting filters:', error);
                    showNotification('Error resetting filters. Please try again.', 'error');
                });
            });
        }
        
        // Load initial library data if on the library page
        if (document.getElementById('library-list')) {
            loadLibraryWithFilters().catch(error => {
                console.error('Error loading initial library data:', error);
                showNotification('Error loading library data. Please refresh the page.', 'error');
            });
        }
        
        // Load issued books if on the issued books page
        if (document.getElementById('issued-books-list')) {
            loadIssuedBooks().catch(error => {
                console.error('Error loading issued books:', error);
                showNotification('Error loading issued books. Please refresh the page.', 'error');
            });
        }
    } catch (error) {
        console.error('Error initializing library:', error);
        showNotification('Error initializing library. Please refresh the page.', 'error');
    }
}

// Make initLibrary available globally
window.initLibrary = initLibrary;

// Initialize modal functionality
function initModal() {
    console.log('Initializing modal...');
    const modal = document.getElementById('universal-edit-modal');
    const closeBtn = document.getElementById('close-universal-edit-modal');
    const form = document.getElementById('universal-edit-form');
    
    if (!modal) {
        console.error('❌ Modal element not found');
        return;
    }
    
    console.log('✅ Modal element found:', modal);
    
    // Add close button handler
    if (closeBtn) {
        console.log('✅ Close button found, adding click handler');
        closeBtn.addEventListener('click', () => {
            console.log('Close button clicked');
            hideModal(modal);
        });
    } else {
        console.warn('⚠️ Close button not found');
    }
    
    // Close modal when clicking outside content
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            console.log('Clicked outside modal content');
            hideModal(modal);
        }
    });
    
    // Close with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('show')) {
            console.log('Escape key pressed');
            hideModal(modal);
        }
    });
    
    // Form submission handler
    if (form) {
        console.log('✅ Form found, adding submit handler');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('Form submitted');
            
            const formData = new FormData(form);
            const bookId = formData.get('bookId');
            const classSelect = form.querySelector('#classSelect');
            const studentSelect = form.querySelector('#studentSelect');
            const selectedStudent = studentSelect.options[studentSelect.selectedIndex];
            const borrowerName = selectedStudent.textContent;
            const borrowerId = formData.get('studentId');
            const borrowerEmail = selectedStudent.getAttribute('data-email') || '';
            const dueDate = formData.get('dueDate');

            console.log('Form data:', { bookId, borrowerName, borrowerId, dueDate });
            
            try {
                const token = localStorage.getItem('token');
                const genre = formData.get('genre') || 'General';
                
                const response = await fetch(`${API_CONFIG.BASE_URL}/api/library/${bookId}/issue`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        borrowerName,
                        borrowerId,
                        borrowerEmail,
                        dueDate,
                        className: classSelect.value,
                        genre: genre
                    })
                });
                
                let result;
                try {
                    result = await response.json();
                } catch (e) {
                    console.error('Error parsing response:', e);
                    throw new Error('Invalid response from server');
                }
                
                if (!response.ok) {
                    console.error('API Error:', result);
                    throw new Error(result.message || `Failed to issue book: ${response.status} ${response.statusText}`);
                }
                
                console.log('✅ Book issued successfully:', result);
                showNotification('Book issued successfully!', 'success');
                hideModal(modal);
                loadLibraryWithFilters(); // Refresh the book list
            } catch (error) {
                console.error('❌ Error issuing book:', error);
                showNotification(error.message || 'Failed to issue book', 'error');
            }
        });
    } else {
        console.warn('⚠️ Form element not found');
    }
    
    console.log('✅ Modal initialized successfully');
}

if (libraryForm) {
    libraryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            // Get form data
            const formData = new FormData(libraryForm);
            const bookId = formData.get('bookId');
            
            // Show loading state
            const submitButton = libraryForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton ? submitButton.innerHTML : null;
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
            }
            
            try {
                // Determine if this is an update or create
                const url = bookId ? `/api/library/${bookId}` : '/api/library';
                const method = bookId ? 'PUT' : 'POST';
                
                // Convert FormData to object
                const bookData = {};
                formData.forEach((value, key) => {
                    // Convert empty strings to null and handle number fields
                    if (value === '') {
                        if (key === 'year' || key === 'copies') {
                            bookData[key] = key === 'copies' ? 1 : null;
                        } else {
                            bookData[key] = null;
                        }
                    } else if (key === 'year' || key === 'copies') {
                        bookData[key] = Number(value) || (key === 'copies' ? 1 : null);
                    } else {
                        bookData[key] = value;
                    }
                });
                
                // Ensure required fields are present
                if (!bookData.title || !bookData.author || !bookData.genre || !bookData.className) {
                    throw new Error('Please fill in all required fields: Title, Author, Genre, and Class are required');
                }
                
                // Make API request using apiFetch
                const result = await apiFetch(url, {
                    method,
                    body: JSON.stringify(bookData),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                // Show success message
                showNotification(
                    bookId ? 'Book updated successfully' : 'Book added successfully', 
                    'success'
                );
                
                // Reset form and reload books
                libraryForm.reset();
                const bookIdInput = document.getElementById('book-id');
                if (bookIdInput) bookIdInput.value = '';
                
                // Close the modal if open
                const addBookModal = document.getElementById('addBookModal');
                if (addBookModal) {
                    const modal = bootstrap.Modal.getInstance(addBookModal);
                    if (modal) modal.hide();
                }
                
                // Reload the books list
                await loadLibraryWithFilters();
                
            } finally {
                // Restore button state
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.innerHTML = originalButtonText;
                }
            }
            
        } catch (error) {
            console.error('Error saving book:', error);
            showNotification(
                error.message || 'Failed to save book. Please try again.', 
                'error'
            );
        }
    });
}

// Attach filter listeners
if (librarySearch) librarySearch.addEventListener('input', () => loadLibraryWithFilters());
if (libraryGenreFilter) libraryGenreFilter.addEventListener('change', () => loadLibraryWithFilters());
if (libraryAuthorFilter) libraryAuthorFilter.addEventListener('input', () => loadLibraryWithFilters());

// --- Universal Modal Logic (Library) ---
const universalEditModal = document.getElementById('universal-edit-modal');
const closeUniversalEditModal = document.getElementById('close-universal-edit-modal');
const universalEditForm = document.getElementById('universal-edit-form');
const universalEditMsg = document.getElementById('universal-edit-msg');

const universalConfirmModal = document.getElementById('universal-confirm-modal');
const closeUniversalConfirmModal = document.getElementById('close-universal-confirm-modal');
const universalConfirmTitle = document.getElementById('universal-confirm-title');
const universalConfirmMessage = document.getElementById('universal-confirm-message');
const universalConfirmYes = document.getElementById('universal-confirm-yes');
const universalConfirmNo = document.getElementById('universal-confirm-no');

function openUniversalModal(modal) { 
    if (modal) modal.style.display = 'block'; 
}
function closeUniversalModal(modal) { 
    if (modal) modal.style.display = 'none'; 
}

if (closeUniversalEditModal) closeUniversalEditModal.onclick = () => closeUniversalModal(universalEditModal);
if (closeUniversalConfirmModal) closeUniversalConfirmModal.onclick = () => closeUniversalModal(universalConfirmModal);
window.onclick = function(event) {
  if (event.target === universalEditModal) closeUniversalModal(universalEditModal);
  if (event.target === universalConfirmModal) closeUniversalModal(universalConfirmModal);
};

/**
 * Handle bulk deletion of selected books
 */
async function handleBulkDelete() {
    if (selectedBookIds.size === 0) return;
    
    // Show confirmation dialog
    const confirmDelete = window.confirm(`Are you sure you want to delete ${selectedBookIds.size} selected book(s)?`);
    if (!confirmDelete) return;
    
    const deletePromises = [];
    
    // Create delete requests for all selected books
    for (const bookId of selectedBookIds) {
        deletePromises.push(
            apiFetch(`/books/${bookId}`, {
                method: 'DELETE'
            }).catch(error => ({
                status: 'rejected',
                reason: error.message
            }))
        );
    }
    
    try {
        // Wait for all delete operations to complete
        const results = await Promise.allSettled(deletePromises);
        const failedDeletes = results.filter(r => r.status === 'rejected');
        
        // Show appropriate notification based on results
        if (failedDeletes.length > 0) {
            console.error('Some books could not be deleted:', failedDeletes);
            showNotification(
                `${failedDeletes.length} of ${selectedBookIds.size} books could not be deleted.`,
                'error'
            );
        } else {
            showNotification(
                `${selectedBookIds.size} book(s) deleted successfully`,
                'success'
            );
        }
        
        // Refresh the UI
        clearLibrarySelections();
        await loadLibraryWithFilters();
    } catch (error) {
        console.error('Error in bulk delete operation:', error);
        showNotification(
            error.message || 'An error occurred while deleting books. Please try again.',
            'error'
        );
    }
}

// Initialize bulk delete button and confirmation dialog
if (libraryBulkDelete) {
    libraryBulkDelete.onclick = () => {
        if (selectedBookIds.size === 0) return;
        
        // Show confirmation dialog
        if (universalConfirmModal && universalConfirmTitle && universalConfirmMessage) {
            universalConfirmTitle.textContent = 'Delete Selected Books';
            universalConfirmMessage.textContent = `Are you sure you want to delete ${selectedBookIds.size} selected book(s)?`;
            universalConfirmModal.style.display = 'block';
            
            // Set up confirmation handler
            const confirmHandler = async () => {
                universalConfirmModal.style.display = 'none';
                await handleBulkDelete();
                // Remove the event listener after use
                if (universalConfirmYes) {
                    universalConfirmYes.removeEventListener('click', confirmHandler);
                }
            };
            
            // Set up cancel handler
            const cancelHandler = () => {
                universalConfirmModal.style.display = 'none';
                if (universalConfirmYes) {
                    universalConfirmYes.removeEventListener('click', confirmHandler);
                }
                if (universalConfirmNo) {
                    universalConfirmNo.removeEventListener('click', cancelHandler);
                }
            };
            
            // Add event listeners
            if (universalConfirmYes) {
                universalConfirmYes.addEventListener('click', confirmHandler);
            }
            if (universalConfirmNo) {
                universalConfirmNo.addEventListener('click', cancelHandler);
            }
        } else {
            // Fallback to browser confirm if modal elements not found
            handleBulkDelete();
        }
    };
}

/**
 * Handle bulk export of selected books to CSV
 */
async function handleBulkExport() {
    if (selectedBookIds.size === 0) {
        showNotification('Please select at least one book to export', 'warning');
        return;
    }

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Authentication required. Please log in again.');
        }

        // Show loading state
        const originalText = libraryBulkExport.innerHTML;
        libraryBulkExport.disabled = true;
        libraryBulkExport.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> Exporting...';

        // Fetch all books
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/library`, { 
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch books: ${response.status} ${response.statusText}`);
        }

        const books = await response.json();
        const selectedBooks = Array.isArray(books) 
            ? books.filter(book => book && book._id && selectedBookIds.has(book._id))
            : [];

        if (selectedBooks.length === 0) {
            throw new Error('No valid books found for export');
        }

        // Create CSV content
        const headers = ['Title', 'Author', 'ISBN', 'Status', 'Available', 'Genre'];
        let csvContent = headers.join(',') + '\n';

        selectedBooks.forEach(book => {
            const row = [
                `"${(book.title || '').replace(/"/g, '""')}"`,
                `"${(book.author || '').replace(/"/g, '""')}"`,
                `"${(book.isbn || '').replace(/"/g, '""')}"`,
                `"${(book.status || '').replace(/"/g, '""')}"`,
                `"${book.available ? 'Yes' : 'No'}"`,
                `"${(book.genre || '').replace(/"/g, '""')}"`
            ];
            csvContent += row.join(',') + '\n';
        });

        // Create and trigger download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `library_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        
        // Clean up
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 100);

        showNotification(`Exported ${selectedBooks.length} book(s) successfully`, 'success');
    } catch (error) {
        console.error('Export error:', error);
        showNotification(error.message || 'Failed to export books. Please try again.', 'error');
    } finally {
        // Restore button state
        if (libraryBulkExport) {
            libraryBulkExport.disabled = false;
            libraryBulkExport.innerHTML = originalText || 'Export Selected';
        }
    }
}

// Initialize bulk export button
if (libraryBulkExport) {
    libraryBulkExport.addEventListener('click', handleBulkExport);
}

// Load issued books from the server
let issuedBooksData = [];

/**
 * Load all issued books with optional class filtering
 */
async function loadIssuedBooks() {
    const tableBody = document.getElementById('issued-books-list');
    
    try {
        // Show loading state
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center">
                    <div class="d-flex justify-content-center align-items-center">
                        <div class="spinner-border text-primary me-2" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <span>Loading issued books...</span>
                    </div>
                </td>
            </tr>`;
        
        const classFilter = document.getElementById('class-filter');
        const selectedClass = classFilter ? classFilter.value : 'All';
        
        // Build query parameters
        const params = new URLSearchParams({
            groupByClass: 'true',
            _t: new Date().getTime() // Cache buster
        });
        
        if (selectedClass && selectedClass !== 'All') {
            params.append('className', selectedClass);
        }
        
        // Make API request using apiFetch with error handling
        let result;
        try {
            result = await apiFetch(`/api/library/issued?${params.toString()}`);
        } catch (error) {
            console.warn('Primary endpoint failed, trying fallback...', error);
            try {
                // Fallback to alternative endpoint if primary fails
                result = await apiFetch(`/api/library/issued?${params.toString()}`);
            } catch (fallbackError) {
                console.error('All API endpoints failed:', fallbackError);
                throw new Error('Unable to load issued books. Please check your connection and try again.');
            }
        }
        
        // Handle various response formats
        if (!result) {
            throw new Error('Empty response from server');
        }
        
        // Normalize response data
        issuedBooksData = Array.isArray(result) 
            ? result 
            : Array.isArray(result.data) 
                ? result.data 
                : [];
        
        console.log('Loaded issued books:', issuedBooksData.length);
        
        // Update class filter dropdown if it exists
        if (classFilter) {
            updateClassFilter(issuedBooksData);
        }
        
        // Display books if we have data
        if (issuedBooksData.length > 0) {
            displayIssuedBooks(issuedBooksData);
        } else {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-muted py-4">
                        <i class="fas fa-book-open me-2"></i>
                        No books are currently issued out.
                    </td>
                </tr>`;
        }
        
    } catch (error) {
        console.error('Error loading issued books:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-danger py-4">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Failed to load issued books. ${error.message || 'Please try again later.'}
                </td>
            </tr>`;
    }
}

// Update class filter dropdown
function updateClassFilter(books) {
    const classFilter = document.getElementById('classFilter');
    if (!classFilter) return;
    
    // Get all current options and their values
    const currentOptions = {};
    Array.from(classFilter.options).forEach(option => {
        currentOptions[option.value] = option.text;
    });
    
    // Get unique class names from the data
    const classSet = new Set();
    
    // Handle both grouped and ungrouped data structures
    if (Array.isArray(books)) {
        // Flat array of books
        books.forEach(book => {
            if (book.className) {
                classSet.add(book.className);
            }
        });
    } else if (typeof books === 'object' && books !== null) {
        // Grouped by class
        Object.keys(books).forEach(className => {
            classSet.add(className);
        });
    }
    
    // Add any new classes from the data that aren't already in the dropdown
    let newOptionsAdded = false;
    classSet.forEach(className => {
        if (!(className in currentOptions)) {
            // Find the appropriate optgroup based on class name
            let optgroup = null;
            if (['Baby Class', 'PP1', 'PP2'].includes(className)) {
                optgroup = 'Pre-Primary';
            } else if (className.startsWith('Grade 1') || className.startsWith('Grade 2') || className.startsWith('Grade 3')) {
                optgroup = 'Lower Primary';
            } else if (className.startsWith('Grade 4') || className.startsWith('Grade 5') || className.startsWith('Grade 6')) {
                optgroup = 'Upper Primary';
            } else if (className.startsWith('Grade 7') || className.startsWith('Grade 8') || className.startsWith('Grade 9')) {
                optgroup = 'Junior Secondary';
            } else if (className.startsWith('Grade 10') || className.startsWith('Grade 11') || className.startsWith('Grade 12')) {
                optgroup = 'Senior School';
            }
            
            // Add the new option to the appropriate optgroup
            if (optgroup) {
                const optgroupElement = Array.from(classFilter.getElementsByTagName('optgroup')).find(
                    og => og.label === optgroup
                );
                
                if (optgroupElement) {
                    const option = document.createElement('option');
                    option.value = className;
                    option.textContent = className;
                    optgroupElement.appendChild(option);
                    newOptionsAdded = true;
                }
            } else {
                // If no matching optgroup, add to the default options
                const option = new Option(className, className);
                classFilter.add(option);
                newOptionsAdded = true;
            }
        }
    });
    
    // If we added new options, sort each optgroup
    if (newOptionsAdded) {
        const select = classFilter;
        const optgroups = Array.from(select.getElementsByTagName('optgroup'));
        
        optgroups.forEach(optgroup => {
            const options = Array.from(optgroup.getElementsByTagName('option'));
            const sortedOptions = options.sort((a, b) => {
                // Extract numbers for proper numeric sorting (e.g., Grade 2 comes before Grade 10)
                const numA = parseInt(a.value.replace(/\D/g, '')) || 0;
                const numB = parseInt(b.value.replace(/\D/g, '')) || 0;
                return numA - numB || a.value.localeCompare(b.value);
            });
            
            // Clear and re-add sorted options
            while (optgroup.firstChild) {
                optgroup.removeChild(optgroup.firstChild);
            }
            
            sortedOptions.forEach(option => {
                optgroup.appendChild(option);
            });
        });
    }
}

// Normalize class name for comparison (e.g., 'Grade 1' -> 'grade1')
function normalizeClassName(className) {
    if (!className) return '';
    // Remove all spaces and convert to lowercase
    return className.replace(/\s+/g, '').toLowerCase();
}

// Filter issued books based on search and class filter
function filterIssuedBooks() {
    console.log('Filtering issued books...');
    const searchTerm = (document.getElementById('issued-books-search')?.value || '').toLowerCase();
    const selectedClass = document.getElementById('classFilter')?.value || 'All';
    const normalizedSelectedClass = normalizeClassName(selectedClass);
    const tableBody = document.getElementById('issued-books-list');
    
    if (!tableBody) {
        console.warn('Issued books table body not found');
        return;
    }
    
    const rows = tableBody.querySelectorAll('tr');
    let hasVisibleRows = false;
    let currentGroup = null;
    let groupHasVisibleRows = false;
    
    console.log('Filtering with class:', selectedClass, 'and search term:', searchTerm);
    
    // Process all rows and show/hide as needed
    rows.forEach(row => {
        if (row.classList.contains('table-group')) {
            // Handle group headers
            currentGroup = row;
            groupHasVisibleRows = false; // Reset for new group
            row.style.display = 'none'; // Hide by default, show if any children are visible
        } else {
            // Handle book rows
            const rowClass = row.getAttribute('data-class') || '';
            const normalizedRowClass = normalizeClassName(rowClass);
            const bookTitle = (row.getAttribute('data-title') || '').toLowerCase();
            const studentName = (row.getAttribute('data-student') || '').toLowerCase();
            
            // Check if row matches filters
            const classMatches = selectedClass === 'All' || normalizedRowClass === normalizedSelectedClass;
            const searchMatches = !searchTerm || 
                bookTitle.includes(searchTerm) || 
                studentName.includes(searchTerm);
                
            if (classMatches && searchMatches) {
                row.style.display = '';
                hasVisibleRows = true;
                groupHasVisibleRows = true;
                if (currentGroup) {
                    currentGroup.style.display = '';
                }
            } else {
                row.style.display = 'none';
            }
        }
    });
    
    // Show no results message if no rows are visible
    const noResultsRow = tableBody.querySelector('tr.no-results');
    if (noResultsRow) {
        noResultsRow.style.display = hasVisibleRows ? 'none' : '';
    }
    
    // If no rows are visible, show a more descriptive message
    if (!hasVisibleRows) {
        const noResultsMessage = tableBody.querySelector('.no-results-message');
        if (!noResultsMessage) {
            const tr = document.createElement('tr');
            tr.className = 'no-results-message';
            tr.innerHTML = `
                <td colspan="8" class="text-center py-4">
                    <div class="text-muted">
                        <i class="fas fa-search fa-2x mb-2"></i>
                        <p class="mb-0">No books match your search criteria</p>
                    </div>
                </td>`;
            tableBody.appendChild(tr);
        } else {
            noResultsMessage.style.display = '';
        }
    } else {
        const noResultsMessage = tableBody.querySelector('.no-results-message');
        if (noResultsMessage) {
            noResultsMessage.style.display = 'none';
        }
    }
}

// Display issued books in the table
function displayIssuedBooks(books) {
    console.log('Displaying issued books:', books);
    const tableBody = document.getElementById('issued-books-list');
    if (!tableBody) {
        console.error('Table body element not found');
        return;
    }
    
    if (!books || books.length === 0) {
        console.log('No books data to display');
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4">
                    <div class="text-muted">
                        <i class="fas fa-inbox fa-2x mb-2"></i>
                        <p class="mb-0">No currently issued books found</p>
                    </div>
                </td>
            </tr>`;
        return;
    }
    
    let html = '';
    
    // Check if data is in the expected format
    if (typeof books !== 'object' || books === null) {
        console.error('Invalid books data format:', books);
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-danger py-4">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Invalid data format received from server
                </td>
            </tr>`;
        return;
    }
    
    // Check if data is grouped by class
    const isGrouped = Array.isArray(books) && books.some(book => book._id && book.books);
    
    if (isGrouped) {
        console.log('Processing grouped books data');
        // Handle grouped data (by class)
        books.forEach(group => {
            const className = group._id || 'Ungrouped';
            const classBooks = group.books || [];
            
            if (classBooks.length > 0) {
                console.log(`Processing group: ${className} with ${classBooks.length} books`);
                // Add class header
                html += `
                    <tr class="table-group" data-class="${className.toLowerCase()}">
                        <td colspan="8" class="bg-light fw-bold">
                            <i class="fas fa-users me-2"></i>${className} (${classBooks.length} books)
                        </td>
                    </tr>`;
                
                // Add books for this class
                classBooks.forEach(book => {
                    html += renderIssuedBookRow(book);
                });
            }
        });
    } else {
        console.log('Processing flat books data');
        // Handle flat list of books
        books.forEach((book, index) => {
            console.log(`Book ${index + 1}:`, book);
            html += renderIssuedBookRow(book);
        });
    }
    
    tableBody.innerHTML = html || `
        <tr>
            <td colspan="8" class="text-center py-4 text-muted">
                No issued books found
            </td>
        </tr>`;
    
    // Add event listeners to return buttons
    document.querySelectorAll('.return-book-btn').forEach(btn => {
        btn.addEventListener('click', handleReturnBook);
    });
}

// Render a single issued book row
function renderIssuedBookRow(book) {
    console.log('Rendering book row:', book);
    
    if (!book) {
        console.error('No book data provided to renderIssuedBookRow');
        return '';
    }
    
    // Format issue date
    let issueDate = 'N/A';
    try {
        if (book.issueDate) {
            issueDate = new Date(book.issueDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        }
    } catch (e) {
        console.error('Error formatting issue date:', e);
    }
    
    // Format due date
    let dueDate = 'N/A';
    let due = null;
    try {
        if (book.dueDate) {
            due = new Date(book.dueDate);
            dueDate = due.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                weekday: 'short'
            });
        }
    } catch (e) {
        console.error('Error formatting due date:', e);
    }
    
    // Calculate overdue status
    const today = new Date();
    const isOverdue = due && due < today && !book.returned;
    const daysOverdue = isOverdue ? Math.ceil((today - due) / (1000 * 60 * 60 * 24)) : 0;
    const fine = book.fine || 0;
    
    // Get class name, default to 'Ungrouped' if not provided
    const className = (book.className || book.doc?.className || 'Ungrouped').trim();
    console.log('Book class name:', className);
    
    return `
        <tr class="${isOverdue ? 'table-warning' : ''}" data-class="${className.toLowerCase()}">
            <td>
                <div class="fw-semibold">${book.title || 'Unknown Title'}</div>
                <div class="text-muted small">${book.author || 'Unknown Author'}</div>
            </td>
            <td>${book.borrowerName || 'Unknown Borrower'}</td>
            <td>${className}</td>
            <td>${issueDate}</td>
            <td class="${isOverdue ? 'text-danger fw-semibold' : ''}">
                ${dueDate}
                ${isOverdue ? `
                    <div class="badge bg-danger text-white mt-1">
                        ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue
                    </div>
                ` : ''}
            </td>
            <td>
                <span class="badge ${book.returned ? 'bg-success' : 'bg-primary'}">
                    ${book.returned ? 'Returned' : 'Issued'}
                </span>
            </td>
            <td>
                ${fine > 0 ? `
                    <span class="badge bg-danger">
                        KES ${parseFloat(fine).toFixed(2)}
                    </span>
                ` : ''}
            </td>
            <td>
                ${!book.returned ? `
                    <button class="btn btn-sm btn-outline-primary return-book-btn" 
                            data-id="${book._id || ''}" 
                            data-book-id="${book.bookId || ''}"
                            data-bs-toggle="modal" 
                            data-bs-target="#returnBookModal"
                            data-book-title="${book.title || ''}"
                            data-borrower="${book.borrowerName || ''}"
                            data-fine="${fine}">
                        <i class="fas fa-undo me-1"></i> Return
                    </button>
                ` : ''}
            </td>
        </tr>`;
}

// Check if a book is overdue
function isOverdue(dueDate) {
    if (!dueDate) return false;
    const today = new Date();
    const due = new Date(dueDate);
    return due < today;
}

// Get status badge class based on return status
function getStatusClass(returned) {
    return returned ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800';
}

/**
 * Handle returning a borrowed book
 */
async function handleReturnBook(event) {
    event.preventDefault();
    
    const button = event.currentTarget;
    const issueId = button.getAttribute('data-id');
    const bookId = button.getAttribute('data-book-id');
    const bookTitle = button.getAttribute('data-book-title');
    const borrowerName = button.getAttribute('data-borrower');
    const fine = parseFloat(button.getAttribute('data-fine')) || 0;
    
    // Get modal elements
    const modal = document.getElementById('returnBookModal');
    if (!modal) {
        console.error('Return book modal not found');
        showNotification('Error: Return book modal not found', 'error');
        return;
    }
    
    const modalInstance = new bootstrap.Modal(modal);
    
    // Update modal content
    const bookTitleEl = modal.querySelector('.book-title');
    const borrowerNameEl = modal.querySelector('.borrower-name');
    const fineAmountEl = modal.querySelector('.fine-amount');
    
    if (bookTitleEl) bookTitleEl.textContent = bookTitle;
    if (borrowerNameEl) borrowerNameEl.textContent = borrowerName;
    if (fineAmountEl) fineAmountEl.textContent = `KES ${fine.toFixed(2)}`;
    
    // Get form elements
    const returnForm = document.getElementById('returnBookForm');
    if (!returnForm) {
        console.error('Return form not found');
        return;
    }
    
    const submitBtn = returnForm.querySelector('button[type="submit"]');
    const cancelBtn = returnForm.querySelector('button[type="button"]');
    const finePaidInput = returnForm.querySelector('#finePaid');
    
    // Reset form state
    returnForm.reset();
    if (finePaidInput) {
        finePaidInput.max = fine;
        finePaidInput.value = fine.toFixed(2);
    }
    
    // Show/hide fine section based on whether there's a fine
    const fineSection = modal.querySelector('.fine-section');
    if (fineSection) {
        fineSection.style.display = fine > 0 ? 'block' : 'none';
    }
    
    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!submitBtn || !cancelBtn) return;
        
        const finePaid = finePaidInput ? parseFloat(finePaidInput.value) || 0 : 0;
        
        // Validate fine paid
        if (finePaid > fine) {
            showNotification('Fine paid cannot be more than the fine amount', 'error');
            return;
        }
        
        // Disable form elements
        submitBtn.disabled = true;
        cancelBtn.disabled = true;
        const originalButtonText = submitBtn.innerHTML;
        
        if (submitBtn) {
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
        }
        
        try {
            // Prepare return data
            const returnData = {
                finePaid: finePaid,
                remarks: document.getElementById('returnRemarks')?.value || ''
            };
            
            // Make API request using apiFetch
            const result = await apiFetch(`/library/return/${issueId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(returnData)
            });
            
            // Show success message
            showNotification('Book returned successfully', 'success');
            
            // Close the modal
            if (modalInstance && typeof modalInstance.hide === 'function') {
                modalInstance.hide();
            }
            
            // Reload the issued books list
            await loadIssuedBooks();
            
        } catch (error) {
            console.error('Error returning book:', error);
            showNotification(
                error.message || 'Failed to return book. Please try again.',
                'error'
            );
            
            // Re-enable form elements on error
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalButtonText || 'Confirm Return';
            }
            if (cancelBtn) {
                cancelBtn.disabled = false;
            }
        }
    };
    
    // Clean up any existing event listeners to prevent duplicates
    const newForm = returnForm.cloneNode(true);
    returnForm.parentNode.replaceChild(newForm, returnForm);
    
    // Add event listener to the new form
    newForm.addEventListener('submit', handleSubmit);
    
    // Set up cancel button
    if (cancelBtn) {
        cancelBtn.onclick = () => {
            if (modalInstance && typeof modalInstance.hide === 'function') {
                modalInstance.hide();
            }
        };
    }
    
    // Show the modal
    if (modalInstance && typeof modalInstance.show === 'function') {
        modalInstance.show();
    } else {
        console.error('Modal instance does not have show method');
        showNotification('Error: Unable to open return dialog', 'error');
    }
}

// Show notification function
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    const container = document.getElementById('notification-container') || document.body;
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Initialize search and filter functionality for issued books
function initIssuedBooksSearch() {
    const searchInput = document.getElementById('issued-books-search');
    const classFilter = document.getElementById('classFilter');
    const resetFiltersBtn = document.getElementById('resetFilters');
    
    let searchTimeout;
    
    // Handle search input
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                filterIssuedBooks();
            }, 300);
        });
    }
    
    // Handle class filter change
    if (classFilter) {
        classFilter.addEventListener('change', () => {
            filterIssuedBooks();
        });
    }
    
    // Handle reset filters button
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            if (classFilter) classFilter.value = '';
            filterIssuedBooks();
        });
    }
}

// Initialize when the script is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initLibrary();
        initIssuedBooksSearch();
        // Show available books tab by default
        showLibraryTab('available-books');
    });
} else {
    initLibrary();
    initIssuedBooksSearch();
    // Show available books tab by default
    showLibraryTab('available-books');
}