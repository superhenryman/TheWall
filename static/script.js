const postButton = document.getElementById("post");
const errorBuffer = document.getElementById("error");
const sendPostButton = document.getElementById("post-button");
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
    try {
        const rawData = await fetch("/posts", {
            method: "GET"
        });
        const json = await rawData.json();
        console.log(json);
    } catch (err) {
        console.log("Failed to fetch posts:", err);
        handleError(`Failed to retrieve posts, error: ${err}`);
        return;
    }
}
document.addEventListener("DOMContentLoaded", () => {
    getPosts();
    document.getElementById("back").addEventListener("click", function(){closePostGUI();});
    postButton.addEventListener('click', function (){showPostGUI();});

});