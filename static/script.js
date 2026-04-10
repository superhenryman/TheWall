const postButton = document.getElementById("post");
const errorBuffer = document.getElementById("error");
const sendPostButton = document.getElementById("post-button");
const form = document.getElementById("post-form");
let banned = false;

async function deletePost(postId) { 
    if (banned) { 
        handleError("You are banned from deleting."); 
        return -1;
    } 
    const response = await fetch("/deletePost", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken 
        },
        body: JSON.stringify({
            postId: postId
        })
    });
    if (response.status === 403) {
        banned = true;
    }
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
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        },
    })
    const json = await result.json();
    return json.status;
}

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

async function getPosts() {
    let posts = [];
    document.getElementById("loading").style.display = "block";
    try {
        const rawData = await fetch("/posts", { method: "GET" });
        const json = await rawData.json();

        json.forEach(post => {
            const id = post[0];
            const content = post[1];
            const clientId = post[2];
            posts.push({ content, clientId, id });
        });

        const container = document.getElementById("userposts");
        container.innerHTML = "";

        posts.forEach(({ content, clientId, id }) => {
            const postEl = document.createElement("div");
            postEl.className = "post";
            postEl.innerText = content;
            postEl.dataset.clientId = clientId;
            postEl.dataset.id = id;

            if (clientId === myID) {
                const deleteBtn = document.createElement("button");
                deleteBtn.innerText = "🗑️ Delete";
                deleteBtn.onclick = async () => {
                    const result = await deletePost(id);
                    if (result !== -1) {
                        postEl.remove();
                    }
                };
                postEl.appendChild(deleteBtn);
            }
            //const img = document.createElement("img");
            //img.src = "/static/lesbian.png";
            //postEl.appendChild(img);
            container.appendChild(postEl);
        });

    } catch (err) {
        console.log("Failed to fetch posts:", err);
        handleError(`Failed to retrieve posts or add them: ${err}`);
    } finally {
        document.getElementById("loading").style.display = "none";
    }
}

postButton.addEventListener('click', async function () { 
    if (banned) { return handleError("You are banned from posting."); }
    await showPostGUI();
});
document.addEventListener("DOMContentLoaded", () => {
    getPosts();
    document.getElementById("back").addEventListener("click", function(){closePostGUI();});

});
form.addEventListener("input", function() {
    const content = document.getElementById("content").value;
    const lengthLabel = document.getElementById("length");
    lengthLabel.innerText = `${content.length}/500`;
    if (content.length > 500) {
        lengthLabel.style.color = "red";
    } else {
        lengthLabel.style.color = "black";
    }
});
// main.
form.addEventListener("submit", async function (e) {
    if (banned) { return handleError("You are banned from posting."); }
    e.preventDefault();

    const content = document.getElementById("content").value;
    if (content.length === 0) {
        return handleError("Post content cannot be empty.");
    }
    if (content.length > 500) {
        return handleError("Post content cannot exceed 500 characters.");
    }
    const response = await fetch("/post", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken 
        },
        body: JSON.stringify({
            content: content,
        })
    });
    if (response.status === 403) {
        banned = true;
    }
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
    if (result || banned) {
        banned = true;
        document.getElementById("psa").innerText = "You've been banned. You can still view posts, but cannot post or delete.";
    }
}, 10000);
