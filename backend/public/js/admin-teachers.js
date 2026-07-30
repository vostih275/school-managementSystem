document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/pages/login.html';
    return;
  }

  const API_BASE_URL = window.API_CONFIG?.API_BASE_URL || 'http://localhost:5000/api';
  const tableBody = document.querySelector('#teacher-table tbody');
  const alertBox = document.getElementById('alert');
  const teacherModal = document.getElementById('teacher-modal');
  const credentialsModal = document.getElementById('credentials-modal');
  const teacherForm = document.getElementById('teacher-form');
  const subjectsList = document.getElementById('subjects-list');

  let teachers = [];

  function showAlert(type, message) {
    alertBox.textContent = message;
    alertBox.className = `alert ${type}`;
    alertBox.style.display = 'block';
    setTimeout(() => { alertBox.style.display = 'none'; }, 4000);
  }

  function authHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  async function loadTeachers() {
    try {
      const res = await fetch(`${API_BASE_URL}/teachers`, { headers: authHeaders() });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      teachers = data.teachers;
      renderTeachers();
    } catch (err) {
      showAlert('error', err.message);
    }
  }

  function formatSubjects(subs) {
    if (!subs || !subs.length) return '-';
    return subs.map(s => `<span class="badge">${s.class} ${s.subject}${s.isCoTeacher ? ' (Co)' : ''}</span>`).join('');
  }

  function renderTeachers() {
    tableBody.innerHTML = '';
    teachers.forEach(t => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${t.name}</td>
        <td>${t.email || '-'}</td>
        <td>${t.phone || '-'}</td>
        <td>${t.classTeacher || '-'}</td>
        <td>${formatSubjects(t.subjects)}</td>
        <td class="actions">
          <button class="btn btn-primary" data-edit="${t._id}">Edit</button>
          <button class="btn btn-danger" data-delete="${t._id}">Delete</button>
        </td>
      `;
      tableBody.appendChild(tr);
    });
  }

  function stripTitles(name) {
    return name.replace(/^(Mr|Mrs|Mdm|Ms|Dr|Prof)\.?\s*/i, '').trim();
  }

  function openTeacherModal(teacher = null) {
    document.getElementById('teacher-id').value = teacher ? teacher._id : '';
    document.getElementById('modal-title').textContent = teacher ? 'Edit Teacher' : 'Add Teacher';
    document.getElementById('first-name').value = '';
    document.getElementById('last-name').value = '';
    document.getElementById('phone').value = teacher ? teacher.phone || '' : '';
    document.getElementById('class-teacher').value = teacher ? teacher.classTeacher || '' : '';
    subjectsList.innerHTML = '';

    if (teacher) {
      const clean = stripTitles(teacher.name);
      const parts = clean.split(/\s+/);
      document.getElementById('first-name').value = parts[0] || '';
      document.getElementById('last-name').value = parts.slice(1).join(' ') || '';
      if (teacher.subjects) {
        teacher.subjects.forEach(s => addSubjectRow(s));
      }
    }

    teacherModal.classList.add('active');
  }

  function closeModal(id) {
    document.getElementById(id).classList.remove('active');
  }

  function addSubjectRow(subject = {}) {
    const div = document.createElement('div');
    div.className = 'subject-row';
    div.innerHTML = `
      <select class="subject-class" required>
        <option value="Grade 7" ${subject.class === 'Grade 7' ? 'selected' : ''}>Grade 7</option>
        <option value="Grade 8" ${subject.class === 'Grade 8' ? 'selected' : ''}>Grade 8</option>
        <option value="Grade 9" ${subject.class === 'Grade 9' ? 'selected' : ''}>Grade 9</option>
      </select>
      <input type="text" class="subject-name" placeholder="Subject" value="${subject.subject || ''}" required />
      <label><input type="checkbox" class="subject-co" ${subject.isCoTeacher ? 'checked' : ''} /> Co-teacher</label>
      <button type="button" class="btn btn-danger remove-subject">&times;</button>
    `;
    div.querySelector('.remove-subject').addEventListener('click', () => div.remove());
    subjectsList.appendChild(div);
  }

  async function saveTeacher(e) {
    e.preventDefault();
    const id = document.getElementById('teacher-id').value;
    const first = document.getElementById('first-name').value.trim();
    const last = document.getElementById('last-name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const classTeacher = document.getElementById('class-teacher').value;

    const name = last ? `${first} ${last}` : first;
    const subjects = [];
    document.querySelectorAll('.subject-row').forEach(row => {
      const cls = row.querySelector('.subject-class').value;
      const subject = row.querySelector('.subject-name').value.trim();
      const isCoTeacher = row.querySelector('.subject-co').checked;
      if (subject) subjects.push({ class: cls, subject, isCoTeacher });
    });

    const payload = { name, phone, classTeacher, subjects };
    const url = id ? `${API_BASE_URL}/teachers/${id}` : `${API_BASE_URL}/teachers`;
    const method = id ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      closeModal('teacher-modal');
      await loadTeachers();

      if (!id && data.credentials) {
        document.getElementById('cred-email').textContent = data.credentials.email;
        document.getElementById('cred-password').textContent = data.credentials.password;
        credentialsModal.classList.add('active');
      } else {
        showAlert('success', 'Teacher saved successfully.');
      }
    } catch (err) {
      showAlert('error', err.message);
    }
  }

  async function deleteTeacher(id) {
    if (!confirm('Are you sure you want to delete this teacher record?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/teachers/${id}`, { method: 'DELETE', headers: authHeaders() });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      showAlert('success', 'Teacher deleted.');
      await loadTeachers();
    } catch (err) {
      showAlert('error', err.message);
    }
  }

  document.getElementById('btn-add-teacher').addEventListener('click', () => openTeacherModal());
  document.getElementById('btn-add-subject').addEventListener('click', () => addSubjectRow());
  teacherForm.addEventListener('submit', saveTeacher);

  tableBody.addEventListener('click', e => {
    const editId = e.target.dataset.edit;
    const deleteId = e.target.dataset.delete;
    if (editId) {
      const t = teachers.find(x => x._id === editId);
      if (t) openTeacherModal(t);
    }
    if (deleteId) deleteTeacher(deleteId);
  });

  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.close));
  });

  document.getElementById('btn-copy-creds').addEventListener('click', () => {
    const text = `Email: ${document.getElementById('cred-email').textContent}\nPassword: ${document.getElementById('cred-password').textContent}`;
    navigator.clipboard.writeText(text).then(() => {
      showAlert('success', 'Credentials copied to clipboard.');
    });
  });

  loadTeachers();
});
