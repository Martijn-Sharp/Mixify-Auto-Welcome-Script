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
    Lowercased
}

enum NameImportanceOptions {
    None,
    Low,
    Moderate,
    High
}

// TODO Split settings and implementation scripts
///////////////////////////////////////////////////////////
/////                    SETTINGS                     /////
///////////////////////////////////////////////////////////

/** Turn debug mode on/off (true/false) */
var debugMode: boolean = true;

/** A collection of welcome greetings. {0} = name of the user */
var welcomeGreetings: Array<IGreeting> = [
    { message: "Hey {0}", formatOption: FormatNameOptions.CapitalizeOnlyFirstChar },
    { message: "hey {0}", formatOption: FormatNameOptions.Lowercased },
    { message: "sup {0}", formatOption: FormatNameOptions.Lowercased },
    { message: "oi {0}", formatOption: FormatNameOptions.CapitalizeOnlyFirstChar },
    { message: "Hai der, {0}", formatOption: FormatNameOptions.CapitalizeOnlyFirstChar },
    { message: "hello {0}", formatOption: FormatNameOptions.CapitalizeOnlyFirstChar },
    { message: "ayy {0}!", formatOption: FormatNameOptions.Lowercased },
    { message: "Ermagerd! It's {0}", formatOption: FormatNameOptions.CapitalizeOnlyFirstChar }
];

/** A collection of welcome back greetings. {0} = name of the user */
var welcomeBackGreetings: Array<IGreeting> = [{ message: "Welcome back {0}" }];

/** Ignore these users by name */
var ignoredUsers: Array<string> = ["Guest"];

/** The minimum amount of time (in milliseconds) before a greeting gets send */
var greetingDelay: number = 2000;

/** The timespan (in milliseconds) in which the greeting will be send, after the delay */
var greetingMaxTimespan: number = 18000;

/** Characters that can be removed from a name */
var trimmableCharacters: Array<string> = ["-", "_", "=", ".", ":", "[", "]", "<", ">" ];

///////////////////////////////////////////////////////////
/////                   USER STUFF                    /////
///////////////////////////////////////////////////////////

/** Collection class for users */
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

/** User class */
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
                var outputName: string = formatName(new Name(this.name), greetingMessage.formatOption);
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

///////////////////////////////////////////////////////////
/////                    GREETING                     /////
///////////////////////////////////////////////////////////

/** Greeting interface */
interface IGreeting {
    message: string;
    formatOption?: FormatNameOptions;
}

/** User greeting interface (UNUSED YET) */
interface IUserGreeting {
    id: string;
    onJoining: string;
    onRejoining: string;
}

///////////////////////////////////////////////////////////
/////                   NAME STUFF                    /////
///////////////////////////////////////////////////////////

/** Name interface  */
interface IName {
    fullName: string;
    parts: INamePart[];
    capsAreMeaningful: boolean;
}

/** Name implementation */
class Name implements IName {
    constructor(fullName) {
        this.fullName = fullName;
        this.setCapsAreMeaningful();
        this.createNameParts();
    }

    fullName: string;
    parts: INamePart[];
    capsAreMeaningful: boolean;

    /**
     * Determines if uppercase characters mean anything in the grand scheme of things
     * @param text The text
     */
    setCapsAreMeaningful() : void {
        var amountOfCaps: number = 0;
        var position: number = 0;
        var character: string;
        while (position <= this.fullName.length) {
            character = this.fullName.charAt(position);
            if (textIsUppercase(character)) {
                amountOfCaps++;
            }

            position++;
        }

        this.capsAreMeaningful = amountOfCaps / this.fullName.length < 0.5;
    }

    createNameParts(): void {
        this.parts = [];
        var parts = trimText(this.fullName, trimmableCharacters).split(" ").filter(x => x.length > 0);
        var position: number = 0;
        for (let part of parts) {
            var namePart: INamePart = new NamePart(part, position, this);
            this.parts.push(namePart);
            position++;
        }
    }
}

/** Name part interface */
interface INamePart {
    importance: NameImportanceOptions;
    value: string;
    position: number;
    parent: IName;
}

/** Name part implementation */
class NamePart implements INamePart {
    constructor(value: string, position: number, parent: IName) {
        this.value = value;
        this.position = position;
        this.parent = parent;
        this.setImportance();
    }

    importance: NameImportanceOptions;
    value: string;
    position: number;
    parent: IName;

    setImportance(): void {
        var importance: NameImportanceOptions;

        // Name parts of 3 characters or less are either very important, or not at all
        if (this.value.length <= 3) {
            if (this.value.toLowerCase() === "dj") {
                // 'DJ' is usually an important part
                importance = NameImportanceOptions.None;
            } else if (this.parent.capsAreMeaningful && textIsUppercase(this.value)) {
                // If caps are used meaninful in the name overall and the part has all caps, then it's probably important
                importance = NameImportanceOptions.High;
            } else if (this.position === 0 || (this.position !== 0 && this.parent.parts[this.position - 1].importance === NameImportanceOptions.None)) {
                // If the importance isn't determined yet and the word is at the start, high chance it's redundant
                importance = NameImportanceOptions.None;
            } else {
                // Else just set it on low importance
                importance = NameImportanceOptions.Low;
            }
        } else {
            // Nothing special
            importance = NameImportanceOptions.Moderate;
        }
        
        this.importance = importance;
    }
}

///////////////////////////////////////////////////////////
/////                   OTHER STUFF                   /////
///////////////////////////////////////////////////////////

/** Extending the javascript string interface */
interface String {
    format(...replacements: string[]): string;
}

/** Add a C#-like format function to string, if not already present */
if (!String.prototype.format) {
    String.prototype.format = function () {
        var args = arguments;
        return this.replace(/{(\d+)}/g, (match, number) => (typeof args[number] != 'undefined'
            ? args[number]
            : match));
    };
}

///////////////////////////////////////////////////////////
/////                 DOCUMENT READY                  /////
///////////////////////////////////////////////////////////

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

///////////////////////////////////////////////////////////
/////                  MIXIFY STUFF                   /////
///////////////////////////////////////////////////////////
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

///////////////////////////////////////////////////////////
/////                  NAME FORMATTING                /////
///////////////////////////////////////////////////////////
function formatName(name: IName, option?: FormatNameOptions): string {
    // Get all the parts that we'll work with
    var nameParts = getSignificantNameParts(name);
    
    // Join all parts
    var nameAsString = nameParts.map(x => x.value).join(" ");
    switch (option) {
        case FormatNameOptions.CapitalizeOnlyFirstChar:
            return nameAsString[0].toUpperCase() + nameAsString.substring(1).toLowerCase();
        case FormatNameOptions.Lowercased:
            return nameAsString.toLowerCase();
        default:
            return nameAsString;
    }
}

function getSignificantNameParts(name: IName): INamePart[] {
    // If there are any high important parts, return the first one
    // TODO: Determine if there are better alternatives to returning the first item
    var highImportance = name.parts.filter(value => value.importance === NameImportanceOptions.High);
    if (highImportance.length > 0) {
        return [highImportance[0]];
    }

    // If there's only 1 moderate important part, return that one
    var moderateImportance = name.parts.filter(value => value.importance === NameImportanceOptions.Moderate);
    if (moderateImportance.length === 1) {
        return moderateImportance;
    }

    // If the amount of low importance parts is higher than 0 and lower than the amount of moderate parts, then return low + moderate parts
    var lowImportance = name.parts.filter(value => value.importance === NameImportanceOptions.Low);
    if (lowImportance.length > 0 && lowImportance.length < moderateImportance.length) {
        return name.parts.filter(value => value.importance === NameImportanceOptions.Moderate || value.importance === NameImportanceOptions.Low);
    }

    // If at this point there are moderate parts, return those
    if (moderateImportance.length !== 0) {
        return moderateImportance;
    }

    if (moderateImportance.length !== 0) {
        return lowImportance;
    }

    // Return whatever is left
    return name.parts.filter(value => value.importance === NameImportanceOptions.None);
}

///////////////////////////////////////////////////////////
/////                  GENERAL STUFF                  /////
///////////////////////////////////////////////////////////

/**
 * Checks if a text is all uppercase
 * @param text Text
 */
function textIsUppercase(text: string): boolean {
    var position: number = 0;
    var character: string;
    while (position < text.length) {
        character = text.charAt(position);

        // If any character is a numeric, or matches a lowercase, then the text isn't fully uppercase
        if ((character >= '0' && character <= '9') || character === character.toLowerCase()) {
            return false;
        }

        position++;
    }

    return true;
}

/**
 * Trims a string
 * @param text
 * @param trimCharacters
 */
function trimText(text: string, trimCharacters: string[]) : string {
    var processedName: string = text;
    for (let trimCharacter of trimCharacters) {
        processedName = processedName.split(trimCharacter).join(" ");
    }

    // Replace trailing numerics (regex) and trim
    return processedName.replace(/\d+$/, "").trim();
}