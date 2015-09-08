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

// TODO Split settings and implementation scripts
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

/**
 * Collection class for users
 */
class UserCollection {
    private users: Array<User> = [];
    disallowedUsers: Array<string> = [];

    /**
     * Add a new user
     * @param user User object
     */
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

    /**
     * Check if an user is allowed, by name
     * @param name Name of the user
     * @returns { User is allowed } 
     */
    private userIsAllowed(name: string): boolean {
        return $.inArray(name, this.disallowedUsers) === -1;
    }

    /**
     * Check if user already exists in the array
     * @param id ID of the user 
     * @returns { User exists } 
     */
    private userExists(id: string): boolean {
        for (let user of this.users) {
            if (user.id === id) {
                return true;
            }
        }

        return false;
    }
}

/**
 * User class
 */
class User {
    constructor(id: string, name: string) {
        this.id = id;
        this.name = name;
        this.active = true;
    }

    id: string;

    name: string;

    active: boolean;

    /**
     * Greets an user
     * @param greetings Array of possible greetings
     */
    greet(greetings: Array<string>): void {
        // Determine timeout in ms
        var timeout: number = greetingDelay + (Math.random() * greetingMaxTimespan);
        window.setTimeout(() => {
            // First check if user is still in the room, would be silly if not!
            if (this.isStillInRoom()) {
                logToConsole("Greeting {0} ({1})".format(this.name, this.id));

                // Pick a greeting and send it
                var greetingMessage = greetings[Math.floor(Math.random() * greetings.length)];
                sendChatMessage(greetingMessage.format(this.name));
            }
        }, timeout);
    }

    /**
     * Checks if this user is still present in the room
     * @returns { user is in the room } 
     */
    isStillInRoom(): boolean {
        var searchResult = $('#avatar_{0}'.format(this.id));
        if (searchResult.length === 0) {
            this.active = false;
        }

        return searchResult.length > 0;
    }
}

/**
 * Extending the javascript string interface
 */
interface String {
    format(...replacements: string[]): string;
}

/**
 * Add a C#-like format function to string, if not already present
 */
if (!String.prototype.format) {
    String.prototype.format = function () {
        var args = arguments;
        return this.replace(/{(\d+)}/g, (match, number) => (typeof args[number] != 'undefined'
            ? args[number]
            : match));
    };
}

// Determine who the DJ is, and who you are
// TODO Find a better way to determine this
var dj: string = $("#marqueeTitle")[0].innerHTML.replace('</h1>', '').replace('<h1>', '').trim(); /*Current DJ name*/
var me: string = $("ul#userDropDown li:eq(2) a").text().trim();  /* Your name on Mixify */

// Initialize a new UserCollection and set the disallowed user names
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

    // TODO This shouldn't be needed, change to check on all current avatars, add them w/o greeting them
    if (sessionStorage.getItem("active") === null) {  /* Was this stream refreshed? */
        sessionStorage.setItem("active", "true");   /* You entered the stream for the first time */
    } else {
        retrieveAttendees();
    }
    
    // Everytime the DOM tree gets modified, fire this event
    // TODO Use NodeInserted and NodeRemoved and subsequent actions
    $('#avatarContainer').bind("DOMSubtreeModified", (e) => {
        var element = $(e.target);
        // Only continue if th element that is being added has the 'avatar' class
        if (element.attr("class") === "avatar") {
            var id = element.attr("id").split("_")[1];
            var querystring = element.attr("data-querystring");

            // Get data from the user api
            jQuery.ajaxSetup({ async: false });
            var data = jQuery.get("http://www.mixify.com/user/info-basic/?{0}".format(querystring));
            var responseHtml = $(data.responseText);

            // Search the response data for the username and initialize a new user
            var username = $(responseHtml).find('.username')[0].innerHTML;
            users.add(new User(id, username));
        }
    });
}

/**
 * Retrieve all attendees
 * @todo Make return a collection of users instead
 */
function retrieveAttendees(): void {
    // Wait for fc() to be available
    // TODO Figure out if this can be done better
    if (fc() != null) {
        logToConsole("Retrieving attendance list");

        // Get data from the spectator cache
        jQuery.ajaxSetup({ async: false });
        var data = jQuery.get(url);
        var responseHtml = $(data.responseText);

        // Search for module-info elements in the response and iterate through it
        // TODO Turn into a more useful method
        $(responseHtml).find('.module-info').each((index, element) => {
            // Find the username and id and initialize a new user based on it
            var jqueryElement = $(element);
            var username = jqueryElement.find('.username')[0].innerHTML;
            var id = jqueryElement.find('.bt-wrapper').attr('data-uuid');
            users.add(new User(id, username));
        });
    }
}

/**
 * Sends message to chat
 * @param message Message
 */
function sendChatMessage(message: string): void {
    fc().fc_sendChat(message, dataString);
}

/**
 * Logs to console, if debug mode is true
 * @param message Message to log
 * @param optionalParams Optional parameters
 */
function logToConsole(message?: any, ...optionalParams: any[]): void {
    if (debugMode) {
        console.log(message, optionalParams);
    }
}