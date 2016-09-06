"use strict";
const fs = require('fs');
const request = require('request');
let cheerio = require('cheerio');
const config = require('./config');
const client = require('twilio')(config.accountSid, config.authToken);

const seenListings = {};

populateCache();

getListingPids();

setInterval(getListingPids, 1000 * 60);



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

	let options = {
		url: 'https://sfbay.craigslist.org/search/sfc/apa',
		// headers: {
		// 	'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36'
		// }
	}
	request(options, parsePids);
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
	console.log(newListings);

	if (newListings.length !== 0) {
		newListings.forEach((pid) => {
			getContentFromPid(pid);
		})
	}
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