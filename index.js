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

    // 📌 Dashboard Stats for All Roles
    app.get("/dashboard/stats/:email", async (req, res) => {
      try {
        const email = req.params.email;

        // Fetch user
        const user = await usersCollection.findOne({ email });
        if (!user)
          return res
            .status(404)
            .send({ success: false, message: "User not found" });

        let stats = [];

        if (user.role === "admin") {
          // Admin sees system-wide stats
          const totalUsers = await usersCollection.countDocuments();
          const totalLoans = await loansCollection.countDocuments();
          const pendingApprovals =
            await loanApplicationsCollection.countDocuments({
              status: "Pending",
            });
          const totalMoney = await loansCollection
            .aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }])
            .toArray();
          const loansPaid = await loansCollection.countDocuments({
            status: "paid",
          });

          stats = [
            { label: "Total Users", value: totalUsers, color: "bg-info" },
            { label: "Total Loans", value: totalLoans, color: "bg-success" },
            {
              label: "Pending Approvals",
              value: pendingApprovals,
              color: "bg-warning",
            },
            {
              label: "Total Money Collected",
              value: totalMoney[0]?.total || 0,
              color: "bg-primary",
              prefix: "৳",
            },
            {
              label: "Loans Paid",
              value: loansPaid,
              color: "bg-accent",
              prefix: "৳",
            },
          ];
        } else if (user.role === "manager") {
          // Manager sees stats for all loans
          const totalLoans = await loansCollection.countDocuments();
          const totalMoney = await loansCollection
            .aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }])
            .toArray();
          const pendingApprovals =
            await loanApplicationsCollection.countDocuments({
              status: "Pending",
            });
          const loansPaid = await loansCollection.countDocuments({
            status: "paid",
          });
          const avgLoan = await loansCollection
            .aggregate([
              { $group: { _id: null, avgAmount: { $avg: "$amount" } } },
            ])
            .toArray();

          stats = [
            {
              label: "Total Loans Issued",
              value: totalLoans,
              color: "bg-info",
            },
            {
              label: "Total Money Collected",
              value: totalMoney[0]?.total || 0,
              color: "bg-success",
              prefix: "৳",
            },
            {
              label: "Pending Approvals",
              value: pendingApprovals,
              color: "bg-warning",
            },
            {
              label: "Loans Paid",
              value: loansPaid,
              color: "bg-primary",
              prefix: "৳",
            },
            {
              label: "Average Loan Amount",
              value: avgLoan[0]?.avgAmount || 0,
              color: "bg-accent",
              prefix: "৳",
            },
          ];
        } else {
          // Borrower sees only their own loans
          const userLoans = await loansCollection
            .find({ userEmail: email })
            .toArray();
          const totalLoans = userLoans.length;
          const totalMoneyReceived = userLoans.reduce(
            (sum, l) => (l.status === "paid" ? sum + l.amount : sum),
            0
          );
          const pendingLoans = userLoans.filter(
            (l) => l.status === "Pending"
          ).length;
          const loansPaid = userLoans.filter((l) => l.status === "paid").length;
          const avgLoan =
            userLoans.reduce((sum, l) => sum + l.amount, 0) /
            (userLoans.length || 1);
          const activeEMI = userLoans.filter(
            (l) => l.status === "active"
          ).length;

          stats = [
            { label: "Total Loans Taken", value: totalLoans, color: "bg-info" },
            {
              label: "Total Money Received",
              value: totalMoneyReceived,
              color: "bg-success",
              prefix: "৳",
            },
            {
              label: "Pending Loans",
              value: pendingLoans,
              color: "bg-warning",
            },
            {
              label: "Total Paid",
              value: loansPaid,
              color: "bg-primary",
              prefix: "৳",
            },
            {
              label: "Average Loan",
              value: avgLoan,
              color: "bg-accent",
              prefix: "৳",
            },
            { label: "Active EMI", value: activeEMI, color: "bg-secondary" },
          ];
        }

        res.send({ success: true, role: user.role, stats });
      } catch (error) {
        console.error(error);
        res.status(500).send({ success: false, message: error.message });
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
