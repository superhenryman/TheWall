const postButton = document.getElementById("post");
const errorBuffer = document.getElementById("error");
const sendPostButton = document.getElementById("post-button");
const form = document.getElementById("post-form");

function getClientId() {
    let clientId = localStorage.getItem("clientId");
    if (!clientId) {
        clientId = crypto.randomUUID();
        localStorage.setItem("clientId", clientId);
    }
    return clientId;
}

async function isBanned() {
    const result = await fetch("/isbanned", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            userId: getClientId()
        })
    })
    const json = await result.json();
    return json.status;
}

isBanned().then(result => {
  if (result === "true") {
    document.body.innerHTML = '<p style="text-align:center; font-size: 40px;">You have been banned.</p>';
  }
});

function showPostGUI() {
    document.getElementById('post-gui').style.display = "block";
    document.getElementById("post-form").style.display =  "flex";
    document.getElementById("content").style.display = "block";
    postButton.style.display = "none";
}

function checkPostGUIOpen() {
    if (document.getElementById("post-gui").style.display === "block" && document.getElementById("post-form").style.display === "flex" && document.getElementById("content").style.display === "block" && postButton.style.display === "none") {
        return true;
    } else {
        return false;
    }
}

function closePostGUI() {
    document.getElementById('post-gui').style.display = "none";
    document.getElementById("post-form").style.display =  "none";
    document.getElementById("content").style.display = "none";
    postButton.style.display = ""; // if it works don't touch it lol
}


function handleError(error) {
    errorBuffer.innerText = `${error}`;
    errorBuffer.style.display = "block";
}

const userIdInput = document.createElement("input");
userIdInput.type = "hidden";
userIdInput.name = "userId";
userIdInput.id = "userId";
userIdInput.value = getClientId();  // actual value, not placeholder
form.appendChild(userIdInput);

async function getPosts() {
    let posts = [];
    document.getElementById("loading").style.display = "block";
    try {
        const rawData = await fetch("/posts", {
            method: "GET"
        });
        const json = await rawData.json();
        json.forEach(post => {
            const id = post[0];
            const content = post[1];
            // do stuff
            posts.push(content);
        });
        const container = document.getElementById("userposts");
        container.innerHTML = ""; // cleared!
        posts.forEach(content => {
            const postEl = document.createElement("div");
            postEl.className = "post";
            postEl.innerText = content;
            container.appendChild(postEl);
        });
    } catch (err) {
        console.log("Failed to fetch posts:", err);
        handleError(`Failed to retrieve posts or add them, error: ${err}`);
        document.getElementById("loading").style.display = "none";
        return;
    }
    document.getElementById("loading").style.display = "none";
}
postButton.addEventListener('click', async function (){ await showPostGUI();});
document.addEventListener("DOMContentLoaded", () => {
    getPosts();
    document.getElementById("back").addEventListener("click", function(){closePostGUI();});

});

setInterval(async function() {
    await getPosts();
    const result = await isBanned();
    if (result === true) {
        document.getElementsByTagName("body")[0].innerText = "You've been banned.";
    }
}, 10000);
