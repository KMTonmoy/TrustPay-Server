const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const port = process.env.PORT || 8000;

app.use(
    cors({
        origin: [
            "http://localhost:5173",
            "http://localhost:5174",
        ],
        credentials: true
    })
);

app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = "mongodb+srv://tonmoyahamed2009:tonmoytoma22@cluster0.dcucpfa.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // await client.connect();
        console.log("Connected to MongoDB");

        const usersCollection = client.db('TrustPay').collection('users');
        const paymentCollection = client.db('TrustPay').collection('payment');

        // Endpoint to generate JWT
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ token });
        });

        // Endpoint to get all users
        app.get('/users', async (req, res) => {
            const users = await usersCollection.find().toArray();
            res.send(users);
        });

        // Endpoint to get a user by email
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const result = await usersCollection.findOne({ email });
            res.send(result);
        });

        // Endpoint to update or create a user
        app.put('/user', async (req, res) => {
            const user = req.body;
            const query = { email: user?.email, name: user.displayName };
            const isExist = await usersCollection.findOne(query);
            if (isExist) {
                if (user.status === 'Requested') {
                    const result = await usersCollection.updateOne(query, {
                        $set: { status: user?.status },
                    });
                    return res.send(result);
                } else {
                    return res.send(isExist);
                }
            }

            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    ...user,
                    timestamp: Date.now(),
                },
            };
            const result = await usersCollection.updateOne(query, updateDoc, options);
            res.send(result);
        });

        // Endpoint to register a new user
        app.post('/user', async (req, res) => {
            const newUser = req.body;
            try {
                const result = await usersCollection.insertOne(newUser);
                res.status(201).send(result);
            } catch (error) {
                console.error('Error registering user:', error.message);
                res.status(500).send({ message: 'Failed to register user. Please try again.' });
            }
        });


        app.get('/transaction', async (req, res) => {
            const agreements = await paymentCollection.find().toArray();
            res.send(agreements);
        });


        app.get('/transaction/:email', async (req, res) => {
            const email = req.params.email;
            const result = await paymentCollection.find({ email }).toArray();
            res.send(result);
        });

        app.post('/transaction', async (req, res) => {
            const payment = req.body;
            const result = await paymentCollection.insertOne(payment);

            res.send({ result });
        });





        // Logout Endpoint
        app.get('/logout', async (req, res) => {
            try {
                res.clearCookie('token', {
                    maxAge: 0,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
                }).send({ success: true });
            } catch (err) {
                res.status(500).send(err);
            }
        });

        app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
        });

    } finally {
        process.on('SIGINT', async () => {
            // await client.close();
            // process.exit(0);
        });
    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('TrustPay is sitting');
});
