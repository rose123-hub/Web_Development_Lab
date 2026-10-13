const express = require("express");
const mongoose = require("mongoose");

const app = express();
app.use(express.json());

mongoose.connect("mongodb://127.0.0.1:27017/studentdb")
    .then(() => console.log("MongoDB Connected Successfully"))
    .catch((error) => console.log("Database Connection Error:", error));

const studentSchema = new mongoose.Schema({
    regNo: { type: String, required: true },
    name: { type: String, required: true },
    department: { type: String, required: true },
    email: { type: String },
    cgpa: { type: Number }
});

const Student = mongoose.model("Student", studentSchema);

app.get("/", (req, res) => {
    res.send("NodeJS MongoDB Application is Running");
});

app.post("/students", async (req, res) => {
    try {
        const student = new Student(req.body);
        const savedStudent = await student.save();
        res.status(201).json(savedStudent);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.get("/students", async (req, res) => {
    try {
        const students = await Student.find();
        res.json(students);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.get("/students/:regNo", async (req, res) => {
    try {
        const student = await Student.findOne({ regNo: req.params.regNo });
        if (!student) return res.status(404).json({ message: "Student not found" });
        res.json(student);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.put("/students/:regNo", async (req, res) => {
    try {
        const student = await Student.findOneAndUpdate(
            { regNo: req.params.regNo },
            req.body,
            { new: true }
        );
        if (!student) return res.status(404).json({ message: "Student not found" });
        res.json(student);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.delete("/students/:regNo", async (req, res) => {
    try {
        const student = await Student.findOneAndDelete({ regNo: req.params.regNo });
        if (!student) return res.status(404).json({ message: "Student not found" });
        res.json({ message: "Student deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.listen(3000, () => {
    console.log("Server running at http://localhost:3000");
});