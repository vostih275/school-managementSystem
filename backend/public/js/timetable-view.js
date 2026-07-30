// Timetable view integration: class selector, teacher "My Timetable" toggle,
// and 40-minute lesson grid with Friday PPI and 4-5 PM daily activities.
(function () {
  const API_BASE_URL = (window.API_CONFIG?.API_BASE_URL || 'http://localhost:5000/api').replace(/\/$/, '');

  const BASE_PERIODS = [
    { lessonNumber: 1, startTime: '07:30', endTime: '08:10', label: 'Lesson 1' },
    { lessonNumber: 2, startTime: '08:10', endTime: '08:50', label: 'Lesson 2' },
    { lessonNumber: 3, startTime: '08:50', endTime: '09:30', label: 'Lesson 3' },
    { lessonNumber: 4, startTime: '09:30', endTime: '10:10', label: 'Lesson 4' },
    { lessonNumber: 5, startTime: '10:10', endTime: '10:50', label: 'Lesson 5' },
    { lessonNumber: 6, startTime: '12:00', endTime: '12:40', label: 'Lesson 6' },
    { lessonNumber: 7, startTime: '12:40', endTime: '13:20', label: 'Lesson 7' },
    { lessonNumber: 8, startTime: '13:20', endTime: '14:00', label: 'Lesson 8' },
    { lessonNumber: 9, startTime: '14:40', endTime: '15:20', label: 'Lesson 9' },
    { lessonNumber: 10, startTime: '15:20', endTime: '16:00', label: 'Remedials' },
    { lessonNumber: 11, startTime: '16:00', endTime: '17:00', label: 'Activities' }
  ];

  const DAILY_ACTIVITIES = {
    Monday: 'Games',
    Tuesday: 'Clubs & Societies',
    Wednesday: 'C.U. Service',
    Thursday: 'Guidance & Counseling',
    Friday: 'Games'
  };

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  let currentClassName = '';
  let currentSlots = [];
  let teachersCache = [];

  function getToken() {
    return localStorage.getItem('token');
  }

  function getUserData() {
    try {
      const raw = localStorage.getItem('userData');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function getUserRole() {
    const userData = getUserData();
    if (userData?.role) return userData.role.toLowerCase();
    const token = getToken();
    if (!token) return null;
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64));
      return (payload.role || '').toLowerCase();
    } catch {
      return null;
    }
  }

  function isTeacher() {
    const role = getUserRole();
    return role === 'teacher' || role === 'admin';
  }

  function setLoading(message) {
    const timetableBody = document.querySelector('.timetable-body');
    if (timetableBody) {
      timetableBody.innerHTML = `<div style="padding:20px;text-align:center;">${message}</div>`;
    }
  }

  function renderSlots(slots, mode, metaTitle) {
    currentSlots = slots || [];
    const timetableBody = document.querySelector('.timetable-body');
    if (!timetableBody) {
      console.error('Timetable body element not found');
      return;
    }

    const slotMap = {};
    slots.forEach(slot => {
      const key = `${slot.lessonNumber || ''}_${slot.day || ''}`;
      slotMap[key] = slot;
    });

    const table = document.createElement('table');
    table.className = 'timetable';
    table.style.width = '100%';
    table.style.tableLayout = 'fixed';

    const caption = document.createElement('caption');
    caption.textContent = metaTitle || 'Timetable';
    caption.style.captionSide = 'top';
    caption.style.textAlign = 'center';
    caption.style.fontWeight = 'bold';
    caption.style.padding = '8px';
    table.appendChild(caption);

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const dayHeader = document.createElement('th');
    dayHeader.textContent = 'Day / Time';
    dayHeader.style.width = '120px';
    headerRow.appendChild(dayHeader);

    BASE_PERIODS.forEach(period => {
      const th = document.createElement('th');
      th.innerHTML = `${period.startTime}-${period.endTime}<br><small>${period.label}</small>`;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    const isAdmin = getUserRole() === 'admin';

    DAYS.forEach(day => {
      const tr = document.createElement('tr');
      const dayCell = document.createElement('td');
      dayCell.textContent = day;
      dayCell.style.fontWeight = 'bold';
      dayCell.style.background = '#f8f9fa';
      tr.appendChild(dayCell);

      BASE_PERIODS.forEach(period => {
        const td = document.createElement('td');
        td.style.padding = '6px';
        td.style.textAlign = 'center';
        td.style.verticalAlign = 'middle';

        let content = '';
        let cssClass = '';
        let title = '';
        let slotForEdit = null;

        if (period.lessonNumber === 1 && day === 'Friday') {
          content = 'PPI';
          cssClass = 'class-ppi';
          td.style.background = '#fff3e0';
          title = 'Program of Pastoral Instruction';
        } else if (period.lessonNumber === 11) {
          content = DAILY_ACTIVITIES[day] || '';
          cssClass = 'class-activity';
          td.style.background = '#e8f5e9';
          title = content;
        } else {
          const key = `${period.lessonNumber}_${day}`;
          const slot = slotMap[key] || null;
          slotForEdit = slot;
          const text = slot ? (slot.subject || slot.activity || '') : '';
          if (text) {
            if (mode === 'teacher') {
              content = `<b>${text}</b>`;
              if (slot.class) {
                content += ` <br><small>(${slot.class})</small>`;
              }
              title = `${slot.class || ''} - ${text}`;
            } else {
              content = `<b>${text}</b>`;
              const teacherName = slot.teacher?.name;
              if (teacherName) {
                content += ` <br><small>(${teacherName})</small>`;
              }
              if (slot.class) {
                title = slot.class;
              }
            }
            const firstWord = text.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '') || 'lesson';
            cssClass = `class-${firstWord}`;
          } else if (period.lessonNumber === 10) {
            content = 'Remedials';
          }
        }

        if (content) {
          const div = document.createElement('div');
          div.className = `class-slot ${cssClass}`.trim();
          div.innerHTML = content;
          div.title = title || `${day} ${period.startTime}-${period.endTime}: ${content.replace(/<[^>]+>/g, '')}`;
          td.appendChild(div);
        }

        // Click-to-edit for admin on regular Lessons 1-9
        if (isAdmin && mode === 'class' && period.lessonNumber <= 9) {
          td.style.cursor = 'pointer';
          td.title = 'Click to edit this slot';
          td.addEventListener('click', () => openEditModal(slotForEdit, day, period, currentClassName));
        }

        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    timetableBody.innerHTML = '';
    timetableBody.appendChild(table);
  }

  async function loadAndRenderTeacherTimetable() {
    setLoading('Loading your timetable...');
    const token = getToken();
    try {
      const response = await fetch(`${API_BASE_URL}/timetable/teacher/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success && Array.isArray(data.slots)) {
        renderSlots(data.slots, 'teacher', `My Timetable — ${data.teacher || ''}`);
      } else {
        setLoading(data.message || 'No timetable slots found for your classes.');
      }
    } catch (error) {
      console.error('Error fetching teacher timetable:', error);
      setLoading('Failed to load your timetable. Please try again.');
    }
  }

  async function loadAndRenderClassTimetable(className) {
    if (!className) {
      setLoading('Select a class to view the timetable.');
      return;
    }
    currentClassName = className;
    setLoading('Loading class timetable...');
    const token = getToken();
    try {
      const response = await fetch(`${API_BASE_URL}/timetable/${encodeURIComponent(className)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success && Array.isArray(data.slots)) {
        renderSlots(data.slots, 'class', `Class Timetable — ${data.class || className}`);
      } else {
        setLoading(data.message || `No timetable found for ${className}.`);
      }
    } catch (error) {
      console.error('Error fetching class timetable:', error);
      setLoading('Failed to load class timetable. Please try again.');
    }
  }

  async function loadTeachersCache() {
    if (teachersCache.length) return;
    const token = getToken();
    try {
      const response = await fetch(`${API_BASE_URL}/teachers`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      teachersCache = (data?.teachers || []).filter(t => t.isActive !== false);
    } catch (err) {
      console.error('Failed to load teachers for timetable edit:', err);
    }
  }

  function getSubjectOptions() {
    const subjects = new Set();
    teachersCache.forEach(t => {
      (t.subjects || []).forEach(s => {
        if (s.subject) subjects.add(s.subject);
      });
    });
    return Array.from(subjects).sort();
  }

  function closeEditModal() {
    const modal = document.getElementById('timetable-edit-modal');
    if (modal) modal.style.display = 'none';
  }

  async function saveSlot() {
    const modal = document.getElementById('timetable-edit-modal');
    if (!modal) return;

    const subject = document.getElementById('timetable-edit-subject').value;
    const teacherId = document.getElementById('timetable-edit-teacher').value;
    const className = modal.dataset.className;
    const day = modal.dataset.day;
    const lessonNumber = parseInt(modal.dataset.lessonNumber, 10);
    const startTime = modal.dataset.startTime;
    const endTime = modal.dataset.endTime;
    const slotId = modal.dataset.slotId;
    const token = getToken();

    const body = { day, lessonNumber, startTime, endTime, subject, teacher: teacherId || null };

    try {
      let url, method;
      if (slotId) {
        url = `${API_BASE_URL}/timetable/${encodeURIComponent(className)}/slots/${slotId}`;
        method = 'PUT';
      } else {
        url = `${API_BASE_URL}/timetable/${encodeURIComponent(className)}/slots`;
        method = 'POST';
      }
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || `Server error: ${response.status}`);
      }
      closeEditModal();
      loadAndRenderClassTimetable(className);
    } catch (err) {
      console.error('Error saving timetable slot:', err);
      alert('Could not save timetable slot: ' + err.message);
    }
  }

  function ensureEditModal() {
    let modal = document.getElementById('timetable-edit-modal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'timetable-edit-modal';
    modal.style.cssText = 'display:none;position:fixed;z-index:100000;left:0;top:0;width:100%;height:100%;overflow:auto;background:rgba(0,0,0,0.5);align-items:center;justify-content:center;';
    modal.innerHTML = `
      <div style="background:#fff;padding:20px;border-radius:8px;min-width:320px;max-width:90%;box-shadow:0 4px 20px rgba(0,0,0,0.3);">
        <h3 id="timetable-edit-title" style="margin-top:0;">Edit Slot</h3>
        <p id="timetable-edit-info" style="color:#666;font-size:0.9rem;"></p>
        <div style="margin-bottom:12px;">
          <label for="timetable-edit-subject" style="display:block;font-weight:600;margin-bottom:4px;">Subject</label>
          <select id="timetable-edit-subject" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:4px;">
            <option value="">-- Select Subject --</option>
          </select>
        </div>
        <div style="margin-bottom:12px;">
          <label for="timetable-edit-teacher" style="display:block;font-weight:600;margin-bottom:4px;">Teacher</label>
          <select id="timetable-edit-teacher" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:4px;">
            <option value="">-- Select Teacher --</option>
          </select>
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end;">
          <button type="button" id="timetable-edit-cancel" class="btn">Cancel</button>
          <button type="button" id="timetable-edit-save" class="btn btn-primary">Save</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('timetable-edit-cancel').addEventListener('click', closeEditModal);
    document.getElementById('timetable-edit-save').addEventListener('click', saveSlot);

    return modal;
  }

  function openEditModal(slot, day, period, className) {
    if (!className) return;
    const modal = ensureEditModal();
    const title = document.getElementById('timetable-edit-title');
    const info = document.getElementById('timetable-edit-info');
    title.textContent = slot ? 'Edit Timetable Slot' : 'New Timetable Slot';
    info.textContent = `${className} — ${day}, ${period.label} (${period.startTime}-${period.endTime})`;

    loadTeachersCache().then(() => {
      const subjectSelect = document.getElementById('timetable-edit-subject');
      const teacherSelect = document.getElementById('timetable-edit-teacher');
      const subjectOptions = getSubjectOptions();
      const placeholderSubject = slot ? (slot.subject || '') : '';

      subjectSelect.innerHTML = '<option value="">-- Select Subject --</option>' +
        subjectOptions.map(s => `<option value="${s}" ${s === placeholderSubject ? 'selected' : ''}>${s}</option>`).join('');

      if (placeholderSubject && !subjectOptions.includes(placeholderSubject)) {
        const opt = document.createElement('option');
        opt.value = placeholderSubject;
        opt.textContent = placeholderSubject;
        opt.selected = true;
        subjectSelect.appendChild(opt);
      }

      const currentTeacherId = slot && slot.teacher ? String(slot.teacher._id || slot.teacher) : '';
      teacherSelect.innerHTML = '<option value="">-- Select Teacher --</option>' +
        teachersCache.map(t => {
          const teacherUserId = String(t.user || t._id);
          const selected = currentTeacherId === teacherUserId ? 'selected' : '';
          return `<option value="${t.user || t._id}" ${selected}>${t.name}</option>`;
        }).join('');

      modal.dataset.className = className;
      modal.dataset.day = day;
      modal.dataset.lessonNumber = period.lessonNumber;
      modal.dataset.startTime = period.startTime;
      modal.dataset.endTime = period.endTime;
      modal.dataset.slotId = slot ? slot._id : '';
      modal.style.display = 'flex';
    });
  }

  function showToggle() {
    const toggle = document.getElementById('timetable-view-toggle');
    if (toggle) toggle.style.display = 'flex';
  }

  function setActiveButton(activeBtn, inactiveBtn) {
    if (activeBtn) {
      activeBtn.classList.add('btn-primary');
      activeBtn.style.background = '#007bff';
      activeBtn.style.color = '#fff';
    }
    if (inactiveBtn) {
      inactiveBtn.classList.remove('btn-primary');
      inactiveBtn.style.background = '';
      inactiveBtn.style.color = '';
    }
  }

  function attachEvents() {
    const timetableTab = document.querySelector('.tab-link[data-tab="timetable-section"]');
    const myTimetableBtn = document.getElementById('btn-my-timetable');
    const classTimetableBtn = document.getElementById('btn-class-timetable');
    const classSelect = document.getElementById('timetable-class-select');
    const classSelector = document.getElementById('timetable-class-selector');

    const teacher = isTeacher();
    let currentMode = 'class';

    if (teacher) {
      showToggle();
      currentMode = 'teacher';
      setActiveButton(myTimetableBtn, classTimetableBtn);
      if (classSelector) classSelector.style.opacity = '0.5';
      loadAndRenderTeacherTimetable();
    } else if (classSelect) {
      if (classSelector) classSelector.style.opacity = '1';
      if (classSelect.value) {
        loadAndRenderClassTimetable(classSelect.value);
      } else {
        setLoading('Select a class to view the timetable.');
      }
    }

    if (myTimetableBtn) {
      myTimetableBtn.addEventListener('click', () => {
        currentMode = 'teacher';
        setActiveButton(myTimetableBtn, classTimetableBtn);
        if (classSelector) classSelector.style.opacity = '0.5';
        loadAndRenderTeacherTimetable();
      });
    }

    if (classTimetableBtn) {
      classTimetableBtn.addEventListener('click', () => {
        currentMode = 'class';
        setActiveButton(classTimetableBtn, myTimetableBtn);
        if (classSelector) classSelector.style.opacity = '1';
        if (classSelect && classSelect.value) {
          loadAndRenderClassTimetable(classSelect.value);
        } else {
          setLoading('Select a class from the dropdown.');
        }
      });
    }

    if (classSelect) {
      classSelect.addEventListener('change', () => {
        if (currentMode === 'class' && classSelect.value) {
          loadAndRenderClassTimetable(classSelect.value);
        }
      });
    }

    if (timetableTab) {
      timetableTab.addEventListener('click', () => {
        setTimeout(() => {
          if (isTeacher() && currentMode === 'teacher') {
            loadAndRenderTeacherTimetable();
          } else if (classSelect && classSelect.value) {
            loadAndRenderClassTimetable(classSelect.value);
          } else if (isTeacher()) {
            loadAndRenderTeacherTimetable();
          }
        }, 100);
      });
    }
  }

  document.addEventListener('DOMContentLoaded', attachEvents);
})();
