"use strict";
const fs = require('fs');
const request = require('request');
let cheerio = require('cheerio');
const config = require('./config');
const Browser = require('zombie');
const client = require('twilio')(config.accountSid, config.authToken);
const Pid = require('./pid.js')

var scrapeController = {};

const seenListings = {};
let allListings;
let freshListings;



scrapeController.executeScrapeAndText = function(bool, interval) {
	//clear db:
	// Pid.find({}).remove().exec();
	
	if (bool) {
		console.log("initial scrape");
		getListingPids()
			.then(function(allPids){
				allListings = allPids;
				populateCache();
				freshListings = checkAgainstCache(allListings);
				console.log("fresh listings", freshListings);
				let secondInterval = setInterval(function(){
					if (freshListings.length === 0) {
						clearInterval(secondInterval);
					} else {
						let firstItem = freshListings.shift();
						getContentFromPid(firstItem);
					}
				}, 1000)
			})
			console.log("setting timer...")
		var firstInterval = setInterval(function() {
			getListingPids()
			.then(function(allPids){
				allListings = allPids;
				populateCache();
				freshListings = checkAgainstCache(allListings);
				console.log("fresh listings", freshListings);
				let secondInterval = setInterval(function(){
					if (freshListings.length === 0) {
						clearInterval(secondInterval);
					} else {
						let firstItem = freshListings.shift();
						getContentFromPid(firstItem);
					}
				}, 2000)
			})
		}, 1000 * 60 * 2); //last variable is minutes
		return firstInterval;
	} else {
		console.log("stopping...");
		clearInterval(interval);
	}

}

function checkAgainstCache(pids) {
	let newListings = [];
	pids.forEach((pid) => {
		if (seenListings[pid] === undefined) {
			newListings.push(pid);
			seenListings[pid] = true;
			// fs.appendFileSync('listings.txt', pid + ",");
			Pid.create({id: pid});
		}
	})
	return newListings;
}

function populateCache() {
	// let contents = fs.readFileSync('listings.txt').toString();
	// contents
	// 	.split(",")
	// 	.filter(x => x !== "")
	// 	.forEach((pid) => {
	// pid = pid.trim();
	// Pid.create({id: pid}, (err, resp) => {
	// 	console.log(err)
	// 	console.log("saved");
	// });
	// })
	console.log("populating cache...")
	Pid.find({}, (err, foundPids) => {
	foundPids
		.map((pidObj) => {
				return pidObj.id})
		.forEach((pid) => {
			seenListings[pid] = true;
		})
	})
}

function getListingPids() {
	let prom = new Promise(function(resolve, reject) {
		let url = 'https://'+ config.location + '.craigslist.org/search/sfc/apa'
		Browser.visit(url, (e, browser) => {
			// if (e) console.log("error with browser.visit",e);
			let pTags = Array.from(browser.querySelectorAll('p[data-pid]'));
			let pids = pTags.map((tag) => {
				return tag._attributes['data-pid']._nodeValue;
			})
			resolve(pids);
		})
	})
	return prom;
}

function getContentFromPid(pid) {
	request.get('https://sfbay.craigslist.org/sfc/apa/' + pid + '.html', function(error, response, body) {
		if (error) console.log("error in getContentFromPid")
		let $ = cheerio.load(body);
		let post = {};
		post.price = $('span.price').text();
		post.title = $('span#titletextonly').text();
		post.location = $('small').text();
		post.url = 'https://sfbay.craigslist.org/sfc/apa/' + pid + '.html';
		let postString = post.price + " " + post.title + " " + post.url;
		console.log(postString);

		// sendSms(postString);
	})
}

function sendSms(message) {
	client.messages.create({
		body: message, 
		to: config.myNumber,
		from: config.sendingNumber
	});
}

module.exports = scrapeController;