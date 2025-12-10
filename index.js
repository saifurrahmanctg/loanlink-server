const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config({ path: ".env.local" });

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const uri = process.env.MONGODB_URI;

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
    await client.connect();

    const db = client.db("loanlink-db");
    const loansCollection = db.collection("loans");
    const loanApplicationsCollection = db.collection("loanApplications");
    const usersCollection = db.collection("users");

    // ========================
    // 📌 USER ROUTES
    // ========================

    // ➤ Register user (after Firebase signup)
    app.post("/users", async (req, res) => {
      try {
        const { name, email, photo, role, createdAt } = req.body;

        // check existing
        const exists = await usersCollection.findOne({ email });
        if (exists) {
          return res.send({ success: true, message: "User already exists" });
        }

        const newUser = {
          name,
          email,
          photo,
          role,
          createdAt: createdAt || new Date(),
        };

        const result = await usersCollection.insertOne(newUser);

        res.send({
          success: true,
          message: "User saved in MongoDB",
          id: result.insertedId,
        });
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
    });

    // ➤ Fetch single user
    app.get("/users/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const result = await usersCollection.findOne({ email });
        res.send(result);
      } catch {
        res.status(500).send({ message: "Failed to fetch user" });
      }
    });

    // ========================
    // 📜 LOANS ROUTES
    // ========================
    // Add a new loan
    app.post("/loans", async (req, res) => {
      try {
        const loan = {
          ...req.body,
          createdAt: new Date(),
        };

        const result = await loansCollection.insertOne(loan);
        res.send({ success: true, loanId: result.insertedId });
      } catch (error) {
        console.error(error);
        res.status(500).send({ success: false, message: "Failed to add loan" });
      }
    });

    // Get all loans
    app.get("/loans", async (req, res) => {
      const result = await loansCollection.find().toArray();
      res.send(result);
    });

    // Get a single loan
    app.get("/loans/:id", async (req, res) => {
      const { id } = req.params;
      const loan = await loansCollection.findOne({ _id: new ObjectId(id) });
      res.send(loan);
    });

    // ===========================
    // 📜 LOAN APPLICATION ROUTES
    // ===========================

    // Create a loan application
    app.post("/loan-applications", async (req, res) => {
      try {
        const application = req.body;

        // Auto fields (NOT taken from user input)
        application.status = "Pending";
        application.applicationFeeStatus = "Unpaid";
        application.createdAt = new Date();

        const result = await loanApplicationsCollection.insertOne(application);

        res.send({
          success: true,
          message: "Loan application submitted successfully!",
          id: result.insertedId,
        });
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
    });

    // ===========================
    // Get ALL loan applications + optional filtering

    // ===========================
    app.get("/loan-applications", async (req, res) => {
      try {
        const status = req.query.status;
        let filter = {};

        if (status) {
          filter.status = status;
        }

        const apps = await loanApplicationsCollection
          .find(filter)
          .sort({ createdAt: -1 })
          .toArray();

        res.send(apps);
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });

    // ===========================
    // Borrower → My Loans
    // ===========================
    app.get("/loan-applications/user/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const result = await loanApplicationsCollection
          .find({ userEmail: email })
          .sort({ createdAt: -1 })
          .toArray();

        res.send(result);
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });

    // ===========================
    // Manager → Pending Loans
    // ===========================
    app.get("/loan-applications/status/pending", async (req, res) => {
      try {
        const result = await loanApplicationsCollection
          .find({ status: "Pending" }) // FIXED (capital P)
          .sort({ createdAt: -1 })
          .toArray();

        res.send(result);
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send(`LoanLink Server is running on port ${port} `);
});

app.listen(port, () => {
  console.log(`LoanLink server listening on port ${port}`);
});
