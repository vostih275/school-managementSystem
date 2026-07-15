document.addEventListener('DOMContentLoaded', () => {
    // Events Management Logic
    const eventForm = document.getElementById('event-form');
    const eventList = document.getElementById('event-list');
    const eventSearch = document.getElementById('event-search');

    // --- Universal Modal Logic (Events) ---
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

    if (closeUniversalEditModal && universalEditModal) {
        closeUniversalEditModal.onclick = () => closeUniversalModal(universalEditModal);
    }
    
    if (closeUniversalConfirmModal && universalConfirmModal) {
        closeUniversalConfirmModal.onclick = () => closeUniversalModal(universalConfirmModal);
    }
    
    window.onclick = function(event) {
        if (event.target === universalEditModal) closeUniversalModal(universalEditModal);
        if (event.target === universalConfirmModal) closeUniversalModal(universalConfirmModal);
    };

// --- Bulk Actions Logic for Events ---
const eventsBulkToolbar = document.getElementById('events-bulk-toolbar');
const eventsBulkDelete = document.getElementById('events-bulk-delete');
const eventsBulkExport = document.getElementById('events-bulk-export');
const selectAllEvents = document.getElementById('select-all-events');
const eventsTableBody = document.getElementById('events-table-body');

let selectedEventIds = new Set();

function renderEventRow(event) {
    return `<tr>
        <td><input type="checkbox" class="event-select-checkbox" data-id="${event._id}"></td>
        <td>${event.title}</td>
        <td>${event.date ? new Date(event.date).toLocaleDateString() : ''}</td>
        <td>${event.description || ''}</td>
        <td>
            <button class="edit-event-btn" data-id="${event._id}">Edit</button>
            <button class="delete-event-btn" data-id="${event._id}">Delete</button>
        </td>
    </tr>`;
}

function updateEventsBulkToolbarState() {
    const hasSelection = selectedEventIds.size > 0;
    eventsBulkToolbar.style.display = hasSelection ? 'block' : 'none';
    eventsBulkDelete.disabled = !hasSelection;
    eventsBulkExport.disabled = !hasSelection;
}

function clearEventSelections() {
    selectedEventIds.clear();
    document.querySelectorAll('.event-select-checkbox').forEach(cb => cb.checked = false);
    if (selectAllEvents) selectAllEvents.checked = false;
    updateEventsBulkToolbarState();
}

// --- Advanced Filters for Events ---
const eventsSearch = document.getElementById('events-search');
const eventsTypeFilter = document.getElementById('events-type-filter');
const eventsDateFilter = document.getElementById('events-date-filter');

function getEventsFilters() {
    return {
        search: eventsSearch.value.trim(),
        type: eventsTypeFilter.value,
        date: eventsDateFilter.value
    };
}

function buildEventsQueryString(filters) {
    const params = [];
    if (filters.search) params.push(`search=${encodeURIComponent(filters.search)}`);
    if (filters.type) params.push(`type=${encodeURIComponent(filters.type)}`);
    if (filters.date) params.push(`date=${encodeURIComponent(filters.date)}`);
    return params.length ? '?' + params.join('&') : '';
}

async function loadEventsWithFilters() {
    const token = localStorage.getItem('token');
    const filters = getEventsFilters();
    try {
        const filters = getEventsFilters();
        const queryString = buildEventsQueryString(filters);
        const url = `${window.API_CONFIG?.BASE_URL || 'http://localhost:5000'}/api/events${queryString}`;
        
        const response = await fetch(url, { 
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        try {
            const events = await response.json();
            eventsTableBody.innerHTML = '';
            
            if (Array.isArray(events) && events.length > 0) {
                eventsTableBody.innerHTML = events.map(event =>
                    `<tr>
                        <td><input type="checkbox" class="event-select-checkbox" data-id="${event._id}"></td>
                        <td>${event.title}</td>
                        <td>${event.type}</td>
                        <td>${new Date(event.date).toLocaleDateString()}</td>
                        <td>${event.description}</td>
                        <td>
                            <button class="action-btn edit" onclick="openEditEventModal('${event._id}')">Edit</button>
                            <button class="action-btn delete" onclick="deleteEvent('${event._id}')">Delete</button>
                        </td>
                    </tr>`
                ).join('');

                // Update bulk selection state if toolbar exists
                const eventsBulkToolbar = document.getElementById('events-bulk-toolbar');
                if (eventsBulkToolbar) {
                    document.querySelectorAll('.event-select-checkbox').forEach(cb => {
                        cb.checked = false;
                        if (window.selectedEventIds) {
                            selectedEventIds.delete(cb.getAttribute('data-id'));
                        }
                    });
                    if (typeof updateEventsBulkToolbarState === 'function') {
                        updateEventsBulkToolbarState();
                    }
                } else {
                    eventsTableBody.innerHTML = '<tr><td colspan="6">No events found.</td></tr>';
                }
            } else {
                eventsTableBody.innerHTML = '<tr><td colspan="6">No events found.</td></tr>';
            }
        } catch (error) {
            console.error('Error loading events:', error);
            eventsTableBody.innerHTML = '<tr><td colspan="6">Error loading events. Please try again later.</td></tr>';
        }
    } catch (error) {
        console.error('Error loading events:', error);
        eventsTableBody.innerHTML = '<tr><td colspan="6">Error loading events. Please try again later.</td></tr>';
    }
}

    // Attach filter listeners
    if (eventsSearch) eventsSearch.addEventListener('input', () => loadEventsWithFilters());
    if (eventsTypeFilter) eventsTypeFilter.addEventListener('change', () => loadEventsWithFilters());
    if (eventsDateFilter) eventsDateFilter.addEventListener('change', () => loadEventsWithFilters());

    // Event form submission
    async function handleEventFormSubmit(e) {
        e.preventDefault();
        
        if (!eventForm) return;
        
        const formData = new FormData(eventForm);
        const eventData = {
            title: formData.get('title'),
            date: formData.get('date'),
            description: formData.get('description'),
            type: formData.get('type')
        };
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${window.API_CONFIG?.BASE_URL || 'http://localhost:5000'}/api/events`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(eventData)
            });
            
            if (!response.ok) {
                throw new Error('Failed to save event');
            }
            
            // Reset form and close modal
            eventForm.reset();
            closeUniversalModal(universalEditModal);
            
            // Reload events
            loadEventsWithFilters();
            
        } catch (error) {
            console.error('Error saving event:', error);
            if (universalEditMsg) {
                universalEditMsg.textContent = 'Error saving event: ' + error.message;
                universalEditMsg.style.color = 'red';
            }
        }
    }

    async function handleEventListClick(e) {
        const btn = e.target;
        const eventId = btn.getAttribute('data-id');
        if (!eventId) return;
        const token = localStorage.getItem('token');
        // Edit Event (universal modal)
        if (btn.classList.contains('edit-event-btn')) {
            const li = btn.closest('tr');
            const currentTitle = li.querySelector('td:nth-child(2)').textContent;
            const currentDate = li.querySelectorAll('td')[1].textContent;
            const currentDesc = li.querySelectorAll('td')[2].textContent;
            universalEditForm.innerHTML = `
                <input type="hidden" name="eventId" value="${eventId}" />
                <div class='form-group'><label>Title:</label><input type='text' name='title' value='${currentTitle}' required /></div>
                <div class='form-group'><label>Date:</label><input type='date' name='date' value='${currentDate ? new Date(currentDate).toISOString().split('T')[0] : ''}' required /></div>
                <div class='form-group'><label>Description:</label><input type='text' name='description' value='${currentDesc}' /></div>
                <button type='submit'>Save Changes</button>
            `;
            universalEditMsg.style.display = 'none';
            openUniversalModal(universalEditModal);
            universalEditForm.onsubmit = async (ev) => {
                ev.preventDefault();
                universalEditMsg.style.display = 'none';
                const formData = new FormData(universalEditForm);
                const title = formData.get('title');
                const date = formData.get('date');
                const description = formData.get('description');
                try {
                    const res = await fetch(`${window.API_CONFIG?.BASE_URL || 'http://localhost:5000'}/api/events/${eventId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`,
                        },
                        body: JSON.stringify({ title, date, description })
                    });
                    if (res.ok) {
                        universalEditMsg.textContent = 'Event updated successfully!';
                        universalEditMsg.style.color = 'green';
                        universalEditMsg.style.display = 'block';
                        setTimeout(() => {
                            closeUniversalModal(universalEditModal);
                            loadEventsWithFilters();
                        }, 1000);
                    } else {
                        universalEditMsg.textContent = 'Failed to update event.';
                        universalEditMsg.style.color = 'red';
                        universalEditMsg.style.display = 'block';
                    }
                } catch {
                    universalEditMsg.textContent = 'Network error.';
                    universalEditMsg.style.color = 'red';
                    universalEditMsg.style.display = 'block';
                }
            };
        }
        // Delete Event (universal confirm modal)
        else if (btn.classList.contains('delete-event-btn')) {
            universalConfirmTitle.textContent = 'Delete Event';
            universalConfirmMessage.textContent = 'Are you sure you want to delete this event?';
            openUniversalModal(universalConfirmModal);
            universalConfirmYes.onclick = async () => {
                closeUniversalModal(universalConfirmModal);
                try {
                    const res = await fetch(`${window.API_CONFIG?.BASE_URL || 'http://localhost:5000'}/api/events/${eventId}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        loadEventsWithFilters();
                    }
                } catch {}
            };
            universalConfirmNo.onclick = () => closeUniversalModal(universalConfirmModal);
        }
    }

    // Ensure the DOM element exists before adding event listeners
    if (eventForm) {
        eventForm.addEventListener('submit', handleEventFormSubmit);
    }
    if (eventList) {
        eventList.addEventListener('click', handleEventListClick);
    }

    // Bulk Delete
    if (eventsBulkDelete) {
        eventsBulkDelete.onclick = async function() {
            if (selectedEventIds.size === 0) return;
            
            const confirmDelete = confirm(`Are you sure you want to delete ${selectedEventIds.size} selected event(s)?`);
            if (!confirmDelete) return;
            
            const token = localStorage.getItem('token');
            const deletePromises = [];
            
            for (const eventId of selectedEventIds) {
                deletePromises.push(
                    fetch(`${window.API_CONFIG?.BASE_URL || 'http://localhost:5000'}/api/events/${eventId}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    })
                );
            }
            
            try {
                await Promise.all(deletePromises);
                clearEventSelections();
                loadEventsWithFilters();
            } catch (error) {
                console.error('Error deleting events:', error);
                alert('An error occurred while deleting events');
            }
        };
    }

    // Bulk Export
    if (eventsBulkExport) {
        eventsBulkExport.onclick = async function() {
            if (selectedEventIds.size === 0) return;
            
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${window.API_CONFIG?.BASE_URL || 'http://localhost:5000'}/api/events/export`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ eventIds: Array.from(selectedEventIds) })
                });
                
                if (!response.ok) throw new Error('Export failed');
                
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `events-export-${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
            } catch (error) {
                console.error('Export failed:', error);
                alert('Failed to export events');
            }
        };
    }

    // Initial load
    loadEventsWithFilters();
});