const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
var jwt = require("jsonwebtoken");
require("dotenv").config();
var cookieParser = require("cookie-parser");
const app = express();
const port = process.env.PORT || 5000;

// middlewere
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// verify by JWT
const verifyToken = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).send({ message: "unauthorized access" });
  if (token) {
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
      if (error) {
        console.log(error);
        return res.status(401).send({ message: "unauthorized access" });
      }
      req.user = decoded;
      next();
    });
  }
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dbn21dt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const bookCollection = client.db("bookDB").collection("books");
    const subBookCollection = client.db("bookDB").collection("subBooks");
    const borrowedBookCollection = client.db("bookDB").collection("borrowed");

    // create jwt token
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "7d",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    // delete jwt token
    app.get("/logout", (req, res) => {
      res
        .clearCookie("token", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
          maxAge: 0,
        })
        .send({ success: true });
    });

    // save book into db
    app.post("/book", verifyToken, async (req, res) => {
      const body = req.body;
      const tokenEmail = req.user?.email;
      if (tokenEmail !== body.email) {
        return res.status(403).send({ message: "Forbidden access" });
      }
      const result = await bookCollection.insertOne(body);
      res.send(result);
    });
    // get All data from bd
    app.get("/books", async (req, res) => {
      const result = await bookCollection.find().toArray();
      res.send(result);
    });

    app.get("/books/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookCollection.findOne(query);
      res.send(result);
    });

    // update book in database by ID
    app.put("/books/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateBook = req.body;
      const tokenEmail = req.user?.email;
      if (tokenEmail !== updateBook.email) {
        return res.status(403).send({ message: "Forbidden access" });
      }
      const book = {
        $set: { ...updateBook },
      };
      const result = await bookCollection.updateOne(query, book, options);
      res.send(result);
    });

    // get All data from subBooks collection
    app.get("/subBooks", async (req, res) => {
      const result = await subBookCollection.find().toArray();
      res.send(result);
    });

    // find single data by id in subBookCollection
    app.get("/sub-Books/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await subBookCollection.findOne(query);
      res.send(result);
    });
    // delete book from subBooks section
    app.delete("/subBookss/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await subBookCollection.deleteOne(query);
      res.send(result);
    });

    // save book into db
    app.post("/sub_Books", async (req, res) => {
      const body = req.body;
      console.log(body);
      const result = await subBookCollection.insertOne(body);
      res.send(result);
    });

    // save borrowed into db
    app.post("/borrowed", async (req, res) => {
      const body = req.body;
      console.log(body);
      const result = await borrowedBookCollection.insertOne(body);
      res.send(result);
    });

    // get All data from borrowed collection
    app.get("/borrowedBook/:email", async (req, res) => {
      const emails = req.params.email;
      const result = await borrowedBookCollection
        .find({ email: emails })
        .toArray();
      res.send(result);
    });

    // delete book from Borrowed section
    app.delete("/borrowedd/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await borrowedBookCollection.deleteOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Port is runing from Open Library Server");
});

app.listen(port, () => {
  console.log(`Open Library Server From ${port}`);
});
