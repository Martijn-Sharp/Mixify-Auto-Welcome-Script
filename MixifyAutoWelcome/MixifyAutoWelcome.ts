/// <reference path="Typings/jquery.d.ts" />
/// <reference path="Typings/mixify.d.ts" />

// ==UserScript==
// @name        Fic's Mixify Auto Welcome Script
// @namespace   Booth
// @include     http://www.mixify.com/*/live/*
// @version     1.7.2
// @grant       none
// @description This script can be used on Mixify.com while streaming your DJ set. The main reason why I created this script is that I couldn't see every single person who enters the stream so I thought it could be nice if script can annonce in chat who entered the stream with a warm welcome message.
// ==/UserScript==

var dj: string = $("#marqueeTitle")[0].innerHTML.replace('</h1>', '').replace('<h1>', '').trim(); /*Current DJ name*/
var me: string = $("ul#userDropDown li:eq(2) a").text().trim();  /* Your name on Mixify */

var msgList: Array<string> = ["Welcome ", "Ez ", "Yo ", "Greetings ", "Sup ", "Hey ", "Hi ", "Whazzup ", "Hello "]; /* List of greetings */
var msg;    /* Random generated msg for new guest */
var users: JQuery;	/* List of guests in the room */
var session = [];  /* List of all users that entered the stream in one session */

/* If you are on your own stream script is running */
if (me === dj) {
    var url = "http://www.mixify.com/room/spectators/cache/1/?";		/*---------------------------*/
    var dataString = $("#specatorsDockItem").attr("data-querystring");  /* Getting url to call AJAX */
    url = url + dataString;                                            /*---------------------------*/

    if (sessionStorage.getItem("active") === null) {  /* Was this stream refreshed? */
        sessionStorage.setItem("active", "true");   /* You entered the stream for the first time */
        session.push(dj);   /* Ignore DJ while sending welcome msg */
    } else {
        fillGuestList();    /* Getting the guest list */
        for (var i = 0; i < users.length; i++) {                                                 /* --------------------------------------- */
            if (users[i].getAttribute("target") !== null && users[i].innerHTML !== "Guest")      /* Ignore guests that are already in room */
                session.push(users[i].innerHTML.trim());                                        /* --------------------------------------- */
        }
    }

    setInterval(   /* Calling AJAX  that is called my hovering mouse over attendees icon */
        () => {
            fillGuestList();    /* Getting the guest list */
            for (var i = 0; i < users.length; i++) {
                if (users[i].getAttribute("target") !== null && users[i].innerHTML !== "Guest" && jQuery.inArray(users[i].innerHTML.trim(), session) === -1) { /* Ignore duplicates and guests */
                    console.log("New guest is: " + users[i].innerHTML);

                    msg = msgList[Math.floor(Math.random() * msgList.length)];  /* Set random msg from msgList */
                    fc().fc_sendChat(msg + users[i].innerHTML.trim() + "!", dataString); /* Sends msg to chat */

                    session.push(users[i].innerHTML.trim());  /* Mark user as the one that already visited the stream */
                }
            }
        }, 5000);  /* Check for new guests every 5 seconds (Change 5000 ms to any other value you want) */
}

function fillGuestList() {
    jQuery.ajaxSetup({ async: false });
    var data = jQuery.get(url);
    var toObject = $(data.responseText);
    users = $(toObject).find(".username");
}