"use strict";
const fs = require('fs');
const request = require('request');
let cheerio = require('cheerio');
const config = require('./config');
const Browser = require('zombie');
const client = require('twilio')(config.accountSid, config.authToken);

const seenListings = {};
let allListings;
let freshListings;

setInterval(function() {
	getListingPids()
	.then(function(allPids){
		allListings = allPids;
		populateCache();
		freshListings = checkAgainstCache(allListings);
		console.log("fresh listings", freshListings);
			let intervalId = setInterval(function(){
			if (freshListings.length === 0) {
				clearInterval(intervalId);
			} else {
				let firstItem = freshListings.shift();
				getContentFromPid(firstItem);
			}
		}, 2000)
	})
}, 1000 * 60 * 1); //last variable is minutes


// let freshListings = checkAgainstCache(listingPids);
// console.log(freshListings);

//craigslist sets most recent things to local storage.... how to get from that?

function checkAgainstCache(pids) {
	let newListings = [];
	pids.forEach((pid) => {
		if (seenListings[pid] === undefined) {
			newListings.push(pid);
			seenListings[pid] = true;
			fs.appendFileSync('listings.txt', pid + ",");
		}
	})
	return newListings;
}

function populateCache() {
	let contents = fs.readFileSync('listings.txt').toString();
	contents
		.split(",")
		.filter(x => x !== "")
		.forEach((pid) => {
	pid = pid.trim();
	seenListings[pid] = true;
	})
}

function getListingPids() {
	let prom = new Promise(function(resolve, reject) {
		Browser.visit('https://sfbay.craigslist.org/search/sfc/apa', (e, browser) => {
			if (e) console.log("error with browser.visit",e);
			// console.log(browser._windowInScope._response.body);
			//srch_sfbay.craigslist.org/search/sfc/apa
			// console.log(browser.localStorage('https://sfbay.craigslist.org/search/sfc/apa').getItem('srch_sfbay.craigslist.org/search/sfc/apa'))
			let pTags = Array.from(browser.querySelectorAll('p[data-pid]'));
			// console.log(pTags[0]._attributes[1])
			// console.log(pTags[0]._attributes['data-pid']._nodeValue)
			let pids = pTags.map((tag) => {
				return tag._attributes['data-pid']._nodeValue;
			})

			resolve(pids);
		})
	})
	return prom
}


function parsePids (error, response, body) {
	console.log("error", error);
	let $ = cheerio.load(body);
	let listings = $('p.row');
	let newListings = [];
	listings.each(function(i) {
		let pid = $(this).attr("data-pid")
		if (seenListings[pid] === undefined) {
			newListings.push(pid);
			seenListings[pid] = true;
			fs.appendFileSync('listings.txt', pid + ",");

		}
	});

	let intervalId = setInterval(function(){
		if (newListings.length === 0) {
			clearInterval(intervalId);
		} else {
			let firstItem = newListings.shift();
			getContentFromPid(firstItem);
		}
	}, 2000)
}


function getContentFromPid(pid) {
	// console.log(pid);
	request.get('https://sfbay.craigslist.org/sfc/apa/' + pid + '.html', function(error, response, body) {
		console.log("error", error);
		let $ = cheerio.load(body);
		let post = {};
		post.price = $('span.price').text();
		// post.brs = $('span#housing').text();
		post.title = $('span#titletextonly').text();
		post.location = $('small').text();
		post.url = 'https://sfbay.craigslist.org/sfc/apa/' + pid + '.html';
		// console.log(post);
		let postString = post.price + " " + post.title + " " + post.url;
		console.log(postString);
		sendSms(postString);
	})
}

function sendSms(message) {
	client.messages.create({
		body: message, 
		to: config.myNumber,
		from: config.sendingNumber
	});
}