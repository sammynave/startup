
CREATE TABLE IF NOT EXISTS todos (id PRIMARY KEY NOT NULL, content, complete);
SELECT crsql_as_crr('todos');
CREATE TABLE IF NOT EXISTS todonts (id PRIMARY KEY NOT NULL, content, complete);
SELECT crsql_as_crr('todonts');
