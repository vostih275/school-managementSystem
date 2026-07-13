const facultyProfiles = {
  'akiru-lokeun': `
    <h2>Mrs. Akiru Lokeun</h2>
    <p><strong>Category:</strong> Primary TSC</p>
    <p><strong>Role:</strong> Primary TSC Teacher</p>
    <p>Mrs. Akiru Lokeun is a dedicated TSC educator committed to academic excellence and the holistic development of every learner.</p>
  `,
  'vanice-moraa': `
    <h2>Mrs. Vanice Moraa</h2>
    <p><strong>Category:</strong> Primary TSC</p>
    <p><strong>Role:</strong> Grade 1 Class Teacher</p>
    <p>Mrs. Vanice Moraa is a dedicated TSC educator committed to academic excellence and the holistic development of every learner.</p>
  `,
  'jemimmah-phanice': `
    <h2>Mrs. Jemimmah Phanice</h2>
    <p><strong>Category:</strong> Primary TSC</p>
    <p><strong>Role:</strong> Grade 2 Class Teacher</p>
    <p>Mrs. Jemimmah Phanice is a dedicated TSC educator committed to academic excellence and the holistic development of every learner.</p>
  `,
  'mercy-kiptanui': `
    <h2>Mrs. Mercy Kiptanui</h2>
    <p><strong>Category:</strong> Primary TSC</p>
    <p><strong>Role:</strong> Grade 3 Class Teacher</p>
    <p>Mrs. Mercy Kiptanui is a dedicated TSC educator committed to academic excellence and the holistic development of every learner.</p>
  `,
  'mark-ekai': `
    <h2>Mr. Mark Ekai</h2>
    <p><strong>Category:</strong> Primary TSC</p>
    <p><strong>Role:</strong> Grade 4 Class Teacher</p>
    <p>Mr. Mark Ekai is a dedicated TSC educator committed to academic excellence and the holistic development of every learner.</p>
  `,
  'yegon-eliud': `
    <h2>Mr. Yegon Eliud</h2>
    <p><strong>Category:</strong> Primary TSC</p>
    <p><strong>Role:</strong> Grade 5 Class Teacher</p>
    <p>Mr. Yegon Eliud is a dedicated TSC educator committed to academic excellence and the holistic development of every learner.</p>
  `,
  'evans-samia': `
    <h2>Mr. Evans Samia</h2>
    <p><strong>Category:</strong> Primary TSC</p>
    <p><strong>Role:</strong> Grade 6 Class Teacher</p>
    <p>Mr. Evans Samia is a dedicated TSC educator committed to academic excellence and the holistic development of every learner.</p>
  `,
  'wamboi-wintrizah': `
    <h2>Mrs. Wamboi Wintrizah</h2>
    <p><strong>Category:</strong> Primary TSC</p>
    <p><strong>Role:</strong> Primary TSC Teacher</p>
    <p>Mrs. Wamboi Wintrizah is a dedicated TSC educator committed to academic excellence and the holistic development of every learner.</p>
  `,
  'mercy-kiptanui-2': `
    <h2>Mrs. Mercy Kiptanui</h2>
    <p><strong>Category:</strong> Primary TSC</p>
    <p><strong>Role:</strong> Primary TSC Teacher</p>
    <p>Mrs. Mercy Kiptanui is a dedicated TSC educator committed to academic excellence and the holistic development of every learner.</p>
  `,
  'anorita-losidi': `
    <h2>Mrs. Anorita Losidi</h2>
    <p><strong>Category:</strong> Junior Secondary School (JSS) TSC</p>
    <p><strong>Role:</strong> Mathematics & Chemistry (Grade 7 Class Teacher)</p>
    <p>Mrs. Anorita Losidi is a dedicated TSC educator committed to academic excellence and the holistic development of every learner.</p>
  `,
  'clifford-loperito': `
    <h2>Mr. Clifford Loperito</h2>
    <p><strong>Category:</strong> Junior Secondary School (JSS) TSC</p>
    <p><strong>Role:</strong> English & Literature (Grade 8 Class Teacher)</p>
    <p>Mr. Clifford Loperito is a dedicated TSC educator committed to academic excellence and the holistic development of every learner.</p>
  `,
  'simiyu-kennedy': `
    <h2>Mr. Simiyu Kennedy</h2>
    <p><strong>Category:</strong> Junior Secondary School (JSS) TSC</p>
    <p><strong>Role:</strong> English & Literature (Grade 9 Class Teacher)</p>
    <p>Mr. Simiyu Kennedy is a dedicated TSC educator committed to academic excellence and the holistic development of every learner.</p>
  `,
  'mercy-kiprop': `
    <h2>Mrs. Mercy Kiprop</h2>
    <p><strong>Category:</strong> Junior Secondary School (JSS) TSC</p>
    <p><strong>Role:</strong> Kiswahili & Fasihi</p>
    <p>Mrs. Mercy Kiprop is a dedicated TSC educator committed to academic excellence and the holistic development of every learner.</p>
  `,
  'enold-onduo': `
    <h2>Mr. Enold Onduto</h2>
    <p><strong>Category:</strong> Junior Secondary School (JSS) TSC</p>
    <p><strong>Role:</strong> Mathematics & Physics</p>
    <p>Mr. Enold Onduto is a dedicated TSC educator committed to academic excellence and the holistic development of every learner.</p>
  `,
  'daisy-nasambu': `
    <h2>Mrs. Daisy Nasambu</h2>
    <p><strong>Category:</strong> Junior Secondary School (JSS) TSC</p>
    <p><strong>Role:</strong> English & Literature</p>
    <p>Mrs. Daisy Nasambu is a dedicated TSC educator committed to academic excellence and the holistic development of every learner.</p>
  `,
};

function openModal(id) {
  document.getElementById('modal-body').innerHTML = facultyProfiles[id];
  document.getElementById('faculty-modal').style.display = 'block';
}

function closeModal() {
  document.getElementById('faculty-modal').style.display = 'none';
}
