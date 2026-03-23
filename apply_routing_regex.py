import os
import glob
import re

frontend_dir = r"d:\apna\frontend"

def process_text(text, current_href, filepath):
    text_content = re.sub(r'<[^>]+>', '', text).strip().lower()
    
    # Check current_href first if it gives a hint
    if 'admin' in current_href.lower() and 'dashboard' in current_href.lower():
        return "admin-dashboard.html"
    
    if "my booking" in text_content or "my tickets" in text_content:
        return "my-bookings.html"
    if "dashboard" in text_content:
        if "admin" in filepath.lower() or "admin" in text_content:
            return "admin-dashboard.html"
        return "user-dashboard.html"
    if "explore" in text_content or "search" in text_content or text_content == "events" or "browse events" in text_content or "view all" in text_content or "category" in text_content:
        return "events.html"
    if "about" in text_content:
        return "about.html"
    if "contact" in text_content or "help" in text_content or "support" in text_content or "faq" in text_content:
        return "contact.html"
    if text_content == "login" or "sign in" in text_content:
        return "login.html"
    if text_content == "register" or "sign up" in text_content:
        return "register.html"
    if "profile" in text_content or "account" in text_content:
        return "user-profile.html"
    if "book" in text_content:
        return "book-ticket.html"
    if "payment" in text_content or "pay now" in text_content:
        return "payment.html"
    if "confirm" in text_content:
        return "booking-confirmation.html"
    if "detail" in text_content and "event" in text_content:
        return "event-details.html"
    if "detail" in text_content and "ticket" in text_content:
        return "ticket-details.html"
    if "home" in text_content or text_content == "apnaticket":
        return "index.html"
    if "forgot" in text_content:
        return "forgot-password.html"
    if "reset" in text_content:
        return "reset-password.html"
    
    # Admin Specific
    if "admin login" in text_content:
        return "admin-login.html"
    if "manage events" in text_content:
        return "admin-events.html"
    if "create event" in text_content:
        return "admin-create-event.html"
    if "manage bookings" in text_content:
        return "admin-bookings.html"
    if "manage users" in text_content:
        return "admin-users.html"
    if text_content == "reports":
        return "admin-reports.html"
        
    return None

import logging
logging.basicConfig(level=logging.INFO)

for filepath in glob.glob(os.path.join(frontend_dir, "*.html")):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Skipping {filepath}: {e}")
        continue

    # 1. Replace <a> tags
    def a_replacer(match):
        prefix = match.group(1)
        href_val = match.group(2)
        suffix = match.group(3)
        text_inside = match.group(4)
        close_tag = match.group(5)
        
        # Rewrite if href is #, empty, / or ends with .html but might be wrong
        if href_val in ["#", "", "/"] or (href_val.endswith('.html') and ('search-events' in href_val or 'dashboard.html' in href_val or 'profile.html' in href_val)):
            target = process_text(text_inside, href_val, filepath)
            if target:
                return prefix + target + suffix + text_inside + close_tag
            
            # Additional fallback for brand logo
            if "confirmation_number" in text_inside.lower() and "apnaticket" in text_inside.lower():
                return prefix + "index.html" + suffix + text_inside + close_tag
                
            # Additional fallback for specific old links
            if href_val == "/register": return prefix + "register.html" + suffix + text_inside + close_tag
            if href_val == "/login": return prefix + "login.html" + suffix + text_inside + close_tag
            if href_val == "/forgot-password": return prefix + "forgot-password.html" + suffix + text_inside + close_tag
            
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
            
        target = process_text(inside, "", filepath)
        if target:
            # inject onclick
            return button_tag + f' onclick="window.location.href=\'{target}\'"' + ">" + inside + close_tag
            
        return match.group(0)
        
    content = re.sub(r'(<button\s+[^>]*?)(>)(.*?)(</button>)', button_replacer, content, flags=re.IGNORECASE | re.DOTALL)

    # 3. Handle specific form actions manually
    content = content.replace('action="#"', 'action=""')
    content = content.replace('action="/"', 'action=""')
    
    # Check form context to modify action if blank
    def form_replacer(match):
        form_tag = match.group(1)
        rest = match.group(2)
        
        # Determine target based on filepath
        target = ""
        fn = os.path.basename(filepath)
        if fn == "login.html": target = "user-dashboard.html"
        elif fn == "register.html": target = "user-dashboard.html"
        elif fn == "payment.html": target = "booking-confirmation.html"
        elif fn == "admin-create-event.html": target = "admin-events.html"
        elif fn == "admin-login.html": target = "admin-dashboard.html"
        elif fn == "forgot-password.html": target = "reset-password.html"
        elif fn == "reset-password.html": target = "login.html"
        elif fn == "index.html" or fn == "events.html": target = "events.html"
        
        if target and 'action=""' in form_tag:
            return form_tag.replace('action=""', f'action="{target}"') + rest
            
        return match.group(0)
        
    content = re.sub(r'(<form\s+[^>]*>)(.*?</form>)', form_replacer, content, flags=re.IGNORECASE | re.DOTALL)
    
    # Also inject app.js before </body>
    if '<script src="js/app.js"></script>' not in content:
        content = content.replace('</body>', '    <script src="js/app.js"></script>\n</body>')
        
    # Extra fix: the sidebar Dashboard link in user dashboard
    content = content.replace('href="dashboard.html"', 'href="user-dashboard.html"')
    content = content.replace('href="profile.html"', 'href="user-profile.html"')
    content = content.replace('href="/register"', 'href="register.html"')
    content = content.replace('href="/login"', 'href="login.html"')
    content = content.replace('href="/forgot-password"', 'href="forgot-password.html"')

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Links and buttons fixed with regex.")
