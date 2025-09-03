CREATE TABLE IF NOT EXISTS course_tees (
    id text PRIMARY KEY,
    course_id text NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    name text NOT NULL,
    slope integer NOT NULL,
    rating real NOT NULL
);

ALTER TABLE entries ADD COLUMN tee_id text REFERENCES course_tees(id);
