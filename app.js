const message = document.getElementById("message");
const cookieDetails = document.getElementById("cookieDetails");
const cookieList = document.getElementById("cookieList");

(async function initPopupWindow() {
    try {
        // Listen for cookie changes
        chrome.cookies.onChanged.addListener(handleCookieChange);
    } catch (error) {
        console.error("Error adding listener for cookie changes:", error);
    }
})();

function handleCookieChange(changeInfo) {
    try {
        const cookie = changeInfo.cookie;
        const action = changeInfo.removed ? "deleted" : "changed/added";

        const protocol = cookie.secure ? "https://" : "http://";
        const url = protocol + cookie.domain + cookie.path;
        const time = new Date(cookie.expirationDate * 1000); // Convert expirationDate to milliseconds

        setMessage(`<div id="message-module">${cookie.name} from ${url} has been ${action}.</div>`);
        // set_notification("Cookie Monitor", `Cookie ${cookie.name} on URL ${url} has been ${action}.`);
        console.log(`<div id="message-module">${cookie.name} from ${url} has been ${action}.</div>`);
    } catch (error) {
        console.error("Error handling cookie change:", error);
    }
}

function setMessage(str) {
    message.innerHTML = str;
    message.hidden = false;
}

// Get the current domain
let domain;

try {
    chrome.tabs.query({ active: true, currentWindow: true }, async function (tabs) {
        try {
            if (tabs.length > 0) {
                const currentTab = tabs[0];
                const url = new URL(currentTab.url);
                domain = url.hostname;
            } else {
                console.log("No active tab found.");
            }
        } catch (error) {
            console.error("Error querying active tab:", error);
        }
    });
} catch (error) {
    console.error("Error querying tabs:", error);
}

// Function to fetch cookies and update the cookie details
async function updateCookieDetails() {
    try {
        // Get the current tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        // If there's no active tab, return
        if (!tab) {
            console.error("No active tab found");
            return;
        }

        // Get cookies for the current tab
        const cookies = await chrome.cookies.getAll({ url: tab.url });

        const cookieList = document.getElementById("cookieList");
        cookieList.innerHTML = "";

        if (cookies.length > 0) {
            const numberOfCookies = cookies.length;
            const metaDetails = document.createElement("p");
            metaDetails.innerHTML = `cookie count ${numberOfCookies} <br> for ${tab.url}`;
            cookieList.appendChild(metaDetails);

            for (const cookie of cookies) {
                const li = document.createElement("li");
                const cookieName = document.createElement("span");
                cookieName.textContent = cookie.name + " > " + cookie.domain;
                cookieName.title = cookie.name + " > " + cookie.domain;
                li.appendChild(cookieName);

                // Create a delete button
                const deleteButton = document.createElement("button");
                deleteButton.textContent = "Delete";
                deleteButton.addEventListener("click", async function () {
                    await chrome.cookies.remove({ url: `https://${cookie.domain}${cookie.path}`, name: cookie.name });
                    updateCookieDetails(); // Refresh the cookie details after deletion
                });

                li.appendChild(deleteButton);

                cookieList.appendChild(li);
            }
        } else {
            const li = document.createElement("li");
            li.textContent = "No cookies found.";
            cookieList.appendChild(li);
        }
    } catch (error) {
        console.error("Error updating cookie details:", error);
    }
}

// Update cookie details initially
updateCookieDetails();

// Listen for cookie changes
chrome.cookies.onChanged.addListener(updateCookieDetails);

const storageList = document.getElementById("storageList");
storageList.innerHTML = "";
// Function to fetch and log local storage and session storage data for the current tab
async function scanTabStorage() {
    try {
        // Get the current tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        // If there's no active tab, return
        if (!tab) {
            storageList.innerHTML = "No active tab found";
            return;
        }

        // Execute a content script in the current tab to retrieve storage data and private state tokens
        chrome.scripting.executeScript(
            {
                target: { tabId: tab.id },
                function: () => {
                    const localStorageData = {};
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        const value = localStorage.getItem(key);
                        localStorageData[key] = value;
                    }

                    const sessionStorageData = {};
                    for (let i = 0; i < sessionStorage.length; i++) {
                        const key = sessionStorage.key(i);
                        const value = sessionStorage.getItem(key);
                        sessionStorageData[key] = value;
                    }

                    return { localStorageData, sessionStorageData };
                },
            },
            (result) => {
                try {
                    // Log the storage data and private state tokens for the current tab
                    // Get the container element to display storage data
                    const storageList = document.getElementById("storageList");
                    storageList.innerHTML = ""; // Clear previous content

                    const localStorageHeading = document.createElement("h4");
                    localStorageHeading.textContent = "Local Storage";
                    storageList.appendChild(localStorageHeading);

                    // Display local storage data or "No data found" message
                    if (Object.keys(result[0].result.localStorageData).length === 0) {
                        const noDataMessage = document.createElement("li");
                        noDataMessage.textContent = "No data found in local storage";
                        storageList.appendChild(noDataMessage);
                    } else {
                        for (const key in result[0].result.localStorageData) {
                            const li = document.createElement("li");

                            const span = document.createElement("span");
                            span.textContent = `${key} > ${result[0].result.localStorageData[key]}`;
                            li.appendChild(span);

                            // Create a delete button for local storage data entry
                            const deleteButton = document.createElement("button");
                            deleteButton.textContent = "Delete";
                            deleteButton.addEventListener("click", async function () {
                                // Execute a content script in the current tab to remove the entry from local storage
                                chrome.scripting.executeScript({
                                    target: { tabId: tab.id },
                                    func: (keyToRemove) => {
                                        localStorage.removeItem(keyToRemove);
                                    },
                                    args: [key],
                                });
                                // Remove the entry from the displayed list
                                li.remove();
                            });

                            li.appendChild(deleteButton);
                            storageList.appendChild(li);
                        }
                    }

                    const sessionStorageHeading = document.createElement("h4");
                    sessionStorageHeading.textContent = "Session Storage";
                    storageList.appendChild(sessionStorageHeading);

                    // Display session storage data or "No data found" message
                    if (Object.keys(result[0].result.sessionStorageData).length === 0) {
                        const noDataMessage = document.createElement("li");
                        noDataMessage.textContent = "No data found in session storage";
                        storageList.appendChild(noDataMessage);
                    } else {
                        for (const key in result[0].result.sessionStorageData) {
                            const li = document.createElement("li");

                            const span = document.createElement("span");
                            span.textContent = `${key} > ${result[0].result.sessionStorageData[key]}`;
                            li.appendChild(span);

                            // Create a delete button for session storage data entry
                            const deleteButton = document.createElement("button");
                            deleteButton.textContent = "Delete";
                            deleteButton.addEventListener("click", async function () {
                                // Execute a content script in the current tab to remove the entry from session storage
                                chrome.scripting.executeScript({
                                    target: { tabId: tab.id },
                                    func: (keyToRemove) => {
                                        sessionStorage.removeItem(keyToRemove);
                                    },
                                    args: [key],
                                });
                                // Remove the entry from the displayed list
                                li.remove();
                            });

                            li.appendChild(deleteButton);
                            storageList.appendChild(li);
                        }
                    }
                } catch (error) {
                    console.error("Error scanning tab storage:", error);
                }
            }
        );
    } catch (error) {
        console.error("Error scanning tab storage:", error);
    }
}

// Call the function to scan tab storage initially
scanTabStorage();

const set_notification = (title, message) => {
    try {
        chrome.runtime.sendMessage("", {
            type: "notification",
            options: {
                title: title,
                message: message,
                iconUrl: "/icon.png",
                type: "basic",
            },
        });
    } catch (error) {
        console.error("Error setting notification:", error);
    }
};

const deleteAllButton = document.createElement("button");
deleteAllButton.textContent = "Delete All Cookies";
deleteAllButton.addEventListener("click", async function () {
    try {
        const cookies = await chrome.cookies.getAll({ domain });
        for (const cookie of cookies) {
            await chrome.cookies.remove({ url: `https://${cookie.domain}${cookie.path}`, name: cookie.name });
        }
        updateCookieDetails(); // Refresh the cookie details after deletion
    } catch (error) {
        console.error("Error deleting all cookies:", error);
    }
});

document.body.appendChild(deleteAllButton);
