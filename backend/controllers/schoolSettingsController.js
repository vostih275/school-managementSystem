const SchoolSettings = require('../models/SchoolSettings');

// GET /api/settings/contact
exports.getSettings = async (req, res) => {
  try {
    let settings = await SchoolSettings.findOne().sort({ createdAt: -1 });
    if (!settings) {
      settings = await SchoolSettings.create({});
    }
    res.json({ success: true, settings });
  } catch (err) {
    console.error('Error fetching school settings:', err);
    res.status(500).json({ success: false, message: 'Server error fetching settings' });
  }
};

// GET /api/settings/contact
exports.getContact = async (req, res) => {
  try {
    let settings = await SchoolSettings.findOne().sort({ createdAt: -1 });
    if (!settings) {
      settings = await SchoolSettings.create({});
    }
    res.json({
      success: true,
      contact: {
        schoolName: settings.schoolName,
        primaryEmail: settings.primaryEmail,
        juniorSchoolEmail: settings.juniorSchoolEmail,
        schoolPhone: settings.schoolPhone,
        schoolAddress: settings.schoolAddress
      }
    });
  } catch (err) {
    console.error('Error fetching contact info:', err);
    res.status(500).json({ success: false, message: 'Server error fetching contact info' });
  }
};

// PUT /api/settings/contact
exports.updateSettings = async (req, res) => {
  try {
    const update = req.body;
    let settings = await SchoolSettings.findOne().sort({ createdAt: -1 });
    if (!settings) {
      settings = new SchoolSettings(update);
      await settings.save();
    } else {
      Object.keys(update).forEach(key => {
        if (update[key] !== undefined) settings[key] = update[key];
      });
      await settings.save();
    }
    res.json({ success: true, settings });
  } catch (err) {
    console.error('Error updating school settings:', err);
    res.status(500).json({ success: false, message: 'Server error updating settings' });
  }
};
