document.addEventListener('DOMContentLoaded', function() {
    const imageInput = document.getElementById('image');
    const preview = document.getElementById('preview');
    const filenameSpan = document.getElementById('filename');
    const resetBtn = document.getElementById('reset-btn');
    const form = document.getElementById('upload-form');
    const spinner = document.getElementById('loading-spinner');

    if (imageInput) {
        imageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                filenameSpan.textContent = file.name;
                const reader = new FileReader();
                reader.onload = function(event) {
                    preview.src = event.target.result;
                };
                reader.readAsDataURL(file);
            } else {
                filenameSpan.textContent = '';
                preview.src = '';
            }
        });
    }

    if (resetBtn && form) {
        resetBtn.addEventListener('click', function() {
            form.reset();
            preview.src = '';
            filenameSpan.textContent = '';
            if (spinner) spinner.style.display = 'none';
        });
    }

    if (form) {
        form.addEventListener('submit', function() {
            if (spinner) spinner.style.display = 'flex';
        });
    }

    // Mobile Menu Toggle
    
});

async function sendMessage() {
    const input = document.getElementById("userInput");
    const messages = document.getElementById("messages");
    const message = input.value.trim();
    if (!message) return;

    messages.innerHTML += `<div class='user'>${message}</div>`;
    input.value = '';

    const botMessageDiv = document.createElement("div");
    botMessageDiv.classList.add("bot-message");
    botMessageDiv.innerHTML = `<div class="bot-icon">🤖</div><div class="bot-text" id="bot-text"></div>`;
    messages.appendChild(botMessageDiv);

    const botTextDiv = botMessageDiv.querySelector("#bot-text");

    const response = await fetch('/chat/', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ message })
    });

    const data = await response.json();
    const reply = data.response || "Sorry, something went wrong.";
    let i = 0;
    function type() {
        if (i < reply.length) {
        botTextDiv.innerHTML += reply[i];
        i++;
        botTextDiv.scrollIntoView({ behavior: "smooth" });
        setTimeout(type, 10); 
        }
    }
    type(); 
}
