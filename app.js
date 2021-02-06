"use strict";

const express = require("express");
const cors = require("cors");
const mustacheExpress = require("mustache-express");
const emailOctopus = require("./controllers/emailOctopus");

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const app = express();
app.engine("mustache", mustacheExpress());
app.set("view engine", "mustache");

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.post("/update", (req, res) => {
  emailOctopus
    .updateUserTopic(req.body.userId, req.body.topic)
    .then(() => {
      res.render("success");
    })
    .catch((err) => {
      console.log(`failed to update user: ${req.body.userId} - ${err}`);
      res.render("error", { error: err });
    });
});

app.options("/subscribe", cors());
app.post("/subscribe", cors(), (req, res) => {
  // The ninja field is a honeypot input that no humans should fill out.
  if (req.body.ninja) {
    console.log(
      `bot signup detected: email=${req.body.email}, ninja=${req.body.ninja}`
    );
    // Send a dummy success message.
    res.status(200).json({ success: true }).end();
    return;
  }
  emailOctopus
    .subscribeUser(req.body.email, req.body.topic)
    .then(() => {
      res.status(200).json({ success: true }).end();
    })
    .catch((err) => {
      console.log(`failed to subscribe user: ${req.body.email} - ${err}`);
      res.status(500).json({ success: false, error: err }).end();
    });
});

app.post("/unsubscribe", (req, res) => {
  emailOctopus
    .unsubscribeUser(req.body.userId)
    .then(() => {
      res.render("success");
    })
    .catch((err) => {
      console.log(`failed to unsubscribe user: ${req.body.userId} - ${err}`);
      res.render("error", { error: err });
    });
});

app.use(
  "/vendor/css/bootstrap.css",
  express.static(__dirname + "/node_modules/bootstrap/dist/css/bootstrap.css")
);
app.use("/css", express.static(__dirname + "/css"));
app.use(
  "/vendor/js/jquery.js",
  express.static(__dirname + "/node_modules/jquery/dist/jquery.js")
);
app.use(
  "/vendor/js/bootstrap.js",
  express.static(__dirname + "/node_modules/bootstrap/dist/js/bootstrap.js")
);

app.get("/", (req, res) => {
  res.render("home", { userId: req.query.userId });
});

if (!process.env.EMAIL_OCTOPUS_API_KEY) {
  console.error("EMAIL_OCTOPUS_API_KEY environment variable is required");
  process.exit();
}
if (!process.env.EMAIL_OCTOPUS_LIST_ID) {
  console.error("EMAIL_OCTOPUS_LIST_ID environment variable is required");
  process.exit();
}

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
  console.log("Press Ctrl+C to quit.");
});

module.exports = app;
