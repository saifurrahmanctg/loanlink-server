const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config({ path: ".env" });
const stripe = require("stripe")(process.env.STRIPE_SECRET);

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

async function run() {
  try {
    // await client.connect();

    const db = client.db("loanlink-db");
    const loansCollection = db.collection("loans");
    const loanApplicationsCollection = db.collection("loanApplications");
    const usersCollection = db.collection("users");
    const paymentsCollection = db.collection("payments");

    // ========================
    // 📌 USER ROUTES
    // ========================

    // Save user data upon registration
    app.post("/users", async (req, res) => {
      try {
        const user = req.body;

        const existing = await usersCollection.findOne({ email: user.email });

        if (existing) {
          return res.send({
            success: true,
            message: "User already exists",
            user: existing,
          });
        }

        const result = await usersCollection.insertOne(user);

        res.send({
          success: true,
          message: "User created successfully",
          userId: result.insertedId,
        });
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
    });

    // Get all users
    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    // Get a single user by ID
    app.get("/users/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const result = await usersCollection.findOne({ email });
        res.send(result);
      } catch {
        res.status(500).send({ message: "Failed to fetch user" });
      }
    });

    app.patch("/users/role/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const { role } = req.body;

        const result = await usersCollection.updateOne(
          { email },
          { $set: { role } }
        );

        res.send({ success: true });
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
    });
    // Delete a user by ID
    app.delete("/users/:id/suspend", async (req, res) => {
      try {
        const id = req.params.id;
        const { reason, feedback } = req.body;

        const result = await usersCollection.deleteOne({
          _id: new ObjectId(id),
        });

        if (result.deletedCount === 0) {
          return res.status(404).send({
            success: false,
            message: "User not found",
          });
        }

        res.send({
          success: true,
          message: "User suspended & deleted successfully",
          reason,
          feedback,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
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

    // Update a single loan by ID
    app.patch("/loans/:id", async (req, res) => {
      const id = req.params.id;
      const update = req.body;

      const result = await loansCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: update }
      );

      res.send({ success: true });
    });

    // Get a single loan for show home
    app.patch("/loans/home/:id", async (req, res) => {
      const id = req.params.id;
      const { showHome } = req.body;

      const result = await loansCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { showHome } }
      );

      res.send(result);
    });

    // Delete a loan
    app.delete("/loans/:id", async (req, res) => {
      const id = req.params.id;

      await loansCollection.deleteOne({ _id: new ObjectId(id) });

      res.send({ success: true });
    });

    // ===========================
    //  LOAN APPLICATION ROUTES
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

    // Get ALL loan applications + optional filtering
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

    // Borrower → My Loans
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

    // Get all PENDING Loan applications
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

    // Update loan application by ID
    app.patch("/loan-applications/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const updateData = req.body;

        const result = await loanApplicationsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData }
        );

        res.send(result);
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });

    // Get all APPROVED Loan applications
    app.get("/loan-applications/status/approved", async (req, res) => {
      try {
        const result = await loanApplicationsCollection
          .find({ status: "Approved" })
          .sort({ approvedAt: -1 })
          .toArray();

        res.send(result);
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });

    // Cancel a loan application
    app.patch("/loan-applications/cancel/:id", async (req, res) => {
      const { id } = req.params;

      const result = await loanApplicationsCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        {
          $set: {
            status: "Cancelled",
            cancelledAt: new Date(),
          },
        }
      );

      res.send({ success: result.modifiedCount > 0 });
    });

    // DELETE a loan application
    app.delete("/loan-applications/:id", async (req, res) => {
      try {
        const id = req.params.id;

        const result = await loanApplicationsCollection.deleteOne({
          _id: new ObjectId(id),
        });

        if (result.deletedCount === 0) {
          return res
            .status(404)
            .send({ message: "Loan Application not found" });
        }

        res.send({
          message: "Loan Application deleted successfully",
          deletedId: id,
        });
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });

    // ===========================
    //     STRIPE PAYMENT API'S
    // ===========================

    app.post("/payments/create-checkout-session", async (req, res) => {
      const { loanApplicationId, email } = req.body;

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: { name: "Loan Application Fee" },
              unit_amount: 1000, // $10
            },
            quantity: 1,
          },
        ],

        metadata: {
          loanApplicationId,
          email,
        },

        success_url: `${process.env.CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.CLIENT_URL}/dashboard/my-loans`,
      });

      res.send({ url: session.url });
    });

    // POST /payments/success
    app.post("/payments/success", async (req, res) => {
      try {
        const { loanApplicationId, transactionId, email } = req.body;

        // Save payment
        await paymentsCollection.insertOne({
          loanApplicationId,
          transactionId,
          email,
          amount: 10,
          paidAt: new Date(),
        });

        // Update loan application
        await loanApplicationsCollection.updateOne(
          { _id: new ObjectId(loanApplicationId) },
          {
            $set: {
              applicationFeeStatus: "Paid",
              payment: {
                transactionId,
                email,
                amount: 10,
                paidAt: new Date(),
              },
            },
          }
        );

        res.send({ success: true });
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });

    // GET /payments/:loanId
    app.get("/payments/:loanId", async (req, res) => {
      const payment = await paymentsCollection.findOne({
        loanApplicationId: req.params.loanId,
      });

      res.send(payment);
    });

    app.post("/payments/confirm", async (req, res) => {
      try {
        const { sessionId } = req.body;

        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status !== "paid") {
          return res.status(400).send({ message: "Payment not completed" });
        }

        const loanApplicationId = session.metadata.loanApplicationId;
        const email = session.metadata.email;

        // Save payment
        await paymentsCollection.insertOne({
          loanApplicationId,
          email,
          transactionId: session.payment_intent,
          amount: 10,
          paidAt: new Date(),
        });

        // Update loan application
        await loanApplicationsCollection.updateOne(
          { _id: new ObjectId(loanApplicationId) },
          {
            $set: {
              applicationFeeStatus: "Paid",
              payment: {
                email,
                transactionId: session.payment_intent,
                amount: 10,
                paidAt: new Date(),
              },
            },
          }
        );

        res.send({ success: true });
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: error.message });
      }
    });

    // 📌 Dashboard Stats for All Roles
    app.get("/dashboard/stats/:email", async (req, res) => {
      try {
        const email = req.params.email;

        const user = await usersCollection.findOne({ email });
        if (!user)
          return res
            .status(404)
            .json({ success: false, message: "User not found" });

        let stats = [];

        if (user.role === "admin") {
          const [totalUsers, totalLoans, pending, moneyAgg, paid] =
            await Promise.all([
              usersCollection.countDocuments(),
              loansCollection.countDocuments(),
              loanApplicationsCollection.countDocuments({ status: "Pending" }),
              loansCollection
                .aggregate([
                  { $group: { _id: null, total: { $sum: "$amount" } } },
                ])
                .toArray(),
              loanApplicationsCollection.countDocuments({ status: "paid" }),
            ]);
          stats = [
            { label: "Total Users", value: totalUsers },
            { label: "Total Loans", value: totalLoans },
            { label: "Pending Approvals", value: pending },
            { label: "Total Money Collected", value: moneyAgg[0]?.total || 0 },
            { label: "Loans Paid", value: paid },
          ];
        } else if (user.role === "manager") {
          const [total, money, pending, paid, avg] = await Promise.all([
            loanApplicationsCollection.countDocuments(),
            loansCollection
              .aggregate([
                { $group: { _id: null, total: { $sum: "$amount" } } },
              ])
              .toArray(),
            loanApplicationsCollection.countDocuments({ status: "Pending" }),
            loanApplicationsCollection.countDocuments({ status: "paid" }),
            loansCollection
              .aggregate([
                { $group: { _id: null, avgAmount: { $avg: "$amount" } } },
              ])
              .toArray(),
          ]);
          stats = [
            { label: "Total Loans Issued", value: total },
            { label: "Total Money Collected", value: money[0]?.total || 0 },
            { label: "Pending Approvals", value: pending },
            { label: "Loans Paid", value: paid },
            { label: "Average Loan Amount", value: avg[0]?.avgAmount || 0 },
          ];
        } else {
          // borrower
          const [userLoans, payments] = await Promise.all([
            loansCollection.find({ userEmail: email }).toArray(),
            paymentsCollection
              .find({ userEmail: email, status: "paid" })
              .toArray(),
          ]);

          const total = userLoans.length;
          const received = payments.reduce((s, p) => s + p.amount, 0);
          const pending = userLoans.filter(
            (l) => l.status === "Pending"
          ).length;
          const closed = userLoans.filter((l) => l.status === "paid").length;
          const avg = total
            ? userLoans.reduce((s, l) => s + l.amount, 0) / total
            : 0;
          const activeEMI = userLoans.filter(
            (l) => l.status === "active"
          ).length;

          stats = [
            { label: "Total Loans Taken", value: total },
            { label: "Total Money Received", value: received },
            { label: "Pending Loans", value: pending },
            { label: "Loans Closed", value: closed },
            { label: "Average Loan", value: avg },
            { label: "Active EMI", value: activeEMI },
          ];
        }

        res.json({ success: true, role: user.role, stats });
      } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
      }
    });

    // await client.db("admin").command({ ping: 1 });
    // console.log(
    // //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("🚀 LoanLink Server is Running");
});

app.listen(port, () => {
  console.log(`LoanLink server listening on port ${port}`);
});
