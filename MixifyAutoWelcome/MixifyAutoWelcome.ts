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

class UserCollection {
    private users: Array<User> = [];
    disallowedUsers: Array<string> = [];
    addEvents: { (user?: User) : void }[] = [];

    add(user: User): void {
        console.log("Trying to add " + user.name);
        // Check if user is allowed to be added and if it doesn't already exist
        if (this.userIsAllowed(user.name) && !this.userExists(user.name)) {
            this.users.push(user);

            console.log("Succesfully added " + user.name);

            // If the user isn't in the session yet, add the user and trigger events
            if ($.inArray(user.name, session) === -1) {
                console.log("Adding " + user.name + " to the session");
                session.push(user.name);
                for (var event of this.addEvents) {
                    event(user);
                }
            }

            return;
        }
        
        console.log("I already know or don't want to add " + user.name);
    }

    private userIsAllowed(name: string): boolean {
        if ($.inArray(name, this.disallowedUsers) !== -1) {
            return false;
        }

        return true;
    }

    private userExists(name: string): boolean {
        for (var user of this.users) {
            if (user.name === name) {
                return true;
            }
        }

        return false;
    }
}

class User {
    constructor(name: string) {
        this.name = name;
    }

    name: string;

    greet() {
        console.log("Greeting " + this.name);
        msg = msgList[Math.floor(Math.random() * msgList.length)];  /* Set random msg from msgList */
        fc().fc_sendChat(msg + this.name + "!", dataString.split("=")[1]); /* Sends msg to chat */
    }
}

var dj: string = $("#marqueeTitle")[0].innerHTML.replace('</h1>', '').replace('<h1>', '').trim(); /*Current DJ name*/
var me: string = $("ul#userDropDown li:eq(2) a").text().trim();  /* Your name on Mixify */

var users: UserCollection = new UserCollection();
users.disallowedUsers = ["Guest", dj];
users.addEvents.push((user) => { user.greet(); });

var msgList: Array<string> = ["Welcome ", "Ez ", "Yo ", "Greetings ", "Sup ", "Hey ", "Hi ", "Whazzup ", "Hello "]; /* List of greetings */
var msg;    /* Random generated msg for new guest */
var session = [];  /* List of all users that entered the stream in one session */
var url: string;

// If you are on your own stream script is running
if (me === dj) {
    // Getting url to call AJAX
    var dataString = $("#specatorsDockItem").attr("data-querystring");
    url = "http://www.mixify.com/room/spectators/cache/1/?" + dataString;

    if (sessionStorage.getItem("active") === null) {  /* Was this stream refreshed? */
        sessionStorage.setItem("active", "true");   /* You entered the stream for the first time */
        session.push(dj);   /* Ignore DJ while sending welcome msg */
    } else {
        retrieveAttenders();
    }

    // Check for new guests every 5 seconds (Change 5000 ms to any other value you want)
    setInterval(() => { retrieveAttenders(); }, 5000);
}

function retrieveAttenders() {
    console.log("Filling attendance list");
    jQuery.ajaxSetup({ async: false });
    var data = jQuery.get(url);
    var toObject = $(data.responseText);
    $(toObject).find('.username').each((index, element) => {
         users.add(new User(element.innerHTML.trim()));
    });
}