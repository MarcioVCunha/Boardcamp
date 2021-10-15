import express, { query } from 'express';
import cors from 'cors';
import pg from 'pg';

const { Pool } = pg;
const app = express();
app.use(express.json());
app.use(cors());

const user = 'bootcamp_role';
const password = 'senha_super_hiper_ultra_secreta_do_role_do_bootcamp';
const host = 'localhost';
const port = 5432;
const database = 'boardcamp';

const connection = new Pool({
    user,
    password,
    host,
    port,
    database
});

app.get('/categories', async (req, res) => {
    try {
        const query = await connection.query('SELECT * FROM categories');
        res.send(query.rows);
    } catch (error) {
        console.log(error.message);
    }
});

app.post('/categories', async (req, res) => {
    const { name } = req.body;

    if (name.length === 0) {
        res.sendStatus(400);
    } else {
        try {
            const nameCheck = await connection.query(`SELECT name FROM categories WHERE name = $1`, [name]);
            if (nameCheck.rowCount !== 0) {
                res.sendStatus(409);
            } else {
                await connection.query(`INSERT INTO categories (name) VALUES ($1)`, [name]);
                res.sendStatus(201);
            }
        } catch (error) {
            console.log(error.message);
        }
    }
})

app.listen(4000);