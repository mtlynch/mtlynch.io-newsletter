"use strict";

const express = require("express");
const mustacheExpress = require("mustache-express");
const app = express();
const emailOctopus = require("./controllers/emailOctopus");

app.engine("mustache", mustacheExpress());
app.set("view engine", "mustache");

// TODO: Make this a POST
app.get("/update", (req, res) => {
  emailOctopus
    .updateUserTopic(req.query.userId, req.query.topics)
    .then(response => {
      res
        .status(200)
        .send("Update succeeded!")
        .end();
    })
    .catch(err => {
      res
        .status(500)
        .send("Failed: " + err)
        .end();
    });
});

// TODO: Make this a POST
app.get("/unsubscribe", (req, res) => {
  res
    .status(501)
    .send("This will be implemented soon!")
    .end();
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
