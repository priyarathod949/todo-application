const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "todoApplication.db");
let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    // Create the "todo" table if it doesn't exist
    await db.exec(`
      CREATE TABLE IF NOT EXISTS todo (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        todo TEXT,
        priority TEXT,
        status TEXT
      );
    `);

    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

// API 1: Get all todos based on status, priority, or search query
app.get("/todos/", async (request, response) => {
  let { search_q = "", priority, status } = request.query;
  search_q = search_q.toLowerCase();

  let getTodosQuery = `
    SELECT *
    FROM todo
    WHERE lower(todo) LIKE '%${search_q}%'
  `;

  if (priority) {
    getTodosQuery += ` AND priority = '${priority}'`;
  }

  if (status) {
    getTodosQuery += ` AND status = '${status}'`;
  }

  try {
    const data = await db.all(getTodosQuery);
    response.send(data);
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    response.status(500).send("Internal Server Error");
  }
});

// API 2: Get a specific todo based on todo ID
app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;

  try {
    const data = await db.get(`
      SELECT *
      FROM todo
      WHERE id = ${todoId}
    `);

    if (data) {
      response.send(data);
    } else {
      response.status(404).send("Todo not found");
    }
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    response.status(500).send("Internal Server Error");
  }
});

// API 3: Create a new todo
app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status } = request.body;

  try {
    await db.run(`
      INSERT INTO todo (id, todo, priority, status)
      VALUES (${id}, '${todo}', '${priority}', '${status}')
    `);

    response.send("Todo Successfully Added");
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    response.status(500).send("Internal Server Error");
  }
});

// API 4: Update a specific todo based on todo ID
app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const { todo, priority, status } = request.body;

  try {
    let updateQuery = "UPDATE todo SET";

    if (todo) {
      updateQuery += ` todo = '${todo}',`;
    }

    if (priority) {
      updateQuery += ` priority = '${priority}',`;
    }

    if (status) {
      updateQuery += ` status = '${status}',`;
    }

    // Remove trailing comma and add WHERE clause
    updateQuery = updateQuery.slice(0, -1);
    updateQuery += ` WHERE id = ${todoId}`;

    await db.run(updateQuery);

    if (status) {
      response.send("Status Updated");
    } else if (priority) {
      response.send("Priority Updated");
    } else if (todo) {
      response.send("Todo Updated");
    } else {
      response.status(400).send("Bad Request");
    }
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    response.status(500).send("Internal Server Error");
  }
});

// API 5: Delete a todo based on todo ID
app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;

  try {
    await db.run(`
      DELETE FROM todo
      WHERE id = ${todoId}
    `);

    response.send("Todo Deleted");
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    response.status(500).send("Internal Server Error");
  }
});

module.exports = app;
