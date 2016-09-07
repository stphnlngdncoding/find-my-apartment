"use strict";
const express = require('express');
const app = express();
const scrapeController = require('./index');
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/pid-cache');
const Pid = require('./pid');

let scrapeInterval;


// Pid.create({id: "12345asdf56"});

// Pid.find({}, (err, foundPids) => {
// 	console.log(foundPids);
// })



app.get('/go', (req, res) => {
	scrapeInterval = scrapeController.executeScrapeAndText(true);
	return res.send("beginning scrape");
});

app.get('/stop', (req, res) => {
	// console.log("scrapeInterval:", scrapeInterval);
	if (!scrapeInterval) {
		console.log("you didnt start scraping yet!")
		return res.send("scraping is not active");
	} else {
		scrapeController.executeScrapeAndText(false, scrapeInterval);
		scrapeInterval = null;
		return res.send("ending scrape");
	}
})

app.get('*', (req, res) => {
	console.log('invalid endpoint')
	return res.end();
})

app.listen(3000);