"use strict";

const express = require("express");
const cors = require("cors");
const mustacheExpress = require("mustache-express");
const mailchimp = require("./controllers/mailchimp");

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const app = express();
app.engine("mustache", mustacheExpress());
app.set("view engine", "mustache");

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.post("/update", (req, res) => {
  mailchimp
    .updateUserTopic(req.body.email, req.body.topics)
    .then(() => {
      res.render("success");
    })
    .catch(err => {
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
    res
      .status(200)
      .json({ success: true })
      .end();
    return;
  }
  mailchimp
    .subscribeUser(req.body.email, req.body.topics)
    .then(() => {
      res
        .status(200)
        .json({ success: true })
        .end();
    })
    .catch(err => {
      res
        .status(500)
        .json({ success: false, error: err })
        .end();
    });
});

app.post("/unsubscribe", (req, res) => {
  mailchimp
    .unsubscribeUser(req.body.email)
    .then(() => {
      res.render("success");
    })
    .catch(err => {
      res.render("error", { error: err });
    });
});

app.use(
  "/vendor/css",
  express.static(__dirname + "/node_modules/bootstrap/dist/css")
);
app.use("/css", express.static(__dirname + "/css"));
app.use(
  "/vendor/js",
  express.static(__dirname + "/node_modules/bootstrap/dist/js")
);

app.get("/", (req, res) => {
  res.render("home", { email: req.query.email });
});

if (!process.env.MAILCHIMP_API_KEY) {
  console.error("MAILCHIMP_API_KEY environment variable is required");
  process.exit();
}
if (!process.env.MAILCHIMP_LIST_ID) {
  console.error("MAILCHIMP_LIST_ID environment variable is required");
  process.exit();
}

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
  console.log("Press Ctrl+C to quit.");
});

module.exports = app;
