const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3601;

// PostgreSQL connection
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432
});

// Middleware
app.use(cors());
app.use(express.json());

// Error handling middleware
const errorHandler = (error, req, res, next) => {
    console.error('Server Error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
};

// Submit offboarding form
app.post('/api/submissions', async (req, res, next) => {
    try {
        const {
            employeeId, fullName, email, department, designation, joiningDate, lastDay,
            laptop, laptopCondition, accessCard, currentProjects, pendingTasks,
            reasonForLeaving, overallExperience, feedback
        } = req.body;

        // Validate required fields
        if (!employeeId || !fullName || !email || !department || !designation ||
            !joiningDate || !lastDay || !laptop || !laptopCondition || !accessCard ||
            !currentProjects || !pendingTasks || !reasonForLeaving || !overallExperience) {
            return res.status(400).json({ error: 'All required fields must be provided' });
        }

        // Validate date constraints
        const joining = new Date(joiningDate);
        const last = new Date(lastDay);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const oneMonthFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
        const minLastDay = new Date(joining.getTime() + 90 * 24 * 60 * 60 * 1000);

        if (joining < new Date('1970-01-01') || joining > today) {
            return res.status(400).json({ error: 'Invalid joining date' });
        }
        if (last < today || last > oneMonthFromNow || last <= joining || last < minLastDay) {
            return res.status(400).json({ error: 'Invalid last working day' });
        }

        const query = `
            INSERT INTO submissions (
                employee_id, full_name, email, department, designation, joining_date, last_day,
                laptop, laptop_condition, access_card, current_projects, pending_tasks,
                reason_for_leaving, overall_experience, feedback
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING *
        `;
        const values = [
            employeeId, fullName, email, department, designation, joiningDate, lastDay,
            laptop, laptopCondition, accessCard, currentProjects, pendingTasks,
            reasonForLeaving, parseInt(overallExperience), feedback || null
        ];

        const result = await pool.query(query, values);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') { // Unique constraint violation
            if (error.constraint.includes('employee_id')) {
                return res.status(400).json({ error: 'Employee ID already exists' });
            } else if (error.constraint.includes('email')) {
                return res.status(400).json({ error: 'Email already exists' });
            }
        }
        next(error);
    }
});

// Get all submissions
app.get('/api/submissions', async (req, res, next) => {
    try {
        const result = await pool.query('SELECT * FROM submissions ORDER BY submission_date DESC');
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

// Get submission by ID
app.get('/api/submissions/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM submissions WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Submission not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
});

// Search submissions
app.get('/api/submissions/search/:term', async (req, res, next) => {
    try {
        const { term } = req.params;
        const searchTerm = `%${term}%`;
        const result = await pool.query(
            'SELECT * FROM submissions WHERE LOWER(employee_id) LIKE LOWER($1) OR LOWER(full_name) LIKE LOWER($1) ORDER BY submission_date DESC',
            [searchTerm]
        );
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

// Update submission status
app.put('/api/submissions/:id/status', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!['Approved', 'Rejected'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        const result = await pool.query('UPDATE submissions SET status = $1 WHERE id = $2 RETURNING *', [status, id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Submission not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
});

// Delete submission
app.delete('/api/submissions/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM submissions WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Submission not found' });
        }
        res.json({ message: 'Submission deleted successfully' });
    } catch (error) {
        next(error);
    }
});

// Delete multiple submissions
app.post('/api/submissions/delete', async (req, res, next) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'No IDs provided' });
        }
        const result = await pool.query('DELETE FROM submissions WHERE id = ANY($1::int[]) RETURNING id', [ids]);
        res.json({ message: `${result.rowCount} submissions deleted successfully` });
    } catch (error) {
        next(error);
    }
});

// Clear all submissions
app.delete('/api/submissions', async (req, res, next) => {
    try {
        await pool.query('DELETE FROM submissions');
        res.json({ message: 'All submissions cleared successfully' });
    } catch (error) {
        next(error);
    }
});

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});