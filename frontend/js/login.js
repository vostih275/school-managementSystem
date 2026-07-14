// Helper function to get dashboard URL based on user role
function getDashboardURL(role) {
    // Ensure role is lowercase for consistent comparison
    const userRole = (role || '').toLowerCase();
    
    switch (userRole) {
        case 'admin':
            return '/pages/index.html';
        case 'teacher':
            return '/pages/teacher.html';
        case 'student':
            return '/pages/student.html';
        default:
            console.warn('Unknown role, redirecting to login');
            return '/pages/login.html';
    }
}

// Helper function to show error messages
function showError(message, elementId = 'error-message') {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        errorElement.style.color = 'red';
    }
}

// -----------------------------------------------------------------------
// First-time password reset form handler
// -----------------------------------------------------------------------
async function handlePasswordReset(e) {
    e.preventDefault();

    const identifier      = document.getElementById('reset-identifier')?.value?.trim();
    const tempPassword    = document.getElementById('reset-temp-password')?.value;
    const newPassword     = document.getElementById('reset-new-password')?.value;
    const confirmPassword = document.getElementById('reset-confirm-password')?.value;
    const errorEl         = document.getElementById('reset-error');
    const resetBtn        = document.getElementById('reset-btn');

    const showResetError = (msg) => {
        if (errorEl) { errorEl.textContent = msg; errorEl.style.display = 'block'; }
    };

    if (!identifier || !tempPassword || !newPassword || !confirmPassword) {
        return showResetError('Please fill in all fields.');
    }
    if (newPassword.length < 6) {
        return showResetError('New password must be at least 6 characters.');
    }
    if (newPassword !== confirmPassword) {
        return showResetError('New passwords do not match.');
    }

    if (resetBtn) { resetBtn.disabled = true; resetBtn.textContent = 'Setting password...'; }
    if (errorEl) errorEl.style.display = 'none';

    try {
        const AUTH_URL = (window.API_CONFIG && window.API_CONFIG.AUTH_URL)
            ? window.API_CONFIG.AUTH_URL
            : 'https://aic-school-system-c0j6.onrender.com/api/auth';

        const response = await fetch(`${AUTH_URL}/first-login-reset`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier, tempPassword, newPassword })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Password reset failed.');
        }

        // Reset succeeded — save token and redirect
        localStorage.setItem('token', data.token);
        if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
        const role = data.user?.role || data.role || 'student';
        window.location.href = getDashboardURL(role);

    } catch (error) {
        showResetError(error.message || 'Password reset failed. Please try again.');
    } finally {
        if (resetBtn) { resetBtn.disabled = false; resetBtn.textContent = 'Set Password & Login'; }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Form elements
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const resetForm = document.getElementById('reset-form');
    const showRegisterLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');
    const roleSelect = document.getElementById('role');
    const classGroup = document.getElementById('class-group');
    const formTitle = document.getElementById('form-title');

    // If the user arrived from the "requires password change" redirect,
    // show the reset form and pre-fill the stored email.
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('change-password') === 'true' && loginForm && resetForm) {
        loginForm.style.display = 'none';
        resetForm.style.display = 'block';
        if (formTitle) formTitle.textContent = 'Set Your Password';
        const pendingIdentifier = localStorage.getItem('pendingPasswordChangeIdentifier') || localStorage.getItem('pendingPasswordChangeEmail');
        if (pendingIdentifier) {
            const resetIdentifierInput = document.getElementById('reset-identifier');
            if (resetIdentifierInput) resetIdentifierInput.value = pendingIdentifier;
        }
    }

    // Wire first-time password reset form
    if (resetForm) {
        resetForm.addEventListener('submit', handlePasswordReset);
    }

    // Login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const identifier = document.getElementById('login-identifier')?.value?.trim();
            const password = document.getElementById('login-password')?.value;
            
            if (!identifier || !password) {
                showError('Please enter both identifier and password');
                return;
            }

            try {
                console.log('Attempting login with:', { identifier });
                const API_URL = (window.API_CONFIG || {}).AUTH_URL || `${window.API_CONFIG?.BASE_URL || 'https://aic-school-system-c0j6.onrender.com'}/api/auth`;
                const response = await fetch(`${API_URL}/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Origin': window.location.origin
                    },
                    body: JSON.stringify({ identifier, password }),
                    credentials: 'include'
                });
                
                console.log('Login response status:', response.status);
                let responseData = {};
                try {
                    responseData = await response.json();
                    console.log('Login response data:', responseData);
                } catch (e) {
                    console.error('Failed to parse login response:', e);
                    throw new Error('Invalid response from server');
                }
                
                // Handle requiresPasswordChange / forcePasswordReset regardless of HTTP status
                // so that 401/403 responses with this flag don't show a generic error.
                if (responseData.requiresPasswordChange === true || responseData.forcePasswordReset === true) {
                    console.log('First-time login: requiresPasswordChange detected');
                    // Store identifier (and user id if available) for the password-change page
                    localStorage.setItem('pendingPasswordChangeIdentifier', responseData.identifier || responseData.user?.email || responseData.user?.admissionNumber || identifier);
                    if (responseData.userId || (responseData.user && responseData.user.id)) {
                        localStorage.setItem('pendingPasswordChangeUserId', responseData.userId || responseData.user.id);
                    }
                    // Redirect to the password update page (reusing the login page's reset form)
                    window.location.href = '/pages/login.html?change-password=true';
                    return;
                }

                if (!response.ok) {
                    const errorMsg = responseData.msg || responseData.message || 'Login failed';
                    console.error('Login failed:', errorMsg);
                    throw new Error(errorMsg);
                }
                
                // Save token and user data
                if (responseData.token) {
                    console.log('Login successful, saving token and user data');
                    localStorage.setItem('token', responseData.token);
                    if (responseData.user) {
                        localStorage.setItem('user', JSON.stringify(responseData.user));
                        // Save studentId for dashboard scripts
                        if (responseData.user._id) {
                            localStorage.setItem('studentId', responseData.user._id);
                        }
                        if (responseData.user.admissionNumber) {
                            localStorage.setItem('admissionNumber', responseData.user.admissionNumber);
                        }
                    }
                    
                    // Redirect based on user role
                    const role = responseData.user?.role || 'student';
                    console.log('Redirecting to dashboard for role:', role);
                    window.location.href = getDashboardURL(role);
                } else {
                    console.error('No token in response:', responseData);
                    throw new Error('No authentication token received');
                }
                
            } catch (error) {
                console.error('Login error:', error);
                // Show error to user
                const errorMessage = error.message.includes('Failed to fetch') 
                    ? 'Unable to connect to server. Please check your connection.'
                    : error.message || 'Login failed. Please check your credentials and try again.';
                showError(errorMessage);
                
                // Clear password field on error
                const passwordField = document.getElementById('login-password');
                if (passwordField) passwordField.value = '';
            }
        });
    }

    // Toggle between login and register forms
    if (showRegisterLink) {
        showRegisterLink.addEventListener('click', function(e) {
            e.preventDefault();
            loginForm.style.display = 'none';
            registerForm.style.display = 'block';
            formTitle.textContent = 'Create Account';
            document.getElementById('error-message').textContent = '';
        });
    }

    if (showLoginLink) {
        showLoginLink.addEventListener('click', function(e) {
            e.preventDefault();
            registerForm.style.display = 'none';
            loginForm.style.display = 'block';
            formTitle.textContent = 'Login';
            document.getElementById('register-message').textContent = '';
        });
    }

    // Show/hide role-specific fields
    const registerEmailGroup = document.getElementById('register-email-group');
    const registerPhoneGroup = document.getElementById('register-phone-group');
    const registerEmailInput = document.getElementById('register-email');
    const registerPhoneInput = document.getElementById('register-phone');

    if (roleSelect && classGroup) {
        roleSelect.addEventListener('change', function() {
            if (this.value === 'student') {
                classGroup.style.display = 'block';
                const classInput = document.getElementById('class');
                if (classInput) classInput.setAttribute('required', 'required');
                // Email and phone are optional for students
                if (registerEmailGroup) registerEmailGroup.style.display = 'block';
                if (registerPhoneGroup) registerPhoneGroup.style.display = 'block';
                if (registerEmailInput) registerEmailInput.removeAttribute('required');
                if (registerPhoneInput) registerPhoneInput.removeAttribute('required');
            } else {
                classGroup.style.display = 'none';
                const classInput = document.getElementById('class');
                if (classInput) classInput.removeAttribute('required');
                // Email is required for non-students
                if (registerEmailGroup) registerEmailGroup.style.display = 'block';
                if (registerPhoneGroup) registerPhoneGroup.style.display = 'none';
                if (registerEmailInput) registerEmailInput.setAttribute('required', 'required');
                if (registerPhoneInput) registerPhoneInput.removeAttribute('required');
            }
        });
    }

    // Registration form submission
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const name = document.getElementById('register-name')?.value;
            const email = document.getElementById('register-email')?.value;
            const password = document.getElementById('register-password')?.value;
            const confirmPassword = document.getElementById('confirm-password')?.value;
            const role = document.getElementById('role')?.value;
            const studentClass = role === 'student' ? document.getElementById('class')?.value : '';
            
            // Basic validation
            if (password !== confirmPassword) {
                showError('Passwords do not match', 'register-message');
                return;
            }
            
            if (role === 'student' && !studentClass) {
                showError('Please select a class', 'register-message');
                return;
            }

            try {
                const API_BASE_URL = window.API_CONFIG?.API_BASE_URL || `${window.API_CONFIG?.BASE_URL || 'https://aic-school-system-c0j6.onrender.com'}/api`;
                const response = await fetch(`${API_BASE_URL}/auth/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        name: name,
                        email: email,
                        password: password,
                        role: role,
                        studentClass: role === 'student' ? studentClass : undefined
                    })
                });
                
                let data;
                try {
                    data = await response.json();
                } catch (e) {
                    console.error('Failed to parse response:', e);
                    throw new Error('Invalid response from server');
                }
                
                if (!response.ok) {
                    throw new Error(data.message || data.msg || 'Registration failed');
                }
                
                // Show success message
                const registerMessage = document.getElementById('register-message');
                if (registerMessage) {
                    registerMessage.textContent = 'Registration successful! Please login.';
                    registerMessage.style.color = 'green';
                    registerForm.reset();
                    
                    // Auto switch to login form after 2 seconds
                    setTimeout(() => {
                        registerForm.style.display = 'none';
                        loginForm.style.display = 'block';
                        formTitle.textContent = 'Login';
                        registerMessage.textContent = '';
                    }, 2000);
                }
                
            } catch (error) {
                console.error('Registration error:', error);
                showError(error.message || 'Registration failed. Please try again.', 'register-message');
            }
        });
    }
});