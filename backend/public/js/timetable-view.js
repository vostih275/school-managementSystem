// Timetable view integration: load the selected grade's timetable from the API
// and render the 40-minute lesson grid with Friday PPI and 4-5 PM daily activities.
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

  async function loadAndRenderTimetable(className) {
    const timetableBody = document.querySelector('.timetable-body');
    if (!timetableBody) {
      console.error('Timetable body element not found');
      return;
    }

    timetableBody.innerHTML = '<div style="padding:20px;text-align:center;">Loading timetable...</div>';

    const token = localStorage.getItem('token');
    let slots = [];

    try {
      const response = await fetch(`${API_BASE_URL}/timetable/${encodeURIComponent(className)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success && Array.isArray(data.slots)) {
        slots = data.slots;
      }
    } catch (error) {
      console.error('Error fetching timetable:', error);
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

        if (period.lessonNumber === 1 && day === 'Friday') {
          content = 'PPI';
          cssClass = 'class-ppi';
          td.style.background = '#fff3e0';
        } else if (period.lessonNumber === 11) {
          content = DAILY_ACTIVITIES[day] || '';
          cssClass = 'class-activity';
          td.style.background = '#e8f5e9';
        } else {
          const key = `${period.lessonNumber}_${day}`;
          const slot = slotMap[key];
          if (slot) {
            content = slot.subject || slot.activity || '';
            if (slot.teacher && typeof slot.teacher === 'string' && !content.toLowerCase().includes('remedial')) {
              content += ` <br><small>(${slot.teacher})</small>`;
            }
            const subject = content.split(' ')[0].toLowerCase();
            cssClass = `class-${subject}`;
          } else if (period.lessonNumber === 10) {
            content = 'Remedials';
          }
        }

        if (content) {
          const div = document.createElement('div');
          div.className = `class-slot ${cssClass}`.trim();
          div.innerHTML = content;
          div.title = `${day} ${period.startTime}-${period.endTime}: ${content.replace(/<[^>]+>/g, '')}`;
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

  function tryRender() {
    const classSelect = document.getElementById('class-select');
    const className = classSelect ? classSelect.value : '';
    if (!className) {
      const timetableBody = document.querySelector('.timetable-body');
      if (timetableBody) {
        timetableBody.innerHTML = '<div style="padding:20px;text-align:center;">Select a class to view the timetable.</div>';
      }
      return;
    }
    loadAndRenderTimetable(className);
  }

  document.addEventListener('DOMContentLoaded', () => {
    const timetableTab = document.querySelector('.tab-link[data-tab="timetable-section"]');
    if (timetableTab) {
      timetableTab.addEventListener('click', () => {
        setTimeout(tryRender, 100);
      });
    }

    const classSelect = document.getElementById('class-select');
    if (classSelect) {
      classSelect.addEventListener('change', () => {
        const section = document.getElementById('timetable-section');
        if (section && section.style.display !== 'none') {
          tryRender();
        }
      });
    }
  });
})();
