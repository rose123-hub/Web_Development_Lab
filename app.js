
const express = require("express");
const { MongoClient } = require("mongodb");
const path = require("path");
const crypto = require("crypto");
const { promisify } = require("util");

const app = express();
const PORT = 5000;

const client = new MongoClient(
    "mongodb://127.0.0.1:27017"
);

const scrypt = promisify(crypto.scrypt);

app.use(express.urlencoded({ extended: true }));

let usersCollection;

// Escape HTML to prevent user input from becoming HTML.
function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, function (ch) {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return entities[ch];
    });
}

// Display registered users in a table.
async function displayUsers(res) {
    const users = await usersCollection.find(
        {},
        { projection: { passwordHash: 0, salt: 0 } }
    ).toArray();

    let html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Registered Users</title>

        <style>
            body {
                font-family: Arial, sans-serif;
                background: #f2f2f2;
                margin: 25px;
            }

            h2 {
                text-align: center;
            }

            table {
                width: 100%;
                border-collapse: collapse;
                background: white;
            }

            th, td {
                border: 1px solid #ccc;
                padding: 10px;
                text-align: left;
            }

            th {
                background: #218838;
                color: white;
            }

            a {
                display: inline-block;
                margin-bottom: 15px;
            }
        </style>
    </head>

    <body>
        <h2>Registered Users</h2>
        <a href="/">Register Another User</a>

        <table>
            <tr>
                <th>Name</th>
                <th>Age</th>
                <th>Mobile</th>
                <th>Email</th>
                <th>Gender</th>
                <th>State</th>
                <th>Skills</th>
            </tr>
    `;

    users.forEach(function (user) {
        html += `
            <tr>
                <td>${escapeHTML(user.name)}</td>
                <td>${escapeHTML(user.age)}</td>
                <td>${escapeHTML(user.mobile)}</td>
                <td>${escapeHTML(user.email)}</td>
                <td>${escapeHTML(user.gender)}</td>
                <td>${escapeHTML(user.state)}</td>
                <td>${escapeHTML(user.skills)}</td>
            </tr>
        `;
    });

    html += `
        </table>
    </body>
    </html>
    `;

    res.send(html);
}

// Start the server after connecting to MongoDB.
async function startServer() {
    try {
        await client.connect();

        const database = client.db("RegistrationDB");
        usersCollection = database.collection("users");

        console.log("MongoDB Connected Successfully");

        // Display the registration form.
        app.get("/", function (req, res) {
            res.sendFile(
                path.join(__dirname, "home.html")
            );
        });

        // Handle registration form submission.
        app.post("/server", async function (req, res) {
            try {
                const data = req.body;

                const requiredFields = [
                    "name",
                    "password",
                    "age",
                    "mobile",
                    "email",
                    "gender",
                    "state",
                    "skills"
                ];

                for (const field of requiredFields) {
                    if (
                        typeof data[field] !== "string" ||
                        data[field].trim() === ""
                    ) {
                        return res.status(400).send(
                            "All fields are required."
                        );
                    }
                }

                const age = Number(data.age);

                if (!Number.isInteger(age) || age < 1) {
                    return res.status(400).send(
                        "Please enter a valid age."
                    );
                }

                if (!/^[0-9]{10}$/.test(data.mobile)) {
                    return res.status(400).send(
                        "Enter a valid 10-digit mobile number."
                    );
                }

                if (data.password.length < 8) {
                    return res.status(400).send(
                        "Password must contain at least 8 characters."
                    );
                }

                // Hash the password before saving it.
                const salt = crypto.randomBytes(16).toString("hex");

                const passwordHash = await scrypt(
                    data.password,
                    salt,
                    64
                );

                await usersCollection.insertOne({
                    name: data.name.trim(),
                    passwordHash: passwordHash.toString("hex"),
                    salt: salt,
                    age: age,
                    mobile: data.mobile.trim(),
                    email: data.email.trim(),
                    gender: data.gender,
                    state: data.state.trim(),
                    skills: data.skills.trim()
                });

                // Display the stored user details.
                await displayUsers(res);

            } catch (error) {
                console.error(error);
                res.status(500).send(
                    "Error saving user details."
                );
            }
        });

        // Display stored users when /server is opened directly.
        app.get("/server", async function (req, res) {
            try {
                await displayUsers(res);
            } catch (error) {
                console.error(error);
                res.status(500).send(
                    "Error retrieving user details."
                );
            }
        });

        app.listen(PORT, function () {
            console.log(
                "Server running at http://localhost:" + PORT
            );
        });

    } catch (error) {
        console.error(
            "Unable to connect to MongoDB:",
            error
        );
    }
}

startServer();
