import os
import glob
import re

frontend_dir = r"d:\apna\frontend"

def process_text(text):
    text_content = re.sub(r'<[^>]+>', '', text).strip().lower()
    
    target = None
    if "my booking" in text_content:
        return "my-bookings.html"
    if "dashboard" in text_content:
        if "admin" in text_content:
            return "admin-dashboard.html"
        return "user-dashboard.html"
    if "explore" in text_content or "search" in text_content or "view all" in text_content or "category" in text_content:
        return "events.html"
    if "about" in text_content:
        return "about.html"
    if "contact" in text_content or "help" in text_content or "support" in text_content or "faq" in text_content:
        return "contact.html"
    if "login" in text_content or "sign in" in text_content or "register" in text_content or "sign up" in text_content:
        return "login.html"
    if "profile" in text_content or "account" in text_content:
        return "user-profile.html"
    if "book" in text_content:
        return "book-ticket.html"
    return None

print("Fixing broken links and buttons...")
for filepath in glob.glob(os.path.join(frontend_dir, "*.html")):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Replace <a> tags
    def a_replacer(match):
        prefix = match.group(1)
        href_val = match.group(2)
        suffix = match.group(3)
        text_inside = match.group(4)
        close_tag = match.group(5)
        
        # Only rewrite if href is "#" or empty
        if href_val == "#" or href_val == "":
            target = process_text(text_inside)
            if target:
                return prefix + target + suffix + text_inside + close_tag
        return match.group(0)
        
    content = re.sub(r'(<a\s+[^>]*?href=")([^"]*)("[^>]*>)(.*?)(</a>)', a_replacer, content, flags=re.IGNORECASE | re.DOTALL)
    
    # 2. Fix buttons without type="submit"
    def button_replacer(match):
        button_tag = match.group(1)
        inside = match.group(3)
        close_tag = match.group(4)
        
        # Avoid forms and already handled buttons
        if 'type="submit"' in button_tag.lower() or 'onclick' in button_tag.lower():
            return match.group(0)
            
        target = process_text(inside)
        if target:
            # inject onclick
            return button_tag + f' onclick="window.location.href=\'{target}\'"' + ">" + inside + close_tag
            
        return match.group(0)
        
    content = re.sub(r'(<button\s+[^>]*?)(>)(.*?)(</button>)', button_replacer, content, flags=re.IGNORECASE | re.DOTALL)

    # 3. Fix forms with class "search" or search inputs to redirect to events.html instead of alerting
    content = content.replace('<form class="sm:flex">', '<form action="events.html" class="sm:flex">')

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Links and buttons fixed.")
