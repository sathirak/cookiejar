const message = document.getElementById("message");
const cookieDetails = document.getElementById("cookieDetails");
const cookieList = document.getElementById("cookieList");

(async function initPopupWindow() {

    // Listen for cookie changes
    chrome.cookies.onChanged.addListener(handleCookieChange);
})();

function handleCookieChange(changeInfo) {
    const cookie = changeInfo.cookie;
    const action = changeInfo.removed ? "deleted" : "changed/added";

    const protocol = cookie.secure ? "https://" : "http://";
    const url = protocol + cookie.domain + cookie.path;
    const time = new Date(cookie.expirationDate * 1000); // Convert expirationDate to milliseconds

    setMessage(`<div id="message-module"> cookie ${cookie.name} on ${url} has been ${action}.</div>`);
    // set_notification("Cookie Monitor", `Cookie ${cookie.name} on URL ${url} has been ${action}.`);
    console.log(`<div id="message-module"> cookie ${cookie.name} on URL ${url} has been ${action}.</div>`);

}

function setMessage(str) {
    message.innerHTML = str;
    message.hidden = false;
}

// Get the current domain
let domain;

chrome.tabs.query({ active: true, currentWindow: true }, async function(tabs) {
    if (tabs.length > 0) {
        const currentTab = tabs[0];
        const url = new URL(currentTab.url);
        domain = url.hostname;

    } else {
        console.log("No active tab found.");
    }
});


// Function to fetch cookies and update the cookie details
async function updateCookieDetails() {
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
            cookieName.textContent = cookie.name;
            li.appendChild(cookieName);

            // Create a delete button
            const deleteButton = document.createElement("button");
            deleteButton.textContent = "Delete";
            deleteButton.addEventListener("click", async function() {
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
}


// Update cookie details initially
updateCookieDetails();

// Listen for cookie changes
chrome.cookies.onChanged.addListener(updateCookieDetails);



const set_notification = (title, message) => {
    chrome.runtime.sendMessage("", {
        type: "notification",
        options: {
            title: title,
            message: message,
            iconUrl: "/icon.png",
            type: "basic",
        },
    });
};

const deleteAllButton = document.createElement("button");
deleteAllButton.textContent = "Delete All Cookies";
deleteAllButton.addEventListener("click", async function() {
    const cookies = await chrome.cookies.getAll({ domain });
    for (const cookie of cookies) {
        await chrome.cookies.remove({ url: `https://${cookie.domain}${cookie.path}`, name: cookie.name });
    }
    updateCookieDetails(); // Refresh the cookie details after deletion
});

document.body.appendChild(deleteAllButton);