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



async function getSignature() {
    const clientId = getClientId();
    if (!clientId) {
        handleError("You don't have a clientID, try refreshing your page.");
        localStorage.setItem("clientId", clientId);
    }
    const response = await fetch("/get_signature", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            clientId: clientId
        })
    });
    if (!response.ok) {
        handleError("Could not recieve signature. You can't do anything.");
    }
    const data = await response.json();
    if (data.signature === null || data.signature === undefined) { // i'm scared of this if statement
        localStorage.setItem("signature", signature);
        return data.signature;
    }
}

async function deletePost() {
    const signature = await getSignature();
    const cliendId = getClientId();
    const response = await fetch("/deletePost", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            clientId: cliendId,
            signature: signature
        })
    });

    if (response.ok) {
        const data = await response.json();
        if (data.status === "deleted") {
            console.log("Post deleted!");
        }
    } else {
        console.error("Delete failed");
    }
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
            const clientId = post[2];
            // do stuff
            posts.push(content, clientId);
        });
        const container = document.getElementById("userposts");
        container.innerHTML = ""; // cleared!
        posts.forEach(content, clientId => {
            const postEl = document.createElement("div");
            postEl.className = "post";
            postEl.innerText = content;
            postEl.dataset.clientId = clientId;
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

// main.
form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const content = document.getElementById("content").value;
    const userId = getClientId();
    const signature = localStorage.getItem("signature");

    const response = await fetch("/post", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            content: content,
            userId: userId,
            signature: signature
        })
    });

    if (response.ok) {
        closePostGUI();
        await getPosts();
    } else {
        handleError("Could not post.");
    }
});

setInterval(async function() {
    await getPosts();
    const result = await isBanned();
    if (result === true) {
        document.getElementsByTagName("body")[0].innerText = "You've been banned.";
    }
}, 10000);
