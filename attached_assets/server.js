const express = require("express");
const app = express();
const PORT = 3000;

const db = require("./db/memory");
const listenForStakes = require("./events/stakeListener");
const listenForUnstakes = require("./events/unstakeListener");
const listenForRewards = require("./events/rewardListener");
const listenForTransfers = require("./events/transferListener");

app.get("/stake-events", (req, res) => res.json(db.stakeEvents));
app.get("/unstake-events", (req, res) => res.json(db.unstakeEvents));
app.get("/rewards", (req, res) => res.json(db.rewardClaims));
app.get("/transfers", (req, res) => res.json(db.tokenTransfers));
app.get("/balances", (req, res) => res.json(db.stakedBalances));

listenForStakes();
listenForUnstakes();
listenForRewards();
listenForTransfers();

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
