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
            // console.log(token);
            res.send({ token });
        });

        const verifyToken = (req, res, next) => {
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                return res.status(401).send({ message: 'Unauthorized access' });
            }
            const token = authHeader.split(' ')[1];
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'Unauthorized access' });
                }
                req.decoded = decoded;
                next();
            });
        };

        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const user = await usersCollection.findOne({ email });
            if (!user || user.role !== 'admin') {
                return res.status(403).send({ message: 'Forbidden access' });
            }
            next();
        };

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

        // mobileNumber

        app.get('/users/mobile/:mobileNumber', async (req, res) => {
            const mobileNumber = req.params.mobileNumber;
            try {
                const result = await usersCollection.findOne({ mobileNumber });
                if (result) {
                    res.send(result);
                } else {
                    res.status(404).send({ message: 'User not found' });
                }
            } catch (error) {
                console.error('Error fetching user:', error.message);
                res.status(500).send({ message: 'Failed to fetch user. Please try again later.' });
            }
        });



        app.patch('/users/mobile/:mobileNumber', async (req, res) => {
            const mobileNumber = req.params.mobileNumber;
            const { balance } = req.body;
            const filter = { mobileNumber: mobileNumber };
            const updateDoc = {
                $set: {
                    balance: balance
                },
            };

            try {
                const result = await usersCollection.updateOne(filter, updateDoc);

                if (result.matchedCount === 0) {
                    return res.status(404).send({ error: 'User not found' });
                }

                if (result.modifiedCount === 0) {
                    return res.status(400).send({ message: 'No changes made to the user' });
                }

                res.send({ message: 'User updated successfully', result });
            } catch (error) {
                console.error(error);
                res.status(500).send({ error: 'Failed to update user' });
            }
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
