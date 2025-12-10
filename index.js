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

    // ========================
    // 📜 LOANS ROUTES
    // ========================
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

        // Auto fields
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

    // Get all loan applications
    app.get("/loan-applications", async (req, res) => {
      try {
        const apps = await loanApplicationsCollection
          .find()
          .sort({ createdAt: -1 })
          .toArray();

        res.send(apps);
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
