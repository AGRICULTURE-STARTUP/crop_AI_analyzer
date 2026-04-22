document.addEventListener('DOMContentLoaded', function() {
    // Theme Logic Removed (Unified System)

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
    const menuToggle = document.getElementById('menu-toggle');
    const navbar = document.getElementById('navbar');
    
    if (menuToggle && navbar) {
        menuToggle.addEventListener('click', function() {
            navbar.classList.toggle('active');
            
            const openIcon = menuToggle.querySelector('.open-icon');
            const closeIcon = menuToggle.querySelector('.close-icon');
            
            if (navbar.classList.contains('active')) {
                openIcon.style.display = 'none';
                closeIcon.style.display = 'block';
            } else {
                openIcon.style.display = 'block';
                closeIcon.style.display = 'none';
            }
    }

    // Header Scroll Effect
    const header = document.querySelector('header');
    if (header) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        });
    }
});

async function sendMessage() {
    const input = document.getElementById("userInput");
    const messages = document.getElementById("messages");
    const message = input.value.trim();
    if (!message) return;

    // Create user message element safely
    const userDiv = document.createElement('div');
    userDiv.classList.add('user');
    userDiv.textContent = message;
    messages.appendChild(userDiv);
    
    input.value = '';

    const botMessageDiv = document.createElement("div");
    botMessageDiv.classList.add("bot-message");
    
    const botIcon = document.createElement("div");
    botIcon.classList.add("bot-icon");
    botIcon.textContent = "🤖";
    
    const botTextDiv = document.createElement("div");
    botTextDiv.classList.add("bot-text");
    botTextDiv.id = "bot-text";
    
    botMessageDiv.appendChild(botIcon);
    botMessageDiv.appendChild(botTextDiv);
    messages.appendChild(botMessageDiv);

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
            // Append character safely using textContent
            botTextDiv.textContent += reply[i];
            i++;
            
            const isAtBottom = messages.scrollHeight - messages.scrollTop <= messages.clientHeight + 100;
            if (isAtBottom) {
                messages.scrollTop = messages.scrollHeight;
            }
            
            setTimeout(type, 10); 
        }
    }
    type(); 
}
