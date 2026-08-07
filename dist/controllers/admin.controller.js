import jwt from 'jsonwebtoken';
const getAdminEmail = () => process.env.ADMIN_EMAIL || 'admin@hitianinside.org';
const getAdminPassword = () => process.env.ADMIN_PASSWORD || 'admin123';
const getJwtSecret = () => process.env.JWT_SECRET || 'hitian_secret_key_2026';
export const adminLogin = (req, res) => {
    try {
        const { email, password } = req.body;
        const targetEmail = getAdminEmail();
        const targetPassword = getAdminPassword();
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Both Admin Email and Password are required.'
            });
        }
        if (email.trim().toLowerCase() !== targetEmail.trim().toLowerCase() || password !== targetPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid Admin Email or Password'
            });
        }
        const token = jwt.sign({ role: 'admin', email: targetEmail, authTime: new Date().toISOString() }, getJwtSecret(), { expiresIn: '24h' });
        return res.status(200).json({
            success: true,
            message: 'Admin Authentication Successful',
            token
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Login failed',
            error: error.message
        });
    }
};
