/// <reference path="Typings/jquery.d.ts" />
/// <reference path="Typings/mixify.d.ts" />

// ==UserScript==
// @name        Fic's Mixify Auto Welcome Script
// @namespace   Booth
// @include     http://www.mixify.com/*/live/*
// @version     1.7.2
// @grant       none
// @description This script can be used on Mixify.com while streaming your DJ set. The main reason why I created this script is that I couldn't see every single person who enters the stream so I thought it could be nice if a script can announce in chat who entered the stream with a warm welcome message.
// ==/UserScript==

/**
 * Turn debug mode on/off
 */
const debugMode: boolean = true;

/**
 * A collection of welcome greetings
 * {0} = name of the user
 */
const welcomeGreetings: Array<string> = ["Welcome {0}!", "Ez {0}!", "Yo {0}!", "Greetings {0}!", "Sup {0}!", "Hey {0}!", "Hi {0}!", "Whazzup {0}!", "Hello {0}!"];

/**
 * A collection of welcome back greetings
 * {0} = name of the user
 */
const welcomeBackGreetings: Array<string> = ["Welcome back {0}"];

/**
 * The minimum amount of time (in milliseconds) before a greeting gets send
 */
const greetingDelay: number = 2000;

/**
 * The timespan (in milliseconds) in which the greeting will be send, after the delay
 */
const greetingMaxTimespan: number = 10000;

class UserCollection {
    private users: Array<User> = [];
    disallowedUsers: Array<string> = [];

    add(user: User): void {
        logToConsole("Trying to add {0}".format(user.name));
        if (this.userIsAllowed(user.name)) {
            if (!this.userExists(user.id)) {
                this.users.push(user);
                logToConsole("Succesfully added {0} ({1})".format(user.name, user.id));
                user.greet(welcomeGreetings);
            } else {
                user.greet(welcomeBackGreetings);
            }
        } else {
            logToConsole("{0} is not allowed to be added".format(user.name));
        }
    }

    private userIsAllowed(name: string): boolean {
        return $.inArray(name, this.disallowedUsers) === -1;
    }

    private userExists(id: string): boolean {
        for (var user of this.users) {
            if (user.id === id) {
                return true;
            }
        }

        return false;
    }
}

class User {
    constructor(id: string, name: string) {
        this.id = id;
        this.name = name;
        this.active = true;
    }

    id: string;

    name: string;

    active: boolean;

    greet(greetings: Array<string>): void {
        var timeout: number = greetingDelay + (Math.random() * greetingMaxTimespan);
        logToConsole("About to greet in {0} ms".format(timeout.toString()));
        window.setTimeout(() => {
            if (this.isStillInRoom()) {
                logToConsole("Greeting {0} ({1})".format(this.name, this.id));
                var greetingMessage = greetings[Math.floor(Math.random() * greetings.length)];
                sendChatMessage(greetingMessage.format(this.name));
            }
        }, timeout);
    }

    isStillInRoom(): boolean {
        var searchResult = $('#avatar_{0}'.format(this.id));
        if (searchResult.length === 0) {
            this.active = false;
        }

        return searchResult.length > 0;
    }
}

interface String {
    format(...replacements: string[]): string;
}

if (!String.prototype.format) {
    String.prototype.format = function () {
        var args = arguments;
        return this.replace(/{(\d+)}/g, (match, number) => (typeof args[number] != 'undefined'
            ? args[number]
            : match));
    };
}

var dj: string = $("#marqueeTitle")[0].innerHTML.replace('</h1>', '').replace('<h1>', '').trim(); /*Current DJ name*/
var me: string = $("ul#userDropDown li:eq(2) a").text().trim();  /* Your name on Mixify */

var users: UserCollection = new UserCollection();
users.disallowedUsers = ["Guest", dj];

var url: string;
var dataString: string;

// If you are on your own stream script is running
if (me === dj) {
    // Getting url to call AJAX
    var queryString = $("#specatorsDockItem").attr("data-querystring");
    url = "http://www.mixify.com/room/spectators/cache/1/?" + queryString;
    dataString = queryString.split("=")[1];

    if (sessionStorage.getItem("active") === null) {  /* Was this stream refreshed? */
        sessionStorage.setItem("active", "true");   /* You entered the stream for the first time */
    } else {
        retrieveAttendees();
    }

    $('#avatarContainer').bind("DOMSubtreeModified", (e) => {
        var element = $(e.target);
        if (element.attr("class") === "avatar") {
            var id = element.attr("id").split("_")[1];
            var querystring = element.attr("data-querystring");
            jQuery.ajaxSetup({ async: false });
            var data = jQuery.get("http://www.mixify.com/user/info-basic/?{0}".format(querystring));
            var responseHtml = $(data.responseText);
            var username = $(responseHtml).find('.username')[0].innerHTML;
            users.add(new User(id, username));
        }
    });
}

function retrieveAttendees(): void {
    if (fc() != null) {
        logToConsole("Retrieving attendance list");
        jQuery.ajaxSetup({ async: false });
        var data = jQuery.get(url);
        var responseHtml = $(data.responseText);
        $(responseHtml).find('.module-info').each((index, element) => {
            var jqueryElement = $(element);
            var username = jqueryElement.find('.username')[0].innerHTML;
            var id = jqueryElement.find('.bt-wrapper').attr('data-uuid');
            users.add(new User(id, username));
        });
    }
}

// Sends message to chat
function sendChatMessage(message: string): void {
    fc().fc_sendChat(message, dataString);
}

function logToConsole(message?: any, ...optionalParams: any[]): void {
    if (debugMode) {
        console.log(message, optionalParams);
    }
}