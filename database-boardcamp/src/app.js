import express, { query } from 'express';
import cors from 'cors';
import pg from 'pg';
import joi from 'joi';

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
        const query = await connection.query('SELECT * FROM categories;');
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
            const nameCheck = await connection.query(`SELECT name FROM categories WHERE name = $1;`, [name]);
            if (nameCheck.rowCount !== 0) {
                res.sendStatus(409);
            } else {
                await connection.query(`INSERT INTO categories (name) VALUES ($1);`, [name]);
                res.sendStatus(201);
            }
        } catch (error) {
            console.log(error.message);
        }
    }
})

app.get('/games', async (req, res) => {
    try {
        const query = await connection.query(`
            SELECT 
                games.id, 
                games.name, 
                games.image, 
                games."stockTotal", 
                games."categoryId", 
                games."pricePerDay", 
                categories.name AS "categoryName" 
            FROM games JOIN categories ON games."categoryId"=categories.id;`)
        res.send(query.rows);
    } catch (error) {
        console.log(error.message);
    }
})

app.post('/games', async (req, res) => {
    const { name, image, stockTotal, pricePerDay, categoryId } = req.body;

    const gameSchema = joi.object({
        name: joi.string().required(),
        image: joi.string().uri().required(),
        stockTotal: joi.number().integer().min(1).required(),
        pricePerDay: joi.number().integer().min(1).required(),
        categoryId: joi.number().integer().min(1).required()
    });

    const gameSchemaValidation = gameSchema.validate({
        name,
        image,
        stockTotal,
        pricePerDay,
        categoryId
    })

    if (gameSchemaValidation.error !== undefined) {
        res.sendStatus(400);
    } else {
        const nameCompare = await connection.query('SELECT name FROM games WHERE name = $1;', [name]);
        const isNameOk = nameCompare.rowCount === 0 ? true : false;

        if (isNameOk) {
            await connection.query('INSERT INTO games (name, image, "stockTotal", "categoryId", "pricePerDay") VALUES ($1, $2, $3, $4, $5);', [name, image, stockTotal, categoryId, pricePerDay]);
            res.sendStatus(201);
        } else {
            res.sendStatus(409);
        }
    }
})

app.listen(4000);