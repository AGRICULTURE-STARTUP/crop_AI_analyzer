/** * AgriScan SPA & UI Logic
 * Handles dynamic navigation, state persistence, and AI interactions.
 */

const pageCache = new Map();
const CHAT_STORAGE_KEY = 'agriscan_chat_history';
const SCAN_STORAGE_KEY = 'agriscan_last_scan';

document.addEventListener('DOMContentLoaded', function() {
    initSPA();
    initGlobalComponents();
    initPage();
});

/**
 * Single Page Application Navigation Logic
 */
function initSPA() {
    document.addEventListener('click', e => {
        const a = e.target.closest('a');
        if (a && a.href && a.origin === window.location.origin && !a.hasAttribute('data-no-spa')) {
            if (a.href.includes('logout') || a.pathname.startsWith('/media/')) return;
            
            e.preventDefault();
            navigateTo(a.href);
            
            const navbar = document.getElementById('navbar');
            if (navbar && navbar.classList.contains('active')) {
                navbar.classList.remove('active');
                const menuToggle = document.getElementById('menu-toggle');
                if (menuToggle) {
                    menuToggle.querySelector('.open-icon').style.display = 'block';
                    menuToggle.querySelector('.close-icon').style.display = 'none';
                }
            }
        }
    });

    window.addEventListener('popstate', e => {
        const url = (e.state && e.state.url) ? e.state.url : window.location.pathname;
        navigateTo(url, false);
    });
}

/**
 * Initialize components that persist across all pages (Header, Chat Widget)
 */
function initGlobalComponents() {
    const toggle = document.getElementById('chat-toggle');
    const close = document.getElementById('chat-close');
    const wrapper = document.getElementById('chat-box-wrapper');
    const messages = document.getElementById('messages');
    
    if (toggle && wrapper) {
        toggle.addEventListener('click', () => {
            wrapper.classList.toggle('hidden');
            if (!wrapper.classList.contains('hidden')) {
                messages.scrollTop = messages.scrollHeight;
            }
        });
    }
    
    if (close && wrapper) {
        close.addEventListener('click', () => {
            wrapper.classList.add('hidden');
        });
    }
    
    // Load persisted chat history
    const history = localStorage.getItem(CHAT_STORAGE_KEY);
    if (history && messages) {
        messages.innerHTML = history;
        messages.scrollTop = messages.scrollHeight;
    }

    // Persistent Header Effects
    const header = document.querySelector('header');
    if (header) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) header.classList.add('scrolled');
            else header.classList.remove('scrolled');
        });
    }

    // Persistent Mobile Menu
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
        });
    }

    initTopupLogic();
}

/**
 * Handles M-Pesa Wallet Top-up UI and Logic
 */
function initTopupLogic() {
    const overlay = document.getElementById('topup-overlay');
    const closeBtn = document.getElementById('topup-close-btn');
    const submitBtn = document.getElementById('btn-topup-submit');
    const walletBalanceChat = document.getElementById('wallet-balance-chat');
    
    window.openTopupModal = (amount = '', title = 'Top Up Wallet') => {
        if (overlay) {
            overlay.classList.add('active');
            const amountInput = document.getElementById('topup-amount');
            const titleEl = overlay.querySelector('h3');
            if (amountInput) amountInput.value = amount;
            if (titleEl) titleEl.textContent = title;
        }
    };

    if (closeBtn && overlay) {
        closeBtn.addEventListener('click', () => overlay.classList.remove('active'));
    }

    if (walletBalanceChat) {
        walletBalanceChat.style.cursor = 'pointer';
        walletBalanceChat.addEventListener('click', (e) => {
            e.stopPropagation();
            window.openTopupModal();
        });
    }

    if (submitBtn) {
        submitBtn.addEventListener('click', async () => {
            const amount = document.getElementById('topup-amount').value;
            const phone = document.getElementById('topup-phone').value;
            
            if (!amount || !phone) {
                alert("Please enter both amount and phone number.");
                return;
            }

            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Requesting...';

            try {
                const response = await fetch('/mpesa/topup/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCookie('csrftoken')
                    },
                    body: JSON.stringify({ amount, phone_number: phone })
                });
                const data = await response.json();
                
                if (data.status === 'Success') {
                    alert(data.message);
                    if (overlay) overlay.classList.remove('active');
                } else {
                    alert(data.message);
                }
            } catch (err) {
                console.error(err);
                alert("Connection error. Please try again.");
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fa-solid fa-mobile-screen-button"></i> Pay with M-Pesa';
            }
        });
    }
}

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

async function navigateTo(url, pushState = true) {
    const progress = document.getElementById('page-progress');
    const main = document.querySelector('main');
    
    const currentPath = window.location.pathname;
    pageCache.set(currentPath, {
        html: main.innerHTML,
        title: document.title,
        scroll: window.scrollY
    });

    if (pushState) {
        history.pushState({ url }, '', url);
    }

    if (pageCache.has(url)) {
        const cached = pageCache.get(url);
        main.innerHTML = cached.html;
        document.title = cached.title;
        window.scrollTo(0, cached.scroll);
        initPage();
        return;
    }

    if (progress) progress.classList.add('active');
    if (main) main.classList.add('loading');

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        const newMain = doc.querySelector('main');
        const newTitle = doc.title;

        if (newMain) {
            // 1. Update Title
            document.title = newTitle;

            // 2. Update Content
            main.innerHTML = newMain.innerHTML;

            // 3. Handle Scripts (Execution)
            // Remove any previously injected page-specific scripts if they were external
            document.querySelectorAll('script.spa-injected-script').forEach(s => s.remove());

            const scripts = doc.querySelectorAll('script');
            scripts.forEach(oldScript => {
                // Skip core scripts
                if (oldScript.src && (oldScript.src.includes('script.js') || oldScript.src.includes('font-awesome'))) return;
                
                const newScript = document.createElement('script');
                Array.from(oldScript.attributes).forEach(attr => {
                    newScript.setAttribute(attr.name, attr.value);
                });
                newScript.textContent = oldScript.textContent;
                newScript.classList.add('spa-injected-script');
                document.body.appendChild(newScript);
                
                // If it's inline, it executes immediately and we can remove it to keep DOM clean
                if (!oldScript.src) newScript.remove();
            });

            // 4. Handle Styles
            // Remove previous page styles to avoid conflicts
            document.querySelectorAll('.spa-page-style').forEach(s => s.remove());

            const styles = doc.querySelectorAll('style, link[rel="stylesheet"]');
            styles.forEach(style => {
                // Skip core style
                if (style.href && style.href.includes('style.css')) return;
                const newStyle = style.cloneNode(true);
                newStyle.classList.add('spa-page-style');
                document.head.appendChild(newStyle);
            });

            window.scrollTo(0, 0);
            initPage();
        } else {
            window.location.href = url;
        }
    } catch (e) {
        console.error('SPA Navigation Error:', e);
        window.location.href = url;
    } finally {
        if (progress) {
            progress.classList.remove('active');
            progress.classList.add('finish');
            setTimeout(() => progress.classList.remove('finish'), 400);
        }
        if (main) main.classList.remove('loading');
    }
}

function initPage() {
    const imageInput = document.getElementById('image');
    const preview = document.getElementById('preview');
    const filenameSpan = document.getElementById('filename');
    const resetBtn = document.getElementById('reset-btn');
    const form = document.getElementById('upload-form');
    const spinner = document.getElementById('loading-spinner');

    // Restore scan result if on scanner page and not already present
    if (form && !document.querySelector('.prediction')) {
        const lastScan = localStorage.getItem(SCAN_STORAGE_KEY);
        if (lastScan) {
            const subsection = document.querySelector('.subsection');
            if (subsection) {
                const div = document.createElement('div');
                div.innerHTML = lastScan;
                subsection.appendChild(div.firstChild);
            }
        }
    }

    if (imageInput) {
        imageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                filenameSpan.textContent = file.name;
                const reader = new FileReader();
                reader.onload = function(event) { preview.src = event.target.result; };
                reader.readAsDataURL(file);
            }
        });
    }

    if (resetBtn && form) {
        resetBtn.addEventListener('click', function() {
            form.reset();
            if (preview) preview.src = '';
            if (filenameSpan) filenameSpan.textContent = '';
            localStorage.removeItem(SCAN_STORAGE_KEY);
            const pred = document.querySelector('.prediction');
            if (pred) pred.remove();
        });
    }

    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            if (spinner) spinner.style.display = 'flex';
            const formData = new FormData(form);
            const main = document.querySelector('main');
            try {
                const response = await fetch(form.action || window.location.href, {
                    method: 'POST',
                    body: formData,
                    headers: { 'X-Requested-With': 'XMLHttpRequest' }
                });
                const html = await response.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const newMain = doc.querySelector('main');
                if (newMain) {
                    main.innerHTML = newMain.innerHTML;
                    initPage();
                    const prediction = document.querySelector('.prediction');
                    if (prediction) {
                        prediction.scrollIntoView({ behavior: 'smooth' });
                        localStorage.setItem(SCAN_STORAGE_KEY, prediction.outerHTML);
                    }
                }
            } catch (err) {
                form.submit();
            } finally {
                if (spinner) spinner.style.display = 'none';
            }
        });
    }
}

async function sendMessage() {
    const input = document.getElementById("userInput");
    const messages = document.getElementById("messages");
    if (!input || !messages) return;
    
    const message = input.value.trim();
    if (!message) return;

    const userDiv = document.createElement('div');
    userDiv.classList.add('user');
    userDiv.textContent = message;
    messages.appendChild(userDiv);
    input.value = '';
    
    // Persist chat
    localStorage.setItem(CHAT_STORAGE_KEY, messages.innerHTML);

    const botMessageDiv = document.createElement("div");
    botMessageDiv.classList.add("bot-message");
    const botIcon = document.createElement("div");
    botIcon.classList.add("bot-icon");
    botIcon.textContent = "🤖";
    const botTextDiv = document.createElement("div");
    botTextDiv.classList.add("bot-text");
    botTextDiv.id = "bot-text";
    
    botTextDiv.innerHTML = `
        <div class="thinking-indicator">
            <div class="thinking-dots"><div class="thinking-dot"></div><div class="thinking-dot"></div><div class="thinking-dot"></div></div>
            <div class="thinking-bar-container"><div class="thinking-bar"></div></div>
        </div>
    `;
    
    botMessageDiv.appendChild(botIcon);
    botMessageDiv.appendChild(botTextDiv);
    messages.appendChild(botMessageDiv);
    messages.scrollTop = messages.scrollHeight;

    try {
        const response = await fetch('/chat/', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ message })
        });
        const data = await response.json();
        
        if (data.needs_topup) {
            botTextDiv.innerHTML = `<p>${data.response}</p><button class="btn btn-topup-trigger" onclick="window.openTopupModal()">Top Up KSh 50</button>`;
            return;
        }

        const reply = data.response || "Sorry, something went wrong.";
        botTextDiv.innerHTML = '';
        
        // Simple markdown to HTML formatter
        function formatMarkdown(text) {
            let html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
            html = html.replace(/\n/g, '<br>');
            return html;
        }
        
        let formattedReply = "";
        try {
            // Try to parse as JSON first
            const parsed = JSON.parse(reply);
            
            // Build nice HTML structure from JSON
            let htmlParts = [];
            
            if (parsed.overview) {
                htmlParts.push(`<h4>Overview</h4><p>${formatMarkdown(parsed.overview)}</p>`);
            }
            if (parsed.recommendations && parsed.recommendations.length > 0) {
                htmlParts.push(`<h4>Recommendations</h4><ul>${parsed.recommendations.map(r => `<li>${formatMarkdown(r)}</li>`).join('')}</ul>`);
            }
            if (parsed.explanation && parsed.explanation.length > 0) {
                htmlParts.push(`<h4>Explanation</h4><ul>${parsed.explanation.map(e => `<li>${formatMarkdown(e)}</li>`).join('')}</ul>`);
            }
            if (parsed.practical_tips && parsed.practical_tips.length > 0) {
                htmlParts.push(`<h4>Practical Tips</h4><ul>${parsed.practical_tips.map(t => `<li>${formatMarkdown(t)}</li>`).join('')}</ul>`);
            }
            
            formattedReply = htmlParts.join('');
        } catch (e) {
            // Fallback if not JSON
            formattedReply = formatMarkdown(reply);
        }

        let i = 0;
        function type() {
            if (i < formattedReply.length) {
                if (formattedReply[i] === '<') {
                    let tagEnd = formattedReply.indexOf('>', i);
                    if (tagEnd !== -1) {
                        i = tagEnd + 1;
                    } else {
                        i++;
                    }
                } else {
                    i++;
                }
                botTextDiv.innerHTML = formattedReply.substring(0, i);
                const isAtBottom = messages.scrollHeight - messages.scrollTop <= messages.clientHeight + 100;
                if (isAtBottom) messages.scrollTop = messages.scrollHeight;
                setTimeout(type, 10); 
            } else {
                // Persist chat after typing finishes
                localStorage.setItem(CHAT_STORAGE_KEY, messages.innerHTML);
            }
        }
        type();
    } catch (err) {
        botTextDiv.innerHTML = "Error: Could not connect to AI service.";
    }
}
