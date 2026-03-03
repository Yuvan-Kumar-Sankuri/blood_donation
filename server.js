const express = require('express');
const oracledb = require('oracledb');
const cors = require('cors');
const multer = require('multer'); // 1. Import Multer
const path = require('path');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// 2. Allow the "uploads" folder to be seen by the browser
app.use('/uploads', express.static('uploads'));

// 3. Configure where to save the files
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/') // Save to 'uploads' folder
    },
    filename: function (req, file, cb) {
        // Save as: timestamp + original extension (e.g., 123456789.jpg)
        cb(null, Date.now() + path.extname(file.originalname))
    }
});

const upload = multer({ storage: storage });

// Database Connection Config
const dbConfig = {
    user: "system",
    password: "190505", // <--- CHANGE THIS TO YOUR PASSWORD
    connectString: "localhost:1521/xe"
};

async function init() {
    try {
        await oracledb.createPool(dbConfig);
        console.log("✅ Oracle DB Connected");
    } catch (err) {
        console.error("❌ DB Error:", err);
    }
}
init();

// --- POST ROUTE: Register Donor (Now handles Files!) ---
// 'upload.single' tells it to look for a file named 'certificate'
app.post('/donate', upload.single('certificate'), async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection();
        
        // req.body has the text data
        const { name, age, phone, city, group, lat, lng } = req.body;
        
        // req.file has the file data (if uploaded)
        const certificate = req.file ? req.file.filename : null;

        const sql = `INSERT INTO DONORS 
                     (NAME, AGE, PHONE, CITY, BLOOD_GROUP, LATITUDE, LONGITUDE, CERTIFICATE) 
                     VALUES (:1, :2, :3, :4, :5, :6, :7, :8)`;

        await connection.execute(sql, [name, age, phone, city, group, lat, lng, certificate], { autoCommit: true });

        res.send("✅ Registration Successful!");
    } catch (err) {
        console.error(err);
        res.status(500).send("❌ Database Error: " + err.message);
    } finally {
        if (connection) await connection.close();
    }
});

// --- GET ROUTE: Get Donors ---
app.get('/donors', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection();
        // We select * (all columns) so we get the CERTIFICATE column too
        const result = await connection.execute(
            `SELECT * FROM DONORS`, 
            [], 
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).send(err.message);
    } finally {
        if (connection) await connection.close();
    }
});

app.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
});