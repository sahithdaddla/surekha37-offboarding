CREATE TABLE submissions (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(7),
    full_name VARCHAR(30),
    email VARCHAR(40),
    department VARCHAR(50),
    designation VARCHAR(30),
    joining_date DATE,
    last_day DATE,
    laptop VARCHAR(30),
    laptop_condition VARCHAR(20),
    access_card VARCHAR(12),
    current_projects TEXT,
    pending_tasks TEXT,
    reason_for_leaving VARCHAR(50),
    overall_experience INTEGER,
    feedback TEXT,
    status VARCHAR(20) DEFAULT 'Pending',
    submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE INDEX idx_employee_id ON submissions (employee_id);
CREATE INDEX idx_full_name ON submissions (full_name);
CREATE INDEX idx_status ON submissions (status);
