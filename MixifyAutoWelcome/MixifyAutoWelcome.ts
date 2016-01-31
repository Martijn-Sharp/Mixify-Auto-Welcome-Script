/// <reference path="Typings/jquery.d.ts" />
/// <reference path="Typings/mixify.d.ts" />

// ==UserScript==
// @name        Fic's Mixify Auto Welcome Script (Martijn Remix)
// @namespace   Booth
// @include     http://www.mixify.com/*/live/*
// @version     1.7.2
// @grant       none
// @description This script can be used on Mixify.com while streaming your DJ set. The main reason why I created this script is that I couldn't see every single person who enters the stream so I thought it could be nice if a script can announce in chat who entered the stream with a warm welcome message.
// ==/UserScript==

enum FormatNameOptions {
    CapitalizeOnlyFirstChar,
    Lowercased,
    RemoveUnderscores,
    Trim,
    UseFirstOfTwoWords,
    UseLongestOfThreeOrMoreWords
}

// TODO Split settings and implementation scripts
/**
 * Turn debug mode on/off
 */
const debugMode: boolean = true;

/**
 * A collection of welcome greetings
 * {0} = name of the user
 */
const welcomeGreetings: Array<IGreeting> = [
    { message: "Hey {0}", formatOption: FormatNameOptions.CapitalizeOnlyFirstChar },
    { message: "hey {0}", formatOption: FormatNameOptions.Lowercased },
    { message: "sup {0}", formatOption: FormatNameOptions.Lowercased },
    { message: "oi {0}", formatOption: FormatNameOptions.CapitalizeOnlyFirstChar },
    { message: "Greetings, {0}", formatOption: FormatNameOptions.CapitalizeOnlyFirstChar },
    { message: "hello {0}", formatOption: FormatNameOptions.CapitalizeOnlyFirstChar },
    { message: "ayy {0}!", formatOption: FormatNameOptions.Lowercased },
    { message: "avast thee scurvy knave, {0}", formatOption: FormatNameOptions.Lowercased },
    { message: "Ermagerd! It's {0}", formatOption: FormatNameOptions.CapitalizeOnlyFirstChar },
];

/**
 * A collection of welcome back greetings
 * {0} = name of the user
 */
const welcomeBackGreetings: Array<IGreeting> = [{ message: "Welcome back {0}" }];

/**
 * Ignore these users by name
 */
const ignoredUsers: Array<string> = ["Guest"];

/**
 * The minimum amount of time (in milliseconds) before a greeting gets send
 */
const greetingDelay: number = 2000;

/**
 * The timespan (in milliseconds) in which the greeting will be send, after the delay
 */
const greetingMaxTimespan: number = 18000;

/**
 * Default name formatting options
 */
const defaultFormatOptions: Array<FormatNameOptions> = [FormatNameOptions.Trim, FormatNameOptions.RemoveUnderscores, FormatNameOptions.UseFirstOfTwoWords, FormatNameOptions.UseLongestOfThreeOrMoreWords];

/**
 * Collection class for users
 */
class UserCollection {
    users: Array<User> = [];
    disallowedUsers: Array<string> = [];

    /**
     * Add a new user
     * @param user User object
     */
    add(user: User): void {
        logToConsole("Trying to add {0}".format(user.name));
        if (this.userIsAllowed(user)) {
            if (!this.userExists(user.id)) {
                this.users.push(user);
                logToConsole("Succesfully added {0} ({1})".format(user.name, user.id));
                user.greet(welcomeGreetings);
            } else {
                // TODO: Finish other code first
                //user.greet(welcomeBackGreetings);
            }
        } else {
            logToConsole("{0} is not allowed to be added".format(user.name));
        }
    }

    /**
     * Check if an user is allowed
     * @param name Name of the user
     * @returns { User is allowed } 
     */
    private userIsAllowed(user: User): boolean {
        var userAllowedByName: boolean = $.inArray(user.name, this.disallowedUsers) === -1;
        var userAllowedById: boolean = $.inArray(user.id, this.disallowedUsers) === -1;
        return userAllowedByName && userAllowedById;
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
    greet(greetings: Array<IGreeting>): void {
        // Determine timeout in ms
        var timeout: number = greetingDelay + (Math.random() * greetingMaxTimespan);
        window.setTimeout(() => {
            // First check if user is still in the room, would be silly if not!
            if (this.isStillInRoom()) {
                logToConsole("Greeting {0} ({1})".format(this.name, this.id));

                // Pick a greeting and send it
                var greetingMessage = greetings[Math.floor(Math.random() * greetings.length)];
                var outputName: string = this.name;
                for (let option of defaultFormatOptions) {
                    outputName = formatName(outputName, option);
                }

                if (greetingMessage.formatOption) {
                    outputName = formatName(outputName, greetingMessage.formatOption);
                }

                sendChatMessage(greetingMessage.message.format(outputName));
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

interface IGreeting {
    message: string;
    formatOption?: FormatNameOptions;
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

// Initialize a new UserCollection
var userList: UserCollection = new UserCollection();
var url: string;
var dataString: string;

// Run the script only if you're streaming
if ($('#eventBroadcaster').length > 0) {
    // Add ignored users and yourself
    userList.disallowedUsers = ignoredUsers;
    userList.disallowedUsers.push($('body').attr('data-user-id'));

    // Getting url to call AJAX
    var queryString = $("#specatorsDockItem").attr("data-querystring");
    url = "http://www.mixify.com/room/spectators/cache/1/?" + queryString;
    dataString = queryString.split("=")[1];
    
    if (sessionStorage.getItem("active") === null) {  /* Was this stream refreshed? */
        sessionStorage.setItem("active", "true");   /* You entered the stream for the first time */
    } else {
        retrieveAttendees();
    }
    
    // Everytime the DOM tree gets modified, fire this event
    // TODO Add NodeRemoved to detect a user that leaves
    $('#avatarContainer').bind("DOMNodeInserted", (e) => {
        var element = $(e.target);
        // Only continue if th element that is being added has the 'avatar' class
        if (element.attr("class") === "avatar") {
            // Get the ID
            var id = element.attr("id").split("_")[1];
            var querystring = element.attr("data-querystring");

            // Get the username
            var username = getUsernameFromUserData(querystring);
            userList.add(new User(id, username));
        }
    });
}

/**
 * Retrieve all attendees
 * @todo Make it return a collection of users instead
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
            userList.add(new User(id, username));
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

/**
 * Get the username from querying the user data
 * @param query query string
 * @returns { Username } 
 */
function getUsernameFromUserData(query: string): string {
    // Get the user data
    var data = getUserData(query);

    // Parse the response for the username
    var responseText = $(data.responseText);
    var usernameElement = $(responseText).find('.username');
    if (usernameElement.length === 0) {
        logToConsole("No username found for user using query {0}".format(query));
    }

    return usernameElement[0].innerHTML;
}

/**
 * Gets the user data with a query string
 * @param query query string
 * @returns { GET response } 
 */
function getUserData(query: string): JQueryXHR {
    // Get data from the user api
    jQuery.ajaxSetup({ async: false });
    return jQuery.get("http://www.mixify.com/user/info-basic/?{0}".format(query));
}

function formatName(name: string, option: FormatNameOptions) : string {
    switch (option) {
        case FormatNameOptions.CapitalizeOnlyFirstChar:
            return name[0].toUpperCase() + name.substring(1).toLowerCase();
        case FormatNameOptions.Lowercased:
            return name.toLowerCase();
        case FormatNameOptions.RemoveUnderscores:
            return name.replace("_", " ");
        case FormatNameOptions.Trim:
            return name.replace('-', ' ').replace('=', ' ').replace('.', '').trim();
        case FormatNameOptions.UseFirstOfTwoWords:
            return useFirstOfTwoWords(name);
        case FormatNameOptions.UseLongestOfThreeOrMoreWords:
            return useLongestOfThreeOrMoreWords(name);
        default:
            return name;
    }
}

function useFirstOfTwoWords(name: string) : string {
    var splitted = name.split(" ").filter(Boolean);
    if (splitted.length === 2) {
        return splitted[0];
    }

    return name;
}

function useLongestOfThreeOrMoreWords(name: string): string {
    var splitted = name.split(" ").filter(Boolean);
    if (splitted.length > 2) {
        var longestWord: string = "";
        for (let word of splitted) {
            if (word.length > longestWord.length) {
                longestWord = word;
            }
        }

        return longestWord;
    }

    return name;
}