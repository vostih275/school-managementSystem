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
          const slot = slotMap[key];
          if (slot) {
            if (mode === 'teacher') {
              content = `<b>${slot.subject || slot.activity || ''}</b>`;
              if (slot.class) {
                content += ` <br><small>(${slot.class})</small>`;
              }
              title = `${slot.class || ''} - ${slot.subject || slot.activity || ''}`;
            } else {
              content = `<b>${slot.subject || slot.activity || ''}</b>`;
              if (slot.teacher && typeof slot.teacher === 'string') {
                content += ` <br><small>(${slot.teacher})</small>`;
              } else if (slot.teacher?.name) {
                content += ` <br><small>(${slot.teacher.name})</small>`;
              }
              if (slot.class) {
                title = slot.class;
              }
            }
            const firstWord = (slot.subject || slot.activity || '').split(' ')[0].toLowerCase();
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
