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
        const categoriesTable = await connection.query('SELECT * FROM categories;');
        res.send(categoriesTable.rows);
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
        const joinGamesCategory = await connection.query(`
            SELECT
                games.*,
                categories.name AS "categoryName"
            FROM games
                JOIN categories
                    ON games."categoryId"=categories.id;`)
        res.send(joinGamesCategory.rows);
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
            await connection.query(`
                INSERT INTO games (
                    name, 
                    image, 
                    "stockTotal", 
                    "categoryId", 
                    "pricePerDay"
                ) VALUES (
                    $1, 
                    $2, 
                    $3, 
                    $4, 
                    $5
                );`, [name, image, stockTotal, categoryId, pricePerDay]);
            res.sendStatus(201);
        } else {
            res.sendStatus(409);
        }
    }
})

app.get('/customers', async (req, res) => {
    try {
        const customersTable = await connection.query('SELECT * FROM customers;');
        res.send(customersTable.rows);
    } catch (error) {
        console.log(error.message);
    }
});

app.get('/customers/:id', async (req, res) => {
    const id = req.params['id'];
    try {
        const customersById = await connection.query('SELECT * FROM customers WHERE id = $1;', [id]);
        res.send(customersById.rows[0]);
    } catch (error) {
        console.log(error.message);
        res.sendStatus(404);
    }
})

const customerSchema = joi.object({
    name: joi.string().required(),
    phone: joi.string().regex(/^[0-9]{10,11}/).required(),
    cpf: joi.string().regex(/^[0-9]{11}/).required(),
    birthday: joi.string().regex(/^[0-9]{4}\-[0-9]{2}\-[0-9]{2}/)
})

app.post('/customers/', async (req, res) => {
    const { name, phone, cpf, birthday } = req.body;

    const customerSchemaValidation = customerSchema.validate({
        name,
        phone,
        cpf,
        birthday
    });

    const cpfCompare = await connection.query('SELECT cpf FROM customers WHERE cpf = $1;', [cpf]);
    const isCpfOk = cpfCompare.rowCount === 0 ? true : false;

    if (customerSchemaValidation.error !== undefined) {
        res.sendStatus(400);
    } else if (isCpfOk) {
        try {
            await connection.query(`
            INSERT INTO customers (
                name, 
                phone, 
                cpf, 
                birthday
            ) VALUES ( $1, $2, $3, $4)
        `, [name, phone, cpf, birthday])
            res.sendStatus(201);
        } catch (error) {
            console.log(error.message);
        }
    } else {
        res.sendStatus(409);
    }
})

app.put('/customers/:id', async (req, res) => {
    const { name, phone, cpf, birthday } = req.body;

    const customerSchemaValidation = customerSchema.validate({
        name,
        phone,
        cpf,
        birthday
    });

    if (customerSchemaValidation.error !== undefined) {
        res.sendStatus(400);
    } else {
        const cpfCompare = await connection.query('SELECT cpf FROM customers WHERE cpf = $1;', [cpf]);
        const isCpfOk = cpfCompare.rowCount === 0 ? true : false;

        try {
            if (cpf === cpfCompare.rows[0].cpf) {
                await connection.query(`
                    UPDATE customers
                    SET name = $1, phone = $2, birthday = $4
                    WHERE cpf = $3;
                `, [name, phone, cpf, birthday]);
                res.sendStatus(201);
            }
        } catch {
            if (isCpfOk) {
                await connection.query(`
                    UPDATE customers
                    SET cpf = $1
                    WHERE name = $2
                `, [cpf, name]);
                res.sendStatus(201);
            } else {
                res.sendStatus(409);
            }
        }
    }
})

app.get('/rentals', async (req, res) => {
    try {
        const rentalsList = await connection.query('SELECT * FROM rentals');
        const rentalListComplete = [];

        for (let i = 0; i < rentalsList.rowCount; i++) {
            let rental = rentalsList.rows[i];
            const customerId = rental.customerId;
            const gameId = rental.gameId;

            const game = await connection.query(`
            SELECT 
                games.id, 
                games.name, 
                games."categoryId", 
                categories."name" AS "categoryName"
            FROM games 
                JOIN categories 
                    ON games."categoryId" = categories.id 
            WHERE games.id = $1;`
                , [gameId]);

            const customer = await connection.query('SELECT id, name FROM customers WHERE id = $1', [customerId]);

            rental = {
                ...rental,
                game: game.rows[0],
                customer: customer.rows[0]
            }

            rentalListComplete.push(rental);
        }

        res.send(rentalListComplete);
    } catch (error) {
        console.log(error.message)
    }
})

function myGetDate() {
    const date = new Date();
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0'); //January is 0!
    const yyyy = date.getFullYear();

    return (date)
}

const rentalSchema = joi.object({
    daysRented: joi.number().integer().min(1).required(),
})

app.post('/rentals', async (req, res) => {
    const { gameId, customerId, daysRented } = req.body;
    const rentalValidation = rentalSchema.validate({
        daysRented,
    })
    const gameExists = await connection.query('SELECT * FROM games WHERE id = $1', [gameId]);
    const userExists = await connection.query('SELECT * FROM customers WHERE id = $1', [customerId]);

    try {
        const totalGames = await connection.query('SELECT "stockTotal" FROM games WHERE id = $1', [gameId]);
        const gamesUsed = await connection.query('SELECT "gameId" FROM rentals WHERE "gameId" = $1', [gameId]);
        const gameAvaible = totalGames.rowCount > gamesUsed.rowCount ? true : false;

        if (rentalValidation.error !== undefined || gameExists.rowCount === 0 || userExists.rowCount === 0 || !gameAvaible) {
            res.sendStatus(400);
        } else {
            try {
                const today = myGetDate(0);
                const gamePrice = await connection.query(`SELECT "pricePerDay" FROM games WHERE id = $1`, [gameId]);
                const newGamePrice = gamePrice.rows[0].pricePerDay * daysRented;

                await connection.query(`
                INSERT INTO rentals (
                    "customerId",
                    "gameId",
                    "rentDate",
                    "daysRented",
                    "returnDate",
                    "originalPrice",
                    "delayFee"
                ) VALUES ($1, $2, $3, $4, null,$5, null)`,
                    [
                        customerId,
                        gameId,
                        today,
                        daysRented,
                        newGamePrice
                    ]);
                res.sendStatus(201)
            } catch (error) {
                console.log(error.message);
            }
        }
    } catch (error) {
        console.log(error.message);
    }
})

async function getDaysDelayed(daysRented, rentDate) {
    const rentDateMilisec = Date.parse(rentDate);
    const todayInMilisec = Date.parse(myGetDate());
    const dayToReturn = (rentDateMilisec + (daysRented * 86400000));

    if (dayToReturn < todayInMilisec) {
        const delayTime = todayInMilisec - dayToReturn;
        return (Math.ceil(delayTime / 86400000))
    } else {
        return (0);
    }
}

app.post('/rentals/:id/return', async (req, res) => {
    const id = req.params['id'];

    const rentalInfo = await connection.query('SELECT * FROM rentals WHERE id = $1;', [id]);
    const { returnDate, daysRented, rentDate, originalPrice } = rentalInfo.rows[0];

    if (rentalInfo.rowCount === 0) {
        res.sendStatus(404);
    } else if (returnDate !== null) {
        res.sendStatus(400);
    } else {
        const daysDelayed = await getDaysDelayed(daysRented, rentDate);
        await connection.query('UPDATE rentals SET "returnDate" = ($1) WHERE id = $2', [myGetDate(), id]);
        if (daysDelayed === 0) {
            res.sendStatus(200);
        } else {
            const taxDelayedDays = (originalPrice / daysRented) * daysDelayed;
            try {
                await connection.query('UPDATE rentals SET "delayFee" = ($1) WHERE id = $2;', [taxDelayedDays, id]);
            } catch (error) {
                console.log(error.message);
            }
        }
    }
})

app.delete('/rentals/:id', async (req, res) => {
    const id = req.params['id'];

    const rentalInfo = await connection.query('SELECT * FROM rentals WHERE id = $1;', [id]);

    if (rentalInfo.rowCount === 0) {
        res.sendStatus(404);
    } else if (rentalInfo.rows[0].returnDate !== null) {
        res.sendStatus(400);
    } else {
        await connection.query('DELETE FROM rentals WHERE id = $1', [id]);
        res.sendStatus(200);
    }
})

app.listen(4000);