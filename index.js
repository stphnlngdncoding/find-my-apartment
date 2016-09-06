"use strict";
const fs = require('fs');
const request = require('request');
let cheerio = require('cheerio');
const config = require('./config');
const client = require('twilio')(config.accountSid, config.authToken);

const seenListings = {};

populateCache();

getListingPids();

setInterval(getListingPids, 1000 * 60 * 2); //last variable is minutes

//craigslist sets most recent things to local storage.... how to get from that?

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
		// 	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
		// 	'Accept-Encoding': 'gzip, deflate, sdch, br',
		// 	'Accept-Language': 'en-US,en;q=0.8',
		// 	'Cache-Control': 'max-age=0',
		// 	'Cookie': 'cl_def_hp=sfbay; cl_b=2vxOn2V05hGZV65lTFx2tgjs0xU; cl_tocmode=hhh%3Alist',
		// 	// 'If-Modified-Since': 'Tue, 06 Sep 2016 22:56:50 GMT',
		// 	'Upgrade-Insecure-Requests': '1',
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

	//queue to slow down requests for the specific page
	let intervalId = setInterval(function(){
		if (newListings.length === 0) {
			clearInterval(intervalId);
		} else {
			let firstItem = newListings.shift();
			getContentFromPid(firstItem);
		}
	}, 2000)
	// if (newListings.length !== 0) {
	// 	newListings.forEach((pid) => {
	// 		getContentFromPid(pid);
	// 	})
	// }
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