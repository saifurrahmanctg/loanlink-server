const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config({ path: ".env" });
const stripe = require("stripe")(process.env.STRIPE_SECRET);
const admin = require("firebase-admin");

// Initialize Firebase Admin SDK
const serviceAccount = require("./loanlink-firebase-adminsdk.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// ========================
// 🔐 MIDDLEWARE
// ========================

// Verify Token Middleware
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).send({ message: "Unauthorized access" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.decodedUser = decodedToken;
    next();
  } catch (error) {
    console.error("Token verification error:", error);
    return res.status(401).send({ message: "Unauthorized access" });
  }
};

async function run() {
  try {
    const db = client.db("loanlink-db");
    const loansCollection = db.collection("loans");
    const loanApplicationsCollection = db.collection("loanApplications");
    const usersCollection = db.collection("users");
    const paymentsCollection = db.collection("payments");

    console.log("✅ Successfully connected to MongoDB!");

    // ========================
    // 📌 USER ROUTES
    // ========================

    app.post("/users", async (req, res) => {
      try {
        const user = req.body;
        const existing = await usersCollection.findOne({ email: user.email });

        if (existing) {
          return res.send({ success: true, message: "User already exists", user: existing });
        }

        const result = await usersCollection.insertOne(user);
        res.send({ success: true, message: "User created successfully", userId: result.insertedId });
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
    });

    app.get("/users", verifyToken, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.get("/users/:email", verifyToken, async (req, res) => {
      try {
        const email = req.params.email;
        const result = await usersCollection.findOne({ email });
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch user" });
      }
    });

    app.patch("/users/role/:email", verifyToken, async (req, res) => {
      try {
        const email = req.params.email;
        const { role } = req.body;
        const result = await usersCollection.updateOne({ email }, { $set: { role } });
        res.send({ success: true });
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
    });

    app.patch("/users/update/:email", verifyToken, async (req, res) => {
      try {
        const email = req.params.email;
        const updateData = req.body;
        const result = await usersCollection.updateOne({ email }, { $set: updateData });
        res.send({ success: true, modifiedCount: result.modifiedCount });
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
    });

    app.delete("/users/:id/suspend", verifyToken, async (req, res) => {
      try {
        const id = req.params.id;
        const { reason, feedback } = req.body;
        const result = await usersCollection.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
          return res.status(404).send({ success: false, message: "User not found" });
        }

        res.send({ success: true, message: "User suspended & deleted successfully", reason, feedback });
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
    });

    // ========================
    // 📜 LOANS ROUTES
    // ========================

    app.post("/loans", verifyToken, async (req, res) => {
      try {
        const loan = { ...req.body, createdAt: new Date() };
        const result = await loansCollection.insertOne(loan);
        res.send({ success: true, loanId: result.insertedId });
      } catch (error) {
        res.status(500).send({ success: false, message: "Failed to add loan" });
      }
    });

    app.get("/loans", async (req, res) => {
      const result = await loansCollection.find().toArray();
      res.send(result);
    });

    app.get("/loans/:id", async (req, res) => {
      const { id } = req.params;
      const loan = await loansCollection.findOne({ _id: new ObjectId(id) });
      res.send(loan);
    });

    app.patch("/loans/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const update = req.body;
      const result = await loansCollection.updateOne({ _id: new ObjectId(id) }, { $set: update });
      res.send({ success: true });
    });

    app.patch("/loans/home/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const { showHome } = req.body;
      const result = await loansCollection.updateOne({ _id: new ObjectId(id) }, { $set: { showHome } });
      res.send(result);
    });

    app.delete("/loans/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      await loansCollection.deleteOne({ _id: new ObjectId(id) });
      res.send({ success: true });
    });

    // ===========================
    //  LOAN APPLICATION ROUTES
    // ===========================

    app.post("/loan-applications", verifyToken, async (req, res) => {
      try {
        const application = req.body;
        application.status = "Pending";
        application.applicationFeeStatus = "Unpaid";
        application.createdAt = new Date();

        const result = await loanApplicationsCollection.insertOne(application);
        res.send({ success: true, message: "Loan application submitted successfully!", id: result.insertedId });
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
    });

    app.get("/loan-applications", verifyToken, async (req, res) => {
      try {
        const status = req.query.status;
        let filter = {};
        if (status) filter.status = status;

        const apps = await loanApplicationsCollection.find(filter).sort({ createdAt: -1 }).toArray();
        res.send(apps);
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });

    app.get("/loan-applications/user/:email", verifyToken, async (req, res) => {
      try {
        const email = req.params.email;
        const result = await loanApplicationsCollection.find({ userEmail: email }).sort({ createdAt: -1 }).toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });

    app.get("/loan-applications/status/pending", verifyToken, async (req, res) => {
      try {
        const result = await loanApplicationsCollection.find({ status: "Pending" }).sort({ createdAt: -1 }).toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });

    app.patch("/loan-applications/:id", verifyToken, async (req, res) => {
      try {
        const { id } = req.params;
        const updateData = req.body;
        await loanApplicationsCollection.updateOne({ _id: new ObjectId(id) }, { $set: updateData });
        res.send({ success: true });
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });

    app.get("/loan-applications/status/approved", verifyToken, async (req, res) => {
      try {
        const result = await loanApplicationsCollection.find({ status: "Approved" }).sort({ approvedAt: -1 }).toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });

    app.patch("/loan-applications/cancel/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      const result = await loanApplicationsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status: "Cancelled", cancelledAt: new Date() } }
      );
      res.send({ success: result.modifiedCount > 0 });
    });

    app.delete("/loan-applications/:id", verifyToken, async (req, res) => {
      try {
        const id = req.params.id;
        const result = await loanApplicationsCollection.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "Loan Application not found" });
        }
        res.send({ message: "Loan Application deleted successfully", deletedId: id });
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });

    // ===========================
    //     STRIPE PAYMENT API'S
    // ===========================

    app.post("/payments/create-checkout-session", verifyToken, async (req, res) => {
      try {
        const { loanApplicationId, email } = req.body;
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          mode: "payment",
          line_items: [{
            price_data: { currency: "usd", product_data: { name: "Loan Application Fee" }, unit_amount: 1000 },
            quantity: 1,
          }],
          metadata: { loanApplicationId, email },
          success_url: `${process.env.CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${process.env.CLIENT_URL}/dashboard/my-loans`,
        });
        res.send({ url: session.url });
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });

    app.post("/payments/success", verifyToken, async (req, res) => {
      try {
        const { loanApplicationId, transactionId, email } = req.body;
        await paymentsCollection.insertOne({ loanApplicationId, transactionId, email, amount: 10, paidAt: new Date() });
        await loanApplicationsCollection.updateOne(
          { _id: new ObjectId(loanApplicationId) },
          { $set: { applicationFeeStatus: "Paid", payment: { transactionId, email, amount: 10, paidAt: new Date() } } }
        );
        res.send({ success: true });
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });

    app.get("/payments/:loanId", verifyToken, async (req, res) => {
      const payment = await paymentsCollection.findOne({ loanApplicationId: req.params.loanId });
      res.send(payment);
    });

    app.post("/payments/confirm", verifyToken, async (req, res) => {
      try {
        const { sessionId } = req.body;
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status !== "paid") {
          return res.status(400).send({ message: "Payment not completed" });
        }

        const loanApplicationId = session.metadata.loanApplicationId;
        const email = session.metadata.email;

        await paymentsCollection.insertOne({ loanApplicationId, email, transactionId: session.payment_intent, amount: 10, paidAt: new Date() });
        await loanApplicationsCollection.updateOne(
          { _id: new ObjectId(loanApplicationId) },
          { $set: { applicationFeeStatus: "Paid", payment: { email, transactionId: session.payment_intent, amount: 10, paidAt: new Date() } } }
        );
        res.send({ success: true });
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });

  } catch (error) {
    console.error("Run error:", error);
  }
}
run();

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ success: false, message: "Something went wrong!" });
});

app.get("/", (req, res) => {
  res.send("🚀 LoanLink Server is Running");
});

app.listen(port, () => {
  console.log(`LoanLink server listening on port ${port}`);
});
