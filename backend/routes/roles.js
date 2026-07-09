const express = require('express');
const { getRoles, createRole, updateRole, deleteRole, bulkDeleteRoles } = require('../controllers/roleController');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

// GET /api/roles - list roles with filtering (secured)
router.get('/', protect, authorize('admin'), getRoles);

// POST /api/roles - create a new role (secured)
router.post('/', protect, authorize('admin'), createRole);

// PUT /api/roles/:id - update a role (secured)
router.put('/:id', protect, authorize('admin'), updateRole);

// DELETE /api/roles/:id - delete a role (secured)
router.delete('/:id', protect, authorize('admin'), deleteRole);

// DELETE /api/roles - bulk delete roles (secured)
router.delete('/', protect, authorize('admin'), bulkDeleteRoles);

module.exports = router;
